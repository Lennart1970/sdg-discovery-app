CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('completed', 'failed', 'in_progress');--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" varchar(500) NOT NULL,
	"statement" text NOT NULL,
	"sdg_goals" text,
	"geography" varchar(255),
	"target_groups" text,
	"sectors" text,
	"source_url" varchar(1000),
	"source_org" varchar(255),
	"confidence" integer,
	"extracted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_name" varchar(255) NOT NULL,
	"org_type" varchar(100) NOT NULL,
	"org_country" varchar(100),
	"org_website" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_feeds" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_name" varchar(255) NOT NULL,
	"feed_name" varchar(255) NOT NULL,
	"feed_type" varchar(50) NOT NULL,
	"base_url" varchar(1000) NOT NULL,
	"crawl_policy" text,
	"last_crawled" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tech_discovery_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenge_id" integer NOT NULL,
	"user_id" integer,
	"model_used" varchar(100) NOT NULL,
	"budget_constraint_eur" integer DEFAULT 10000 NOT NULL,
	"challenge_summary" text,
	"core_functions" text,
	"underlying_principles" text,
	"confidence" integer,
	"full_response" text,
	"raw_prompt" text,
	"status" "status" DEFAULT 'in_progress' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tech_paths" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"challenge_id" integer NOT NULL,
	"path_name" varchar(500) NOT NULL,
	"path_order" integer NOT NULL,
	"principles_used" text,
	"technology_classes" text,
	"why_plausible" text,
	"estimated_cost_band_eur" varchar(100),
	"risks_and_unknowns" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tech_discovery_runs" ADD CONSTRAINT "tech_discovery_runs_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tech_discovery_runs" ADD CONSTRAINT "tech_discovery_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tech_paths" ADD CONSTRAINT "tech_paths_run_id_tech_discovery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."tech_discovery_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tech_paths" ADD CONSTRAINT "tech_paths_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;