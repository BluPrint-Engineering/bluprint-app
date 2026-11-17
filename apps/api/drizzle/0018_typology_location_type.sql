ALTER TABLE "location" DROP CONSTRAINT "location_typology_fk";--> statement-breakpoint
ALTER TABLE "location" DROP CONSTRAINT "location_typology_on_unit";--> statement-breakpoint
ALTER TABLE "typology" DROP CONSTRAINT "typology_id_project_id_unique";--> statement-breakpoint
ALTER TABLE "typology" ADD COLUMN "location_type" "location_type";--> statement-breakpoint
UPDATE "typology" SET "location_type" = 'unit';--> statement-breakpoint
ALTER TABLE "typology" ALTER COLUMN "location_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "typology" ADD CONSTRAINT "typology_location_type" CHECK ("typology"."location_type" in ('unit', 'common_area'));--> statement-breakpoint
ALTER TABLE "typology" ADD CONSTRAINT "typology_id_project_id_location_type_unique" UNIQUE("id","project_id","location_type");--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_typology_fk" FOREIGN KEY ("typology_id","project_id","type") REFERENCES "public"."typology"("id","project_id","location_type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_typology_on_unit" CHECK ("location"."typology_id" is null or "location"."type" in ('unit', 'common_area'));