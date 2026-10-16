-- a license was one project's; there is no paying customer to convert, and production can be re-seeded (ADR 0074)
DELETE FROM "license";--> statement-breakpoint
ALTER TABLE "license" DROP CONSTRAINT "license_project_id_project_id_fk";
--> statement-breakpoint
DROP INDEX "license_project_id_uidx";--> statement-breakpoint
ALTER TABLE "license" ADD COLUMN "units" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "reserved_units" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "license" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "license" ADD CONSTRAINT "license_units_positive" CHECK ("license"."units" > 0);--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_reserved_units_non_negative" CHECK ("project"."reserved_units" >= 0);