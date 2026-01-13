import { readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { getDb } from "../../db";
import { promptTemplates } from "../../../drizzle/schema";

export type PromptRegistryEntry = {
  key: string;
  version: number;
  agent: string;
  operation: string;
  publicTitle: string;
  publicDescription: string;
  systemPrompt: string;
  userTemplate?: string;
};

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function toContent(entry: PromptRegistryEntry): string {
  return [
    `KEY:${entry.key}`,
    `VERSION:${entry.version}`,
    "",
    "SYSTEM:",
    entry.systemPrompt,
    "",
    "USER_TEMPLATE:",
    entry.userTemplate ?? "",
  ].join("\n");
}

let _cache: PromptRegistryEntry[] | null = null;

export async function loadPromptRegistry(): Promise<PromptRegistryEntry[]> {
  // Resolve relative to project root; dev server runs with cwd at repo root.
  const filePath = path.resolve(process.cwd(), "server/prompts/registry.json");
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as PromptRegistryEntry[];
  return parsed;
}

export async function getPromptRegistryEntry(key: string): Promise<PromptRegistryEntry> {
  if (!_cache) {
    _cache = await loadPromptRegistry();
  }
  const matches = _cache.filter((e) => e.key === key);
  if (matches.length === 0) {
    throw new Error(`[Prompts] Missing registry entry for key: ${key}`);
  }
  // If multiple versions exist, pick the latest.
  return matches.reduce((latest, cur) => (cur.version > latest.version ? cur : latest), matches[0]!);
}

export function getPromptTemplateSha256(entry: PromptRegistryEntry): string {
  return sha256Hex(toContent(entry));
}

export function getPromptTemplateContent(entry: PromptRegistryEntry): string {
  return toContent(entry);
}

export async function syncPromptRegistryToDb(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Prompts] Cannot sync prompt registry: database not available");
    return;
  }

  const entries = await loadPromptRegistry();

  for (const entry of entries) {
    const content = toContent(entry);
    const sha256 = sha256Hex(content);

    await db
      .insert(promptTemplates)
      .values({
        key: entry.key,
        version: entry.version,
        agent: entry.agent,
        operation: entry.operation,
        publicTitle: entry.publicTitle,
        publicDescription: entry.publicDescription,
        content,
        sha256,
        source: "git",
      })
      .onConflictDoUpdate({
        target: [promptTemplates.key, promptTemplates.version],
        set: {
          agent: entry.agent,
          operation: entry.operation,
          publicTitle: entry.publicTitle,
          publicDescription: entry.publicDescription,
          content,
          sha256,
          source: "git",
        },
      });
  }
}

