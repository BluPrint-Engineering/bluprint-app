CREATE TYPE "public"."project_status" AS ENUM('active', 'delivered');--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "status" "project_status" DEFAULT 'active' NOT NULL;