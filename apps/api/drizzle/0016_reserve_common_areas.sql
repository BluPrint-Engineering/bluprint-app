DO $$
DECLARE
	"raised" uuid[];
	"over" uuid;
BEGIN
	WITH "used" AS (
		SELECT "project_id", count(*)::integer AS "count"
		FROM "location"
		WHERE "type" IN ('unit', 'common_area')
		GROUP BY "project_id"
	), "updated" AS (
		UPDATE "project"
		SET "reserved_units" = "used"."count"
		FROM "used"
		WHERE "used"."project_id" = "project"."id"
			AND "project"."status" = 'active'
			AND "project"."reserved_units" < "used"."count"
		RETURNING "project"."organization_id"
	)
	SELECT array_agg(DISTINCT "organization_id") INTO "raised" FROM "updated";

	SELECT "project"."organization_id" INTO "over"
	FROM "project"
	WHERE "project"."organization_id" = ANY("raised")
	GROUP BY "project"."organization_id"
	HAVING sum("project"."reserved_units") > (
		SELECT coalesce(sum("license"."units"), 0)
		FROM "license"
		WHERE "license"."organization_id" = "project"."organization_id"
	)
	LIMIT 1;

	IF "over" IS NOT NULL THEN
		RAISE EXCEPTION 'Counting common areas as used units would reserve more units than organization % contracted.', "over";
	END IF;
END $$;
