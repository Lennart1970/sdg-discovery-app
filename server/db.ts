import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  InsertUser, 
  users,
  InsertOrganization,
  InsertSourceFeed,
  InsertChallenge,
  InsertTechDiscoveryRun,
  InsertTechPath
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

// Tech Discovery Runs
export async function insertTechDiscoveryRun(run: InsertTechDiscoveryRun): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { techDiscoveryRuns } = await import("../drizzle/schema");
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
  const { techDiscoveryRuns } = await import("../drizzle/schema");
  await db
    .update(techDiscoveryRuns)
    .set({ status, errorMessage })
    .where(eq(techDiscoveryRuns.id, runId));
}

export async function getTechDiscoveryRunsByChallengeId(challengeId: number) {
  const db = await getDb();
  if (!db) return [];
  const { techDiscoveryRuns } = await import("../drizzle/schema");
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
