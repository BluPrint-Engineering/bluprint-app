ALTER TABLE "unit_type" RENAME TO "typology";--> statement-breakpoint
ALTER TABLE "unit_type_room" RENAME TO "typology_room";--> statement-breakpoint
ALTER TABLE "location" RENAME COLUMN "unit_type_id" TO "typology_id";--> statement-breakpoint
ALTER TABLE "dropped_room" RENAME COLUMN "unit_type_room_id" TO "typology_room_id";--> statement-breakpoint
ALTER TABLE "room" RENAME COLUMN "unit_type_room_id" TO "typology_room_id";--> statement-breakpoint
ALTER TABLE "typology_room" RENAME COLUMN "unit_type_id" TO "typology_id";--> statement-breakpoint
ALTER TABLE "typology" RENAME CONSTRAINT "unit_type_id_project_id_unique" TO "typology_id_project_id_unique";--> statement-breakpoint
ALTER TABLE "typology" RENAME CONSTRAINT "unit_type_name_length" TO "typology_name_length";--> statement-breakpoint
ALTER TABLE "typology" RENAME CONSTRAINT "unit_type_project_id_project_id_fk" TO "typology_project_id_project_id_fk";--> statement-breakpoint
ALTER TABLE "typology_room" RENAME CONSTRAINT "unit_type_room_name_length" TO "typology_room_name_length";--> statement-breakpoint
ALTER TABLE "typology_room" RENAME CONSTRAINT "unit_type_room_position_non_negative" TO "typology_room_position_non_negative";--> statement-breakpoint
ALTER TABLE "typology_room" RENAME CONSTRAINT "unit_type_room_unit_type_id_unit_type_id_fk" TO "typology_room_typology_id_typology_id_fk";--> statement-breakpoint
ALTER TABLE "location" RENAME CONSTRAINT "location_unit_type_on_unit" TO "location_typology_on_unit";--> statement-breakpoint
ALTER TABLE "location" RENAME CONSTRAINT "location_unit_type_fk" TO "location_typology_fk";--> statement-breakpoint
ALTER TABLE "dropped_room" RENAME CONSTRAINT "dropped_room_unit_type_room_id_unit_type_room_id_fk" TO "dropped_room_typology_room_id_typology_room_id_fk";--> statement-breakpoint
ALTER TABLE "room" RENAME CONSTRAINT "room_unit_type_room_id_unit_type_room_id_fk" TO "room_typology_room_id_typology_room_id_fk";--> statement-breakpoint
ALTER INDEX "unit_type_name_unique" RENAME TO "typology_name_unique";--> statement-breakpoint
ALTER INDEX "unit_type_room_unit_type_id_idx" RENAME TO "typology_room_typology_id_idx";--> statement-breakpoint
ALTER INDEX "unit_type_room_name_unique" RENAME TO "typology_room_name_unique";--> statement-breakpoint
ALTER TABLE "typology" RENAME CONSTRAINT "unit_type_pkey" TO "typology_pkey";--> statement-breakpoint
ALTER TABLE "typology_room" RENAME CONSTRAINT "unit_type_room_pkey" TO "typology_room_pkey";--> statement-breakpoint
ALTER TABLE "typology" RENAME CONSTRAINT "unit_type_id_not_null" TO "typology_id_not_null";--> statement-breakpoint
ALTER TABLE "typology" RENAME CONSTRAINT "unit_type_project_id_not_null" TO "typology_project_id_not_null";--> statement-breakpoint
ALTER TABLE "typology" RENAME CONSTRAINT "unit_type_name_not_null" TO "typology_name_not_null";--> statement-breakpoint
ALTER TABLE "typology" RENAME CONSTRAINT "unit_type_created_at_not_null" TO "typology_created_at_not_null";--> statement-breakpoint
ALTER TABLE "typology_room" RENAME CONSTRAINT "unit_type_room_id_not_null" TO "typology_room_id_not_null";--> statement-breakpoint
ALTER TABLE "typology_room" RENAME CONSTRAINT "unit_type_room_unit_type_id_not_null" TO "typology_room_typology_id_not_null";--> statement-breakpoint
ALTER TABLE "typology_room" RENAME CONSTRAINT "unit_type_room_name_not_null" TO "typology_room_name_not_null";--> statement-breakpoint
ALTER TABLE "typology_room" RENAME CONSTRAINT "unit_type_room_position_not_null" TO "typology_room_position_not_null";--> statement-breakpoint
ALTER TABLE "dropped_room" RENAME CONSTRAINT "dropped_room_unit_type_room_id_not_null" TO "dropped_room_typology_room_id_not_null";
