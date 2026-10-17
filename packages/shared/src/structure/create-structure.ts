import { z } from "zod";
import { locationTypeSchema } from "./location-type.js";
import { structureCountsSchema } from "./structure.js";
import { roomNameSchema, unitTypeNameSchema } from "./unit-type-ref.js";

export const MAX_LOCATIONS_PER_REQUEST = 5000;
export const MAX_UNITS_PER_FLOOR = 30;
export const LOCATION_NAME_MAX_LENGTH = 60;
export const MAX_UNIT_TYPES_PER_REQUEST = 50;
export const MAX_ROOMS_PER_UNIT_TYPE = 50;

export const locationNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(LOCATION_NAME_MAX_LENGTH)
	.meta({
		description: `The location's name, trimmed, 1 to ${LOCATION_NAME_MAX_LENGTH} characters. Unique among its siblings of the same kind, ignoring case and repeated spaces; accents count.`,
		example: "901",
	});

export const tidyLocationName = (name: string) =>
	name.trim().replace(/\s+/g, " ");

export const comparableLocationName = (name: string) =>
	tidyLocationName(name).toLowerCase();

export const sameLocationName = (a: string, b: string) =>
	comparableLocationName(a) === comparableLocationName(b);

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
	unitTypeId: z.uuid().optional().meta({
		description:
			"The unit type a unit follows: one that already exists in the project or one listed in `unitTypes` of this request. The unit is born with the rooms of that unit type. Only a unit takes one; left out, the unit has none.",
	}),
});

export const newUnitTypeRoomSchema = z.object({
	id: z.uuid().meta({
		description:
			"The room's id in the unit type, chosen by the client like the unit type's.",
	}),
	name: roomNameSchema,
});

export const newUnitTypeSchema = z.object({
	id: z.uuid().meta({
		description:
			"The unit type's id, chosen by the client and kept across retries: sending it again, in the same project, skips the unit type and its rooms instead of creating them twice (ADR 0071).",
		example: "0190a000-0000-7000-8000-0000000000a1",
	}),
	name: unitTypeNameSchema,
	rooms: z
		.array(newUnitTypeRoomSchema)
		.max(MAX_ROOMS_PER_UNIT_TYPE)
		.meta({
			description: `The unit type's rooms in their stored order, at most ${MAX_ROOMS_PER_UNIT_TYPE}.`,
		}),
});

export const createStructureSchema = z
	.object({
		unitTypes: z
			.array(newUnitTypeSchema)
			.max(MAX_UNIT_TYPES_PER_REQUEST)
			.default([])
			.meta({
				description: `The unit types (*tipologias*) to create with their rooms, at most ${MAX_UNIT_TYPES_PER_REQUEST}. A unit of \`locations\` may follow one of them. Left out, none is created.`,
			}),
		locations: z
			.array(newLocationSchema)
			.min(1)
			.max(MAX_LOCATIONS_PER_REQUEST)
			.meta({
				description: `The locations to create, parents before their children, at most ${MAX_LOCATIONS_PER_REQUEST} locations and ${MAX_UNITS_PER_FLOOR} units under one floor in one request.`,
			}),
	})
	.superRefine(({ locations, unitTypes }, ctx) => {
		const seenTypes = new Set<string>();
		const seenRooms = new Set<string>();
		unitTypes.forEach((unitType, typeIndex) => {
			if (seenTypes.has(unitType.id)) {
				ctx.addIssue({
					code: "custom",
					path: ["unitTypes", typeIndex, "id"],
					message: "Two unit types in the request share an id.",
				});
			}
			seenTypes.add(unitType.id);

			const roomNames = new Set<string>();
			unitType.rooms.forEach((room, roomIndex) => {
				if (seenRooms.has(room.id)) {
					ctx.addIssue({
						code: "custom",
						path: ["unitTypes", typeIndex, "rooms", roomIndex, "id"],
						message: "Two rooms in the request share an id.",
					});
				}
				seenRooms.add(room.id);

				const comparable = comparableLocationName(room.name);
				if (roomNames.has(comparable)) {
					ctx.addIssue({
						code: "custom",
						path: ["unitTypes", typeIndex, "rooms", roomIndex, "name"],
						message: "A unit type lists the same room name twice.",
					});
				}
				roomNames.add(comparable);
			});
		});

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

			if (entry.unitTypeId !== undefined && entry.type !== "unit") {
				ctx.addIssue({
					code: "custom",
					path: ["locations", index, "unitTypeId"],
					message: "Only a unit follows a unit type.",
				});
			}

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
export type NewUnitTypeRoom = z.infer<typeof newUnitTypeRoomSchema>;
export type NewUnitType = z.infer<typeof newUnitTypeSchema>;
export type CreateStructure = z.infer<typeof createStructureSchema>;
export type CreateStructureResult = z.infer<typeof createStructureResultSchema>;
