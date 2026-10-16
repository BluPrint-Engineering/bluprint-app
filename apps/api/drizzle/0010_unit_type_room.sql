CREATE TABLE "dropped_room" (
	"location_id" uuid NOT NULL,
	"unit_type_room_id" uuid NOT NULL,
	CONSTRAINT "dropped_room_pk" PRIMARY KEY("location_id","unit_type_room_id")
);
--> statement-breakpoint
CREATE TABLE "room" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"location_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"unit_type_room_id" uuid,
	"renamed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_name_length" CHECK (char_length(btrim("room"."name")) between 1 and 60),
	CONSTRAINT "room_position_non_negative" CHECK ("room"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "unit_type" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unit_type_id_project_id_unique" UNIQUE("id","project_id"),
	CONSTRAINT "unit_type_name_length" CHECK (char_length(btrim("unit_type"."name")) between 1 and 60)
);
--> statement-breakpoint
CREATE TABLE "unit_type_room" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"unit_type_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "unit_type_room_name_length" CHECK (char_length(btrim("unit_type_room"."name")) between 1 and 60),
	CONSTRAINT "unit_type_room_position_non_negative" CHECK ("unit_type_room"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "unit_type_id" uuid;--> statement-breakpoint
ALTER TABLE "dropped_room" ADD CONSTRAINT "dropped_room_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dropped_room" ADD CONSTRAINT "dropped_room_unit_type_room_id_unit_type_room_id_fk" FOREIGN KEY ("unit_type_room_id") REFERENCES "public"."unit_type_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_unit_type_room_id_unit_type_room_id_fk" FOREIGN KEY ("unit_type_room_id") REFERENCES "public"."unit_type_room"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_type" ADD CONSTRAINT "unit_type_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_type_room" ADD CONSTRAINT "unit_type_room_unit_type_id_unit_type_id_fk" FOREIGN KEY ("unit_type_id") REFERENCES "public"."unit_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_location_id_idx" ON "room" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "room_name_unique" ON "room" USING btree ("location_id",lower(regexp_replace(btrim("name"), '\s+', ' ', 'g')));--> statement-breakpoint
CREATE UNIQUE INDEX "unit_type_name_unique" ON "unit_type" USING btree ("project_id",lower(regexp_replace(btrim("name"), '\s+', ' ', 'g')));--> statement-breakpoint
CREATE INDEX "unit_type_room_unit_type_id_idx" ON "unit_type_room" USING btree ("unit_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_type_room_name_unique" ON "unit_type_room" USING btree ("unit_type_id",lower(regexp_replace(btrim("name"), '\s+', ' ', 'g')));--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_unit_type_fk" FOREIGN KEY ("unit_type_id","project_id") REFERENCES "public"."unit_type"("id","project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_unit_type_on_unit" CHECK ("location"."unit_type_id" is null or "location"."type" = 'unit');