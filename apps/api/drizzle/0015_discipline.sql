-- unaccent() is only STABLE, so an index cannot call it; this wrapper pins the dictionary and is declared IMMUTABLE (ADR 0083)
CREATE FUNCTION "immutable_unaccent"(text) RETURNS text
	LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
	AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
--> statement-breakpoint
CREATE TYPE "public"."discipline_type" AS ENUM('general', 'base', 'extra');--> statement-breakpoint
CREATE TABLE "discipline" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"type" "discipline_type" NOT NULL,
	"has_own_plan" boolean NOT NULL,
	"applies_everywhere" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discipline_id_project_id_unique" UNIQUE("id","project_id"),
	CONSTRAINT "discipline_project_id_color_unique" UNIQUE("project_id","color"),
	CONSTRAINT "discipline_name_length" CHECK (char_length(btrim("discipline"."name")) between 1 and 60),
	CONSTRAINT "discipline_color_format" CHECK ("discipline"."color" is null or "discipline"."color" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "discipline_color_only_when_not_general" CHECK (("discipline"."color" is null) = ("discipline"."type" = 'general'))
);
--> statement-breakpoint
CREATE TABLE "location_discipline" (
	"location_id" uuid NOT NULL,
	"discipline_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"applies" boolean NOT NULL,
	CONSTRAINT "location_discipline_pk" PRIMARY KEY("location_id","discipline_id")
);
--> statement-breakpoint
ALTER TABLE "discipline" ADD CONSTRAINT "discipline_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_discipline" ADD CONSTRAINT "location_discipline_location_fk" FOREIGN KEY ("location_id","project_id") REFERENCES "public"."location"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_discipline" ADD CONSTRAINT "location_discipline_discipline_fk" FOREIGN KEY ("discipline_id","project_id") REFERENCES "public"."discipline"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discipline_name_unique" ON "discipline" USING btree ("project_id",lower(regexp_replace(btrim(immutable_unaccent("name")), '\s+', ' ', 'g')));--> statement-breakpoint
CREATE UNIQUE INDEX "discipline_general_unique" ON "discipline" USING btree ("project_id") WHERE "discipline"."type" = 'general';
--> statement-breakpoint
INSERT INTO "discipline" ("project_id", "name", "color", "type", "has_own_plan", "applies_everywhere", "created_at")
SELECT "id", 'Geral', NULL, 'general', true, true, clock_timestamp() FROM "project" ORDER BY "id";--> statement-breakpoint
INSERT INTO "discipline" ("project_id", "name", "color", "type", "has_own_plan", "applies_everywhere", "created_at")
SELECT "id", 'Hidráulica', '#2563EB', 'base', true, true, clock_timestamp() FROM "project" ORDER BY "id";--> statement-breakpoint
INSERT INTO "discipline" ("project_id", "name", "color", "type", "has_own_plan", "applies_everywhere", "created_at")
SELECT "id", 'Elétrica', '#D97706', 'base', true, true, clock_timestamp() FROM "project" ORDER BY "id";
