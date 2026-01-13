import { serial, pgEnum, pgTable, text, timestamp, varchar, integer, uniqueIndex } from "drizzle-orm/pg-core";

// Create enum types for PostgreSQL
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["completed", "failed", "in_progress"]);

/**
 * Prompt templates table - versioned prompt registry (synced from repo)
 */
export const promptTemplates = pgTable(
  "prompt_templates",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 200 }).notNull(),
    version: integer("version").notNull(),
    agent: varchar("agent", { length: 100 }).notNull(),
    operation: varchar("operation", { length: 100 }).notNull(),
    publicTitle: varchar("public_title", { length: 255 }).notNull(),
    publicDescription: text("public_description").notNull(),
    content: text("content").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    source: varchar("source", { length: 50 }).notNull().default("git"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    keyVersionIdx: uniqueIndex("prompt_templates_key_version_idx").on(t.key, t.version),
    shaIdx: uniqueIndex("prompt_templates_sha256_idx").on(t.sha256),
  })
);

export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplates.$inferInsert;

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Organizations table - stores SDG-related organizations
 */
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  orgName: varchar("org_name", { length: 255 }).notNull(),
  orgType: varchar("org_type", { length: 100 }).notNull(),
  orgCountry: varchar("org_country", { length: 100 }),
  orgWebsite: varchar("org_website", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Source feeds table - stores URLs to crawl for challenges
 */
export const sourceFeeds = pgTable("source_feeds", {
  id: serial("id").primaryKey(),
  orgName: varchar("org_name", { length: 255 }).notNull(),
  feedName: varchar("feed_name", { length: 255 }).notNull(),
  feedType: varchar("feed_type", { length: 50 }).notNull(),
  baseUrl: varchar("base_url", { length: 1000 }).notNull(),
  crawlPolicy: text("crawl_policy"),
  lastCrawled: timestamp("last_crawled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SourceFeed = typeof sourceFeeds.$inferSelect;
export type InsertSourceFeed = typeof sourceFeeds.$inferInsert;

/**
 * Challenges table - stores extracted SDG challenges
 */
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: varchar("title", { length: 500 }).notNull(),
  statement: text("statement").notNull(),
  sdgGoals: text("sdg_goals"),
  geography: varchar("geography", { length: 255 }),
  targetGroups: text("target_groups"),
  sectors: text("sectors"),
  sourceUrl: varchar("source_url", { length: 1000 }),
  sourceOrg: varchar("source_org", { length: 255 }),
  confidence: integer("confidence"),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = typeof challenges.$inferInsert;

/**
 * Challenge extraction runs table - stores metadata for each extraction run
 */
export const challengeExtractionRuns = pgTable("challenge_extraction_runs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  modelUsed: varchar("model_used", { length: 100 }).notNull(),
  sourceOrg: varchar("source_org", { length: 255 }),
  sourceUrl: varchar("source_url", { length: 1000 }),
  promptKey: varchar("prompt_key", { length: 200 }),
  promptVersion: integer("prompt_version"),
  promptSha256: varchar("prompt_sha256", { length: 64 }),
  rawPrompt: text("raw_prompt"),
  rawResponse: text("raw_response"),
  status: statusEnum("status").default("in_progress").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChallengeExtractionRun = typeof challengeExtractionRuns.$inferSelect;
export type InsertChallengeExtractionRun = typeof challengeExtractionRuns.$inferInsert;

/**
 * Technology discovery runs table - stores metadata for each discovery run
 */
export const techDiscoveryRuns = pgTable("tech_discovery_runs", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id),
  userId: integer("user_id").references(() => users.id),
  modelUsed: varchar("model_used", { length: 100 }).notNull(),
  budgetConstraintEur: integer("budget_constraint_eur").notNull().default(10000),
  promptKey: varchar("prompt_key", { length: 200 }),
  promptVersion: integer("prompt_version"),
  promptSha256: varchar("prompt_sha256", { length: 64 }),
  challengeSummary: text("challenge_summary"),
  coreFunctions: text("core_functions"),
  underlyingPrinciples: text("underlying_principles"),
  confidence: integer("confidence"),
  fullResponse: text("full_response"),
  rawPrompt: text("raw_prompt"),
  status: statusEnum("status").default("in_progress").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TechDiscoveryRun = typeof techDiscoveryRuns.$inferSelect;
export type InsertTechDiscoveryRun = typeof techDiscoveryRuns.$inferInsert;

/**
 * Technology paths table - stores individual technology paths
 */
export const techPaths = pgTable("tech_paths", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull().references(() => techDiscoveryRuns.id),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id),
  pathName: varchar("path_name", { length: 500 }).notNull(),
  pathOrder: integer("path_order").notNull(),
  principlesUsed: text("principles_used"),
  technologyClasses: text("technology_classes"),
  whyPlausible: text("why_plausible"),
  estimatedCostBandEur: varchar("estimated_cost_band_eur", { length: 100 }),
  risksAndUnknowns: text("risks_and_unknowns"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TechPath = typeof techPaths.$inferSelect;
export type InsertTechPath = typeof techPaths.$inferInsert;
