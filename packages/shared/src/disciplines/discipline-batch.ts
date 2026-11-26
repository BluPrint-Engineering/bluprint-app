import { z } from "zod";

export const MAX_BATCH_LOCATIONS = 5000;

const disciplineIdsSchema = z.array(z.uuid()).refine(
	(ids) => new Set(ids).size === ids.length,
	"Ids must not repeat.",
);

const batchLocationsTargetSchema = z.object({
	type: z.literal("locations"),
	locationIds: z
		.array(z.uuid())
		.min(1)
		.max(MAX_BATCH_LOCATIONS)
		.refine(
			(ids) => new Set(ids).size === ids.length,
			"Ids must not repeat.",
		)
		.meta({
			description: `The units and common areas to change, 1 to ${MAX_BATCH_LOCATIONS}, without repeats.`,
		}),
});

const batchFloorTargetSchema = z.object({
	type: z.literal("floor"),
	locationId: z.uuid().meta({
		description:
			"A floor: the batch reaches the units and common areas under it when it commits, never the floor itself.",
	}),
});

const batchTowerTargetSchema = z.object({
	type: z.literal("tower"),
	locationId: z.uuid().meta({
		description:
			"A tower: the batch reaches the units and common areas of all its floors and the common areas of the tower itself when it commits, never the tower or a floor.",
	}),
});

export const disciplineBatchTargetSchema = z
	.discriminatedUnion("type", [
		batchLocationsTargetSchema,
		batchFloorTargetSchema,
		batchTowerTargetSchema,
	])
	.meta({
		description:
			"Which locations the batch changes: the chosen units and common areas, the units and common areas of one floor, or those of one tower.",
	});

export const disciplineBatchSchema = z
	.object({
		target: disciplineBatchTargetSchema,
		on: disciplineIdsSchema.meta({
			description:
				"The disciplines to turn on at every location of the target, without repeats.",
		}),
		off: disciplineIdsSchema.meta({
			description:
				"The disciplines to turn off at every location of the target, without repeats. None may also be in `on`.",
		}),
	})
	.superRefine(({ on, off }, ctx) => {
		if (on.length + off.length === 0) {
			ctx.addIssue({
				code: "custom",
				path: ["on"],
				message: "Name at least one discipline to turn on or off.",
			});
		}
		const turnedOn = new Set(on);
		if (off.some((id) => turnedOn.has(id))) {
			ctx.addIssue({
				code: "custom",
				path: ["off"],
				message: "A discipline cannot be turned on and off in one batch.",
			});
		}
	});

export const disciplineBatchResultSchema = z.object({
	locations: z.int().min(0).meta({
		description: "How many locations the batch was applied to.",
		example: 5,
	}),
});

export type DisciplineBatchTarget = z.infer<typeof disciplineBatchTargetSchema>;
export type DisciplineBatch = z.infer<typeof disciplineBatchSchema>;
export type DisciplineBatchResult = z.infer<typeof disciplineBatchResultSchema>;
