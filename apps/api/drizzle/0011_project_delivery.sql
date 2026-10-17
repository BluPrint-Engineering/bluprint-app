ALTER TABLE "project" ADD COLUMN "delivered_by" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_delivered_by_user_id_fk" FOREIGN KEY ("delivered_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_delivery_only_when_delivered" CHECK ("project"."status" = 'delivered' or ("project"."delivered_by" is null and "project"."delivered_at" is null));