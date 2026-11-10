CREATE TABLE "project_use" (
	"user_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"last_used_at" timestamp with time zone NOT NULL,
	CONSTRAINT "project_use_user_id_project_id_pk" PRIMARY KEY("user_id","project_id")
);
--> statement-breakpoint
ALTER TABLE "project_use" ADD CONSTRAINT "project_use_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_use" ADD CONSTRAINT "project_use_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;