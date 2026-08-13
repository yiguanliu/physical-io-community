CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`actor_name` text DEFAULT '' NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`summary` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `campaign_events` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`recipient_id` text,
	`type` text NOT NULL,
	`provider_event_id` text,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_events_provider_event_idx` ON `campaign_events` (`provider_event_id`);--> statement-breakpoint
CREATE INDEX `campaign_events_campaign_idx` ON `campaign_events` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `campaign_recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`member_id` text,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`skip_reason` text,
	`provider_id` text,
	`sent_at` text,
	`opened_at` text,
	`clicked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `campaign_recipients_campaign_idx` ON `campaign_recipients` (`campaign_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_recipients_provider_idx` ON `campaign_recipients` (`provider_id`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'newsletter' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`subject` text NOT NULL,
	`preview_text` text DEFAULT '' NOT NULL,
	`from_name` text DEFAULT 'Physical I/O' NOT NULL,
	`reply_to` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`audience_filter` text DEFAULT '{}' NOT NULL,
	`event_id` text,
	`scheduled_at` text,
	`sent_at` text,
	`created_by_user_id` text,
	`created_by_name` text DEFAULT '' NOT NULL,
	`idempotency_key` text NOT NULL,
	`recipient_count` integer DEFAULT 0 NOT NULL,
	`skip_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_idempotency_key_unique` ON `campaigns` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `community_events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`venue` text DEFAULT '' NOT NULL,
	`starts_at` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`registration_url` text DEFAULT '' NOT NULL,
	`registered_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`organisation_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contacts_org_idx` ON `contacts` (`organisation_id`);--> statement-breakpoint
CREATE TABLE `lead_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_by_name` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lead_activities_lead_idx` ON `lead_activities` (`lead_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`organisation_id` text NOT NULL,
	`contact_id` text,
	`status` text DEFAULT 'research' NOT NULL,
	`fit_score` integer DEFAULT 50 NOT NULL,
	`estimated_value_gbp` integer DEFAULT 0 NOT NULL,
	`owner_name` text DEFAULT '' NOT NULL,
	`next_action` text DEFAULT '' NOT NULL,
	`next_action_at` text,
	`last_activity_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE TABLE `member_interests` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`interest` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `member_interests_member_idx` ON `member_interests` (`member_id`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_normalized` text NOT NULL,
	`full_name` text NOT NULL,
	`first_name` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`professional_role` text DEFAULT '' NOT NULL,
	`experience_range` text DEFAULT '' NOT NULL,
	`website_url` text DEFAULT '' NOT NULL,
	`linkedin_url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`email_status` text DEFAULT 'ok' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`source_row` text,
	`notes` text DEFAULT '' NOT NULL,
	`unsubscribe_token` text NOT NULL,
	`last_contacted_at` text,
	`signed_up_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_normalized_idx` ON `members` (`email_normalized`);--> statement-breakpoint
CREATE INDEX `members_status_idx` ON `members` (`status`);--> statement-breakpoint
CREATE INDEX `members_city_idx` ON `members` (`city`);--> statement-breakpoint
CREATE TABLE `organisations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`industry` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outreach_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`to_email` text NOT NULL,
	`to_name` text DEFAULT '' NOT NULL,
	`provider_id` text,
	`sent_at` text,
	`created_by_name` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `outreach_messages_lead_idx` ON `outreach_messages` (`lead_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`channel` text DEFAULT 'email' NOT NULL,
	`topic` text NOT NULL,
	`status` text DEFAULT 'consent_unknown' NOT NULL,
	`consent_at` text,
	`unsubscribed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_member_channel_topic_idx` ON `subscriptions` (`member_id`,`channel`,`topic`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
