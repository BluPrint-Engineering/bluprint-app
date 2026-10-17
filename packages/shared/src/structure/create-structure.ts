import { z } from "zod";
import { locationTypeSchema } from "./location-type.js";
import { structureCountsSchema } from "./structure.js";

export const MAX_LOCATIONS_PER_REQUEST = 5000;
export const MAX_UNITS_PER_FLOOR = 30;
export const LOCATION_NAME_MAX_LENGTH = 60;

export const locationNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(LOCATION_NAME_MAX_LENGTH)
	.meta({
		description: `The location's name, trimmed, 1 to ${LOCATION_NAME_MAX_LENGTH} characters. Unique among its siblings of the same kind, ignoring case and repeated spaces; accents count.`,
		example: "901",
	});

export const newLocationSchema = z.object({
	id: z.uuid().meta({
		description:
			"The location's id, chosen by the client and kept across retries: sending it again, in the same project, as the same kind and under the same parent, skips it instead of creating it twice (ADR 0071).",
		example: "0190a000-0000-7000-8000-000000000001",
	}),
	parentId: z.uuid().nullable().meta({
		description:
			"The location it hangs under: one that already exists in the project, or one listed earlier in this request. Null for a tower and a common area of the project itself.",
	}),
	type: locationTypeSchema,
	name: locationNameSchema,
	position: z.int().nonnegative().meta({
		description:
			"Where it sits among the locations under the same parent, counting from 0; the stored order is what the client reads back.",
		example: 0,
	}),
});

export const createStructureSchema = z
	.object({
		locations: z
			.array(newLocationSchema)
			.min(1)
			.max(MAX_LOCATIONS_PER_REQUEST)
			.meta({
				description: `The locations to create, parents before their children, at most ${MAX_LOCATIONS_PER_REQUEST} in one request and ${MAX_UNITS_PER_FLOOR} units under one floor.`,
			}),
	})
	.superRefine(({ locations }, ctx) => {
		const seen = new Set<string>();
		const unitsPerFloor = new Map<string, number>();
		locations.forEach((entry, index) => {
			if (seen.has(entry.id)) {
				ctx.addIssue({
					code: "custom",
					path: ["locations", index, "id"],
					message: "Two locations in the request share an id.",
				});
			}
			seen.add(entry.id);

			if (entry.type !== "unit" || entry.parentId === null) return;
			const units = (unitsPerFloor.get(entry.parentId) ?? 0) + 1;
			unitsPerFloor.set(entry.parentId, units);
			if (units === MAX_UNITS_PER_FLOOR + 1) {
				ctx.addIssue({
					code: "custom",
					path: ["locations", index, "parentId"],
					message: `A floor takes at most ${MAX_UNITS_PER_FLOOR} units per request.`,
				});
			}
		});
	});

export const createStructureResultSchema = z.object({
	counts: structureCountsSchema.meta({
		description:
			"What the request describes: its towers, floors, units and common areas, the same when the request is sent again and nothing new is created.",
	}),
});

export type NewLocation = z.infer<typeof newLocationSchema>;
export type CreateStructure = z.infer<typeof createStructureSchema>;
export type CreateStructureResult = z.infer<typeof createStructureResultSchema>;
