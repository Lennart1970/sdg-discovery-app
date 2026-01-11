import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Organizations table - stores SDG-related organizations
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
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
export const sourceFeeds = mysqlTable("source_feeds", {
  id: int("id").autoincrement().primaryKey(),
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
export const challenges = mysqlTable("challenges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id),
  title: varchar("title", { length: 500 }).notNull(),
  statement: text("statement").notNull(),
  sdgGoals: text("sdg_goals"),
  geography: varchar("geography", { length: 255 }),
  targetGroups: text("target_groups"),
  sectors: text("sectors"),
  sourceUrl: varchar("source_url", { length: 1000 }),
  sourceOrg: varchar("source_org", { length: 255 }),
  confidence: int("confidence"),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = typeof challenges.$inferInsert;

/**
 * Technology discovery runs table - stores metadata for each discovery run
 */
export const techDiscoveryRuns = mysqlTable("tech_discovery_runs", {
  id: int("id").autoincrement().primaryKey(),
  challengeId: int("challenge_id").notNull().references(() => challenges.id),
  userId: int("user_id").references(() => users.id),
  modelUsed: varchar("model_used", { length: 100 }).notNull(),
  budgetConstraintEur: int("budget_constraint_eur").notNull().default(10000),
  challengeSummary: text("challenge_summary"),
  coreFunctions: text("core_functions"),
  underlyingPrinciples: text("underlying_principles"),
  confidence: int("confidence"),
  fullResponse: text("full_response"),
  rawPrompt: text("raw_prompt"),
  status: mysqlEnum("status", ["completed", "failed", "in_progress"]).default("in_progress").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TechDiscoveryRun = typeof techDiscoveryRuns.$inferSelect;
export type InsertTechDiscoveryRun = typeof techDiscoveryRuns.$inferInsert;

/**
 * Technology paths table - stores individual technology paths
 */
export const techPaths = mysqlTable("tech_paths", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("run_id").notNull().references(() => techDiscoveryRuns.id),
  challengeId: int("challenge_id").notNull().references(() => challenges.id),
  pathName: varchar("path_name", { length: 500 }).notNull(),
  pathOrder: int("path_order").notNull(),
  principlesUsed: text("principles_used"),
  technologyClasses: text("technology_classes"),
  whyPlausible: text("why_plausible"),
  estimatedCostBandEur: varchar("estimated_cost_band_eur", { length: 100 }),
  risksAndUnknowns: text("risks_and_unknowns"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TechPath = typeof techPaths.$inferSelect;
export type InsertTechPath = typeof techPaths.$inferInsert;