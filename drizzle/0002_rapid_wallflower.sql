CREATE TYPE "public"."doc_status" AS ENUM('discovered', 'downloaded', 'extracted', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."endpoint_type" AS ENUM('rss', 'sitemap', 'html_list', 'api', 'manual_seed');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('un', 'eu', 'gov', 'ministry', 'foundation', 'corporate', 'ngo', 'bank', 'academic');--> statement-breakpoint
CREATE TYPE "public"."trust_level" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"source_endpoint_id" integer,
	"url" varchar(2000) NOT NULL,
	"canonical_url" varchar(2000),
	"title" varchar(800),
	"published_at" timestamp,
	"content_type" varchar(200),
	"byte_size" integer,
	"sha256_bytes" varchar(64),
	"sha256_text" varchar(64),
	"storage_path_raw" varchar(1000),
	"storage_path_text" varchar(1000),
	"extracted_text" text,
	"status" "doc_status" DEFAULT 'discovered' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"fetched_at" timestamp,
	"extracted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "source_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"endpoint_url" varchar(1500) NOT NULL,
	"endpoint_type" "endpoint_type" NOT NULL,
	"parser_hint" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"org_type" "org_type" NOT NULL,
	"trust_level" "trust_level" DEFAULT 'medium' NOT NULL,
	"base_url" varchar(1000) NOT NULL,
	"region_focus" text,
	"tags" text,
	"crawl_enabled" boolean DEFAULT false NOT NULL,
	"rate_limit_ms" integer DEFAULT 1500 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_endpoint_id_source_endpoints_id_fk" FOREIGN KEY ("source_endpoint_id") REFERENCES "public"."source_endpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_endpoints" ADD CONSTRAINT "source_endpoints_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_url_idx" ON "documents" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_sha256_bytes_idx" ON "documents" USING btree ("sha256_bytes");--> statement-breakpoint
CREATE UNIQUE INDEX "source_endpoints_url_idx" ON "source_endpoints" USING btree ("endpoint_url");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_base_url_idx" ON "sources" USING btree ("base_url");