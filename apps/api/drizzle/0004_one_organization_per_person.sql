DROP INDEX "member_organization_id_user_id_uidx";--> statement-breakpoint
DROP INDEX "member_user_id_idx";--> statement-breakpoint
-- databases seeded before RF-139 hold a person in two organizations; keep the oldest membership (uuidv7 ids sort by creation) so the unique index can be built
DELETE FROM "member" AS "newer" USING "member" AS "older" WHERE "older"."user_id" = "newer"."user_id" AND "older"."id" < "newer"."id";--> statement-breakpoint
-- and drop the project memberships the deleted rows leave in organizations those people no longer belong to
DELETE FROM "project_member" WHERE NOT EXISTS (SELECT 1 FROM "project" INNER JOIN "member" ON "member"."organization_id" = "project"."organization_id" WHERE "project"."id" = "project_member"."project_id" AND "member"."user_id" = "project_member"."user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_user_id_uidx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_organization_id_idx" ON "member" USING btree ("organization_id");
