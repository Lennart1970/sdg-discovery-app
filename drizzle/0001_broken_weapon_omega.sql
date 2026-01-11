CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`title` varchar(500) NOT NULL,
	`statement` text NOT NULL,
	`sdg_goals` text,
	`geography` varchar(255),
	`target_groups` text,
	`sectors` text,
	`source_url` varchar(1000),
	`source_org` varchar(255),
	`confidence` int,
	`extracted_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`org_name` varchar(255) NOT NULL,
	`org_type` varchar(100) NOT NULL,
	`org_country` varchar(100),
	`org_website` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `source_feeds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`org_name` varchar(255) NOT NULL,
	`feed_name` varchar(255) NOT NULL,
	`feed_type` varchar(50) NOT NULL,
	`base_url` varchar(1000) NOT NULL,
	`crawl_policy` text,
	`last_crawled` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `source_feeds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tech_discovery_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challenge_id` int NOT NULL,
	`user_id` int,
	`model_used` varchar(100) NOT NULL,
	`budget_constraint_eur` int NOT NULL DEFAULT 10000,
	`challenge_summary` text,
	`core_functions` text,
	`underlying_principles` text,
	`confidence` int,
	`full_response` text,
	`raw_prompt` text,
	`status` enum('completed','failed','in_progress') NOT NULL DEFAULT 'in_progress',
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tech_discovery_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tech_paths` (
	`id` int AUTO_INCREMENT NOT NULL,
	`run_id` int NOT NULL,
	`challenge_id` int NOT NULL,
	`path_name` varchar(500) NOT NULL,
	`path_order` int NOT NULL,
	`principles_used` text,
	`technology_classes` text,
	`why_plausible` text,
	`estimated_cost_band_eur` varchar(100),
	`risks_and_unknowns` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tech_paths_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `challenges` ADD CONSTRAINT `challenges_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tech_discovery_runs` ADD CONSTRAINT `tech_discovery_runs_challenge_id_challenges_id_fk` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tech_discovery_runs` ADD CONSTRAINT `tech_discovery_runs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tech_paths` ADD CONSTRAINT `tech_paths_run_id_tech_discovery_runs_id_fk` FOREIGN KEY (`run_id`) REFERENCES `tech_discovery_runs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tech_paths` ADD CONSTRAINT `tech_paths_challenge_id_challenges_id_fk` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE no action ON UPDATE no action;