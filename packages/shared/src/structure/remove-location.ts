import { z } from "zod";

const count = z.int().nonnegative();

export const removedCountsSchema = z.object({
	floors: count,
	units: count,
	commonAreas: count,
});

export const removeLocationResultSchema = z.object({
	outcome: z.literal("deleted").meta({
		description:
			"What happened to the location. Only `deleted` exists for now: nothing in a project holds content yet.",
	}),
	removed: removedCountsSchema.meta({
		description:
			"What the removal took with it: the location itself and everything below it, counted by kind. A tower is not counted, it is not one of the kinds.",
	}),
});

export type RemovedCounts = z.infer<typeof removedCountsSchema>;
export type RemoveLocationResult = z.infer<typeof removeLocationResultSchema>;
