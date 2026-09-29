ALTER TABLE "project" ADD COLUMN "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- creation is a project's first activity: existing projects read their creation time, not the migration's
UPDATE "project" SET "last_activity_at" = "created_at";
