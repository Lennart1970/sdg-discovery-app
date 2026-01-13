import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  InsertUser, 
  users,
  InsertOrganization,
  InsertSourceFeed,
  InsertChallenge,
  InsertChallengeExtractionRun,
  InsertTechDiscoveryRun,
  InsertTechPath,
  promptTemplates,
  challengeExtractionRuns,
  techDiscoveryRuns,
  sources,
  sourceEndpoints,
  documents,
  type InsertSource,
  type InsertSourceEndpoint,
  type InsertDocument,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: postgres.Sql | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Create postgres client
      _client = postgres(process.env.DATABASE_URL);
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _client = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // Changed from onDuplicateKeyUpdate to onConflictDoUpdate (PostgreSQL syntax)
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Organizations
export async function listOrganizations() {
  const db = await getDb();
  if (!db) return [];
  const { organizations } = await import("../drizzle/schema");
  return db.select().from(organizations);
}

export async function insertOrganization(org: InsertOrganization) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { organizations } = await import("../drizzle/schema");
  await db.insert(organizations).values(org);
}

// Source Feeds
export async function listSourceFeeds() {
  const db = await getDb();
  if (!db) return [];
  const { sourceFeeds } = await import("../drizzle/schema");
  return db.select().from(sourceFeeds);
}

export async function insertSourceFeed(feed: InsertSourceFeed) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { sourceFeeds } = await import("../drizzle/schema");
  await db.insert(sourceFeeds).values(feed);
}

// Challenges
export async function listChallenges(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const { challenges } = await import("../drizzle/schema");
  if (userId) {
    return db.select().from(challenges).where(eq(challenges.userId, userId));
  }
  return db.select().from(challenges);
}

export async function getChallengeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { challenges } = await import("../drizzle/schema");
  const result = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1);
  return result[0];
}

export async function insertChallenge(challenge: InsertChallenge) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { challenges } = await import("../drizzle/schema");
  const result = await db.insert(challenges).values(challenge).returning();
  return result;
}

// Challenge Extraction Runs
export async function insertChallengeExtractionRun(run: InsertChallengeExtractionRun): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .insert(challengeExtractionRuns)
    .values(run)
    .returning({ id: challengeExtractionRuns.id });
  const insertId = result[0]?.id;
  if (!insertId) throw new Error("Failed to get id from challenge_extraction_runs insert");
  return Number(insertId);
}

// Tech Discovery Runs
export async function insertTechDiscoveryRun(run: InsertTechDiscoveryRun): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // PostgreSQL uses .returning() instead of insertId
  const result = await db.insert(techDiscoveryRuns).values(run).returning({ id: techDiscoveryRuns.id });
  const insertId = result[0]?.id;
  if (!insertId) {
    console.error("Insert result:", JSON.stringify(result));
    throw new Error("Failed to get id from tech_discovery_runs insert");
  }
  return Number(insertId);
}

export async function updateTechDiscoveryRunStatus(
  runId: number,
  status: "completed" | "failed" | "in_progress",
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(techDiscoveryRuns)
    .set({ status, errorMessage })
    .where(eq(techDiscoveryRuns.id, runId));
}

export async function updateTechDiscoveryRunResult(
  runId: number,
  fields: Partial<
    Pick<
      InsertTechDiscoveryRun,
      "promptKey" | "promptVersion" | "promptSha256" | "rawPrompt" | "fullResponse" | "status" | "errorMessage"
    >
  >
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(techDiscoveryRuns).set(fields).where(eq(techDiscoveryRuns.id, runId));
}

export async function getTechDiscoveryRunsByChallengeId(challengeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(techDiscoveryRuns).where(eq(techDiscoveryRuns.challengeId, challengeId));
}

// Tech Paths
export async function insertTechPath(path: InsertTechPath) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { techPaths } = await import("../drizzle/schema");
  await db.insert(techPaths).values(path);
}

export async function getTechPathsByChallengeId(challengeId: number) {
  const db = await getDb();
  if (!db) return [];
  const { techPaths } = await import("../drizzle/schema");
  return db.select().from(techPaths).where(eq(techPaths.challengeId, challengeId));
}

export async function getTechPathsByRunId(runId: number) {
  const db = await getDb();
  if (!db) return [];
  const { techPaths } = await import("../drizzle/schema");
  return db.select().from(techPaths).where(eq(techPaths.runId, runId));
}

// Prompts
export async function listPromptTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(promptTemplates);
}

export async function getPromptTemplateByKeyVersion(key: string, version: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.key, key))
    .limit(50);
  return result.find((r) => r.version === version);
}

export async function listPromptUsage(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  const techRuns = await db
    .select({
      id: techDiscoveryRuns.id,
      createdAt: techDiscoveryRuns.createdAt,
      userId: techDiscoveryRuns.userId,
      modelUsed: techDiscoveryRuns.modelUsed,
      status: techDiscoveryRuns.status,
      promptKey: techDiscoveryRuns.promptKey,
      promptVersion: techDiscoveryRuns.promptVersion,
      promptSha256: techDiscoveryRuns.promptSha256,
    })
    .from(techDiscoveryRuns)
    .limit(limit);

  const extractionRuns = await db
    .select({
      id: challengeExtractionRuns.id,
      createdAt: challengeExtractionRuns.createdAt,
      userId: challengeExtractionRuns.userId,
      modelUsed: challengeExtractionRuns.modelUsed,
      status: challengeExtractionRuns.status,
      promptKey: challengeExtractionRuns.promptKey,
      promptVersion: challengeExtractionRuns.promptVersion,
      promptSha256: challengeExtractionRuns.promptSha256,
    })
    .from(challengeExtractionRuns)
    .limit(limit);

  // Normalize runType for frontend display without leaking details
  const normalized = [
    ...techRuns.map((r) => ({ ...r, runType: "technology_discovery" as const })),
    ...extractionRuns.map((r) => ({ ...r, runType: "challenge_extractor" as const })),
  ];

  normalized.sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
  return normalized.slice(0, limit);
}

// Sources
export async function listSources() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sources).orderBy(desc(sources.updatedAt));
}

export async function upsertSource(input: InsertSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(sources)
    .values(input)
    .onConflictDoUpdate({
      target: sources.baseUrl,
      set: { ...input, updatedAt: new Date() } as any,
    });
}

export async function listSourceEndpoints(sourceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sourceEndpoints)
    .where(eq(sourceEndpoints.sourceId, sourceId))
    .orderBy(desc(sourceEndpoints.priority), desc(sourceEndpoints.updatedAt));
}

export async function upsertSourceEndpoint(input: InsertSourceEndpoint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(sourceEndpoints)
    .values(input)
    .onConflictDoUpdate({
      target: sourceEndpoints.endpointUrl,
      set: { ...input, updatedAt: new Date() } as any,
    });
}

// Documents
export async function listDocuments(params?: { sourceId?: number; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = params?.limit ?? 200;
  const clauses = [];
  if (params?.sourceId) clauses.push(eq(documents.sourceId, params.sourceId));
  if (params?.status) clauses.push(eq(documents.status, params.status as any));

  const q = db.select().from(documents).orderBy(desc(documents.updatedAt)).limit(limit);
  if (clauses.length === 0) return q;
  if (clauses.length === 1) return q.where(clauses[0]!);
  return q.where(and(...(clauses as any)));
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return rows[0];
}

export async function upsertDocumentByUrl(input: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(documents)
    .values(input)
    .onConflictDoUpdate({
      target: documents.url,
      set: { ...input, updatedAt: new Date() } as any,
    });
}

export async function updateDocument(id: number, fields: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(documents).set({ ...fields, updatedAt: new Date() } as any).where(eq(documents.id, id));
}
