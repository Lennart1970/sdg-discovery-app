import { readFile } from "node:fs/promises";
import path from "node:path";

import { getDb } from "../../db";
import { sources, sourceEndpoints } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

type SeedEndpoint = {
  endpointUrl: string;
  endpointType: "rss" | "sitemap" | "html_list" | "api" | "manual_seed";
  priority?: number;
  parserHint?: string;
};

type SeedSource = {
  name: string;
  orgType:
    | "un"
    | "eu"
    | "gov"
    | "ministry"
    | "foundation"
    | "corporate"
    | "ngo"
    | "bank"
    | "academic";
  trustLevel?: "high" | "medium" | "low";
  baseUrl: string;
  regionFocus?: string[];
  tags?: string[];
  crawlEnabled?: boolean;
  rateLimitMs?: number;
  notes?: string;
  endpoints?: SeedEndpoint[];
};

async function loadSeed(): Promise<SeedSource[]> {
  const filePath = path.resolve(process.cwd(), "server/sources/seed.eu.json");
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as SeedSource[];
}

export async function syncSourceSeedToDb(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[SourcesSeed] Cannot sync seed: database not available");
    return;
  }

  const seed = await loadSeed();
  for (const s of seed) {
    const existing = await db
      .select()
      .from(sources)
      .where(eq(sources.baseUrl, s.baseUrl))
      .limit(1);

    const values = {
      name: s.name,
      orgType: s.orgType,
      trustLevel: s.trustLevel ?? "medium",
      baseUrl: s.baseUrl,
      regionFocus: s.regionFocus ? JSON.stringify(s.regionFocus) : null,
      tags: s.tags ? JSON.stringify(s.tags) : null,
      crawlEnabled: s.crawlEnabled ?? false,
      rateLimitMs: s.rateLimitMs ?? 1500,
      notes: s.notes ?? null,
      updatedAt: new Date(),
    } as const;

    let sourceId: number;
    if (existing[0]) {
      sourceId = Number(existing[0].id);
      await db.update(sources).set(values).where(eq(sources.id, sourceId));
    } else {
      const inserted = await db
        .insert(sources)
        .values({ ...values, createdAt: new Date() } as any)
        .returning({ id: sources.id });
      sourceId = Number(inserted[0]!.id);
    }

    for (const ep of s.endpoints ?? []) {
      const existingEp = await db
        .select()
        .from(sourceEndpoints)
        .where(eq(sourceEndpoints.endpointUrl, ep.endpointUrl))
        .limit(1);

      const epValues = {
        sourceId,
        endpointUrl: ep.endpointUrl,
        endpointType: ep.endpointType,
        parserHint: ep.parserHint ?? null,
        priority: ep.priority ?? 100,
        enabled: true,
        updatedAt: new Date(),
      } as const;

      if (existingEp[0]) {
        await db.update(sourceEndpoints).set(epValues).where(eq(sourceEndpoints.id, existingEp[0].id));
      } else {
        await db.insert(sourceEndpoints).values({ ...epValues, createdAt: new Date() } as any);
      }
    }
  }

  console.log(`[SourcesSeed] Synced ${seed.length} sources from seed.eu.json`);
}

