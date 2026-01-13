import crypto from "node:crypto";

import * as db from "../../db";
import { documents, sourceEndpoints, sources } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

function sha256Hex(buf: Uint8Array): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function extractLocsFromXml(xml: string): string[] {
  // Minimal sitemap/rss XML parsing via regex (fast + no extra deps).
  // We intentionally keep this conservative: only extract <loc> and <link> contents.
  const seen: Record<string, true> = {};
  const out: string[] = [];

  const push = (u: string | undefined) => {
    if (!u) return;
    if (!u.startsWith("http")) return;
    if (seen[u]) return;
    seen[u] = true;
    out.push(u);
  };

  const reLoc = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = reLoc.exec(xml))) push(m[1]);

  const reLink = /<link>\s*([^<\s]+)\s*<\/link>/gi;
  while ((m = reLink.exec(xml))) push(m[1]);

  // RSS often uses <link> inside <item>, Atom uses <link href="..."/>
  const reHref = /<link[^>]+href=["']([^"']+)["'][^>]*\/?>/gi;
  while ((m = reHref.exec(xml))) push(m[1]);

  return out;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    // keep query for now (some sites use it); could normalize later.
    return u.toString();
  } catch {
    return url;
  }
}

type ParserHint = {
  includePathPrefixes?: string[];
  excludePathPrefixes?: string[];
};

function parseParserHint(parserHint: string | null | undefined): ParserHint {
  if (!parserHint) return {};
  try {
    return JSON.parse(parserHint) as ParserHint;
  } catch {
    return {};
  }
}

function passesPathFilters(url: string, hint: ParserHint): boolean {
  try {
    const u = new URL(url);
    const p = u.pathname;
    const inc = hint.includePathPrefixes ?? [];
    const exc = hint.excludePathPrefixes ?? [];

    if (inc.length > 0 && !inc.some((pre) => p.startsWith(pre))) return false;
    if (exc.length > 0 && exc.some((pre) => p.startsWith(pre))) return false;
    return true;
  } catch {
    return false;
  }
}

export async function discoverDocumentsFromEndpoint(endpointId: number): Promise<{
  discovered: number;
  kept: number;
  skipped: number;
}> {
  const dbi = await db.getDb();
  if (!dbi) throw new Error("Database not available");

  const endpoints = await dbi.select().from(sourceEndpoints).where(eq(sourceEndpoints.id, endpointId)).limit(1);
  const endpoint = endpoints[0];
  if (!endpoint) throw new Error("Endpoint not found");

  const sourceRows = await dbi.select().from(sources).where(eq(sources.id, endpoint.sourceId)).limit(1);
  const source = sourceRows[0];
  if (!source) throw new Error("Source not found");

  const resp = await fetch(endpoint.endpointUrl, {
    headers: { "user-agent": "sdg-discovery-app/1.0 (+source-discovery)" },
  });
  if (!resp.ok) throw new Error(`Failed to fetch endpoint: ${resp.status} ${resp.statusText}`);
  const xml = await resp.text();

  const all = extractLocsFromXml(xml).map(normalizeUrl);
  const hint = parseParserHint(endpoint.parserHint);
  const filtered = all.filter((u) => passesPathFilters(u, hint));

  let kept = 0;
  let skipped = 0;

  for (const url of filtered) {
    try {
      await db.upsertDocumentByUrl({
        sourceId: source.id,
        sourceEndpointId: endpoint.id,
        url,
        canonicalUrl: url,
        status: "discovered",
        updatedAt: new Date(),
        createdAt: new Date(),
      } as any);
      kept++;
    } catch {
      // likely unique conflict race; treat as skip
      skipped++;
    }
  }

  return { discovered: all.length, kept, skipped };
}

export async function downloadAndExtractDocument(documentId: number): Promise<{
  contentType?: string;
  byteSize?: number;
  sha256Bytes?: string;
  extractedChars?: number;
}> {
  const doc = await db.getDocumentById(documentId);
  if (!doc) throw new Error("Document not found");

  const resp = await fetch(doc.url, {
    headers: { "user-agent": "sdg-discovery-app/1.0 (+document-downloader)" },
  });
  if (!resp.ok) {
    await db.updateDocument(documentId, {
      status: "failed" as any,
      errorMessage: `Download failed: ${resp.status} ${resp.statusText}`,
    } as any);
    throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
  }

  const contentType = resp.headers.get("content-type") ?? undefined;
  const buf = new Uint8Array(await resp.arrayBuffer());
  const shaBytes = sha256Hex(buf);

  let extractedText = "";
  if (contentType?.includes("pdf") || doc.url.toLowerCase().endsWith(".pdf")) {
    // PDF extraction (requires pdf-parse). If not installed, we still persist the download metadata.
    try {
      const mod = (await import("pdf-parse")) as any;
      const pdfParse = mod?.default ?? mod;
      const parsed = await pdfParse(Buffer.from(buf));
      extractedText = String(parsed?.text ?? "").replace(/\s+/g, " ").trim();
    } catch {
      extractedText = "";
    }
  } else {
    // HTML/text: simple tag strip as baseline (upgrade later to Readability).
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    extractedText = text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  await db.updateDocument(documentId, {
    contentType: contentType ?? null,
    byteSize: buf.byteLength,
    sha256Bytes: shaBytes,
    fetchedAt: new Date(),
    status: extractedText ? ("extracted" as any) : ("downloaded" as any),
    extractedText: extractedText ? extractedText : (doc.extractedText ?? null),
    extractedAt: extractedText ? new Date() : (doc.extractedAt ?? null),
    errorMessage: null,
  } as any);

  return {
    contentType,
    byteSize: buf.byteLength,
    sha256Bytes: shaBytes,
    extractedChars: extractedText?.length ?? 0,
  };
}

