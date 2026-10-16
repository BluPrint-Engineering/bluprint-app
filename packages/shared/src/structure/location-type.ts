import { z } from "zod";

export const locationTypes = ["tower", "floor", "unit", "common_area"] as const;

export const locationTypeSchema = z.enum(locationTypes).meta({
	id: "LocationType",
	description:
		"What a location is: a `tower`, a `floor` of a tower, a `unit` on a floor, or a `common_area` of the project, a tower or a floor.",
});

export type LocationType = z.infer<typeof locationTypeSchema>;
