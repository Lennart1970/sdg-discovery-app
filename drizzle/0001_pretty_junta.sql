CREATE TABLE "challenge_extraction_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"model_used" varchar(100) NOT NULL,
	"source_org" varchar(255),
	"source_url" varchar(1000),
	"prompt_key" varchar(200),
	"prompt_version" integer,
	"prompt_sha256" varchar(64),
	"raw_prompt" text,
	"raw_response" text,
	"status" "status" DEFAULT 'in_progress' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(200) NOT NULL,
	"version" integer NOT NULL,
	"agent" varchar(100) NOT NULL,
	"operation" varchar(100) NOT NULL,
	"public_title" varchar(255) NOT NULL,
	"public_description" text NOT NULL,
	"content" text NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"source" varchar(50) DEFAULT 'git' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tech_discovery_runs" ADD COLUMN "prompt_key" varchar(200);--> statement-breakpoint
ALTER TABLE "tech_discovery_runs" ADD COLUMN "prompt_version" integer;--> statement-breakpoint
ALTER TABLE "tech_discovery_runs" ADD COLUMN "prompt_sha256" varchar(64);--> statement-breakpoint
ALTER TABLE "challenge_extraction_runs" ADD CONSTRAINT "challenge_extraction_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_templates_key_version_idx" ON "prompt_templates" USING btree ("key","version");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_templates_sha256_idx" ON "prompt_templates" USING btree ("sha256");