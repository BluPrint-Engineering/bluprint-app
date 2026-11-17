DROP INDEX "room_name_unique";--> statement-breakpoint
DROP INDEX "typology_name_unique";--> statement-breakpoint
DROP INDEX "typology_room_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "room_name_unique" ON "room" USING btree ("location_id",lower(regexp_replace(btrim(immutable_unaccent("name")), '\s+', ' ', 'g')));--> statement-breakpoint
CREATE UNIQUE INDEX "typology_name_unique" ON "typology" USING btree ("project_id",lower(regexp_replace(btrim(immutable_unaccent("name")), '\s+', ' ', 'g')));--> statement-breakpoint
CREATE UNIQUE INDEX "typology_room_name_unique" ON "typology_room" USING btree ("typology_id",lower(regexp_replace(btrim(immutable_unaccent("name")), '\s+', ' ', 'g')));