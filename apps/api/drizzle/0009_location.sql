CREATE TYPE "public"."location_type" AS ENUM('tower', 'floor', 'unit', 'common_area');--> statement-breakpoint
CREATE TABLE "location" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_id" uuid,
	"type" "location_type" NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "location_id_project_id_unique" UNIQUE("id","project_id"),
	CONSTRAINT "location_name_length" CHECK (char_length(btrim("location"."name")) between 1 and 60),
	CONSTRAINT "location_position_non_negative" CHECK ("location"."position" >= 0),
	CONSTRAINT "location_root_type" CHECK ("location"."parent_id" is not null or "location"."type" in ('tower', 'common_area'))
);
--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_parent_fk" FOREIGN KEY ("parent_id","project_id") REFERENCES "public"."location"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "location_project_id_idx" ON "location" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "location_parent_id_idx" ON "location" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "location_root_name_unique" ON "location" USING btree ("project_id","type",lower(regexp_replace(btrim("name"), '\s+', ' ', 'g'))) WHERE "location"."parent_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "location_child_name_unique" ON "location" USING btree ("parent_id","type",lower(regexp_replace(btrim("name"), '\s+', ' ', 'g'))) WHERE "location"."parent_id" is not null;