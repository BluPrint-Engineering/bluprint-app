import { z } from "zod";
import { locationRoomNameSchema } from "./location-rooms.js";
import { locationTypeSchema } from "./location-type.js";
import { structureCountsSchema } from "./structure.js";
import { roomNameSchema, typologyNameSchema } from "./typology-ref.js";

export const MAX_LOCATIONS_PER_REQUEST = 5000;
export const MAX_UNITS_PER_FLOOR = 30;
export const LOCATION_NAME_MAX_LENGTH = 60;
export const MAX_TYPOLOGIES_PER_REQUEST = 50;
export const MAX_ROOMS_PER_TYPOLOGY = 50;
export const MAX_ROOMS_PER_LOCATION = 200;

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

export const comparableRoomName = (name: string) =>
	tidyLocationName(name).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export const sameRoomName = (a: string, b: string) =>
	comparableRoomName(a) === comparableRoomName(b);

export const newLocationRoomSchema = z.object({
	id: z.uuid().meta({
		description:
			"The room's id, chosen by the client and kept across retries, so a location that comes back as it was keeps its rooms' ids.",
		example: "0190a000-0000-7000-8000-0000000000b1",
	}),
	name: locationRoomNameSchema,
	typologyRoomId: z.uuid().optional().meta({
		description:
			"The room of the unit's typology this one came from. Left out for a room only this location has.",
	}),
	renamed: z.boolean().optional().meta({
		description:
			"Whether the room came from the typology and was renamed in this unit. Needs `typologyRoomId`.",
	}),
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
	position: z.int().nonnegative().optional().meta({
		description:
			"Where it sits among the locations under the same parent, in ascending order: a location already at that position moves one place later, with every location after it. Left out, it goes after the last one; the `position` of a location read back puts a removed one back in its place.",
		example: 0,
	}),
	typologyId: z.uuid().optional().meta({
		description:
			"The typology a unit follows: one that already exists in the project or one listed in `typologies` of this request. Without `rooms`, the unit is born with the rooms of that typology. Only a unit takes one; left out, the unit has none.",
	}),
	rooms: z
		.array(newLocationRoomSchema)
		.optional()
		.meta({
			description: `The rooms of a unit or a common area in their stored order, at most ${MAX_ROOMS_PER_LOCATION} unless the request is a \`copy\`, so a location removed by mistake comes back as it was and a copy keeps what the original changed. Given, even empty, they are the location's rooms exactly; left out, a unit is born with the rooms of its typology and a common area with none. A unit that follows a typology lists each room of it once, here or in \`droppedRooms\`, and a room of the typology that was not renamed carries the typology's name for it.`,
		}),
	droppedRooms: z.array(z.uuid()).max(MAX_ROOMS_PER_LOCATION).optional().meta({
		description:
			"The rooms of the unit's typology that the unit took out, by their id in the typology. Only a unit with a `typologyId` that lists its `rooms` takes them.",
	}),
});

export const newTypologyRoomSchema = z.object({
	id: z.uuid().meta({
		description:
			"The room's id in the typology, chosen by the client like the typology's.",
	}),
	name: roomNameSchema,
});

export const newTypologySchema = z.object({
	id: z.uuid().meta({
		description:
			"The typology's id, chosen by the client and kept across retries: sending it again, in the same project, skips the typology and its rooms instead of creating them twice (ADR 0071).",
		example: "0190a000-0000-7000-8000-0000000000a1",
	}),
	name: typologyNameSchema,
	rooms: z
		.array(newTypologyRoomSchema)
		.max(MAX_ROOMS_PER_TYPOLOGY)
		.meta({
			description: `The typology's rooms in their stored order, at most ${MAX_ROOMS_PER_TYPOLOGY}.`,
		}),
});

export const createStructureSchema = z
	.object({
		typologies: z
			.array(newTypologySchema)
			.max(MAX_TYPOLOGIES_PER_REQUEST)
			.default([])
			.meta({
				description: `The typologies (*tipologias*) to create with their rooms, at most ${MAX_TYPOLOGIES_PER_REQUEST}. A unit of \`locations\` may follow one of them. Left out, none is created.`,
			}),
		locations: z
			.array(newLocationSchema)
			.min(1)
			.max(MAX_LOCATIONS_PER_REQUEST)
			.meta({
				description: `The locations to create, parents before their children, at most ${MAX_LOCATIONS_PER_REQUEST} locations and, unless the request is a \`copy\`, ${MAX_UNITS_PER_FLOOR} units under one floor in one request.`,
			}),
		copy: z
			.boolean()
			.optional()
			.meta({
				description: `Whether the request copies locations the project already has (*Duplicar*). A copy repeats what already exists, so neither the ${MAX_UNITS_PER_FLOOR} units under one floor nor the ${MAX_ROOMS_PER_LOCATION} rooms of a location apply to it. Left out means false.`,
			}),
	})
	.superRefine(({ locations, typologies, copy }, ctx) => {
		const seenTypes = new Set<string>();
		const seenRooms = new Set<string>();
		typologies.forEach((typology, typeIndex) => {
			if (seenTypes.has(typology.id)) {
				ctx.addIssue({
					code: "custom",
					path: ["typologies", typeIndex, "id"],
					message: "Two typologies in the request share an id.",
				});
			}
			seenTypes.add(typology.id);

			const roomNames = new Set<string>();
			typology.rooms.forEach((room, roomIndex) => {
				if (seenRooms.has(room.id)) {
					ctx.addIssue({
						code: "custom",
						path: ["typologies", typeIndex, "rooms", roomIndex, "id"],
						message: "Two rooms in the request share an id.",
					});
				}
				seenRooms.add(room.id);

				const comparable = comparableLocationName(room.name);
				if (roomNames.has(comparable)) {
					ctx.addIssue({
						code: "custom",
						path: ["typologies", typeIndex, "rooms", roomIndex, "name"],
						message: "A typology lists the same room name twice.",
					});
				}
				roomNames.add(comparable);
			});
		});

		const seen = new Set<string>();
		const seenLocationRooms = new Set<string>();
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

			if (entry.typologyId !== undefined && entry.type !== "unit") {
				ctx.addIssue({
					code: "custom",
					path: ["locations", index, "typologyId"],
					message: "Only a unit follows a typology.",
				});
			}

			if (
				entry.rooms !== undefined &&
				entry.type !== "unit" &&
				entry.type !== "common_area"
			) {
				ctx.addIssue({
					code: "custom",
					path: ["locations", index, "rooms"],
					message: "Only a unit or a common area holds rooms.",
				});
			}

			if (entry.droppedRooms !== undefined && entry.typologyId === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["locations", index, "droppedRooms"],
					message: "Only a unit that follows a typology takes rooms out.",
				});
			}
			if (entry.droppedRooms !== undefined && entry.rooms === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["locations", index, "droppedRooms"],
					message: "A unit lists the rooms it took out only with its rooms.",
				});
			}

			if (!copy && (entry.rooms?.length ?? 0) > MAX_ROOMS_PER_LOCATION) {
				ctx.addIssue({
					code: "custom",
					path: ["locations", index, "rooms"],
					message: `A location takes at most ${MAX_ROOMS_PER_LOCATION} rooms per request.`,
				});
			}

			const taken = new Set(entry.droppedRooms);
			const roomNames = new Set<string>();
			const typeRooms = new Set<string>();
			entry.rooms?.forEach((room, roomIndex) => {
				if (seenLocationRooms.has(room.id)) {
					ctx.addIssue({
						code: "custom",
						path: ["locations", index, "rooms", roomIndex, "id"],
						message: "Two rooms in the request share an id.",
					});
				}
				seenLocationRooms.add(room.id);

				const comparable = comparableLocationName(room.name);
				if (roomNames.has(comparable)) {
					ctx.addIssue({
						code: "custom",
						path: ["locations", index, "rooms", roomIndex, "name"],
						message: "A location lists the same room name twice.",
					});
				}
				roomNames.add(comparable);

				const fromType = room.typologyRoomId !== undefined;
				if (
					(room.renamed && !fromType) ||
					(fromType && entry.typologyId === undefined)
				) {
					ctx.addIssue({
						code: "custom",
						path: ["locations", index, "rooms", roomIndex, "typologyRoomId"],
						message:
							"A room that follows the typology needs a unit that follows one.",
					});
				}
				if (room.typologyRoomId !== undefined) {
					if (
						typeRooms.has(room.typologyRoomId) ||
						taken.has(room.typologyRoomId)
					) {
						ctx.addIssue({
							code: "custom",
							path: ["locations", index, "rooms", roomIndex, "typologyRoomId"],
							message:
								"A room of the typology is either kept or taken out, once.",
						});
					}
					typeRooms.add(room.typologyRoomId);
				}
			});
			if (entry.droppedRooms && taken.size !== entry.droppedRooms.length) {
				ctx.addIssue({
					code: "custom",
					path: ["locations", index, "droppedRooms"],
					message: "A room of the typology is taken out once.",
				});
			}

			if (copy || entry.type !== "unit" || entry.parentId === null) return;
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

export type NewLocationRoom = z.infer<typeof newLocationRoomSchema>;
export type NewLocation = z.infer<typeof newLocationSchema>;
export type NewTypologyRoom = z.infer<typeof newTypologyRoomSchema>;
export type NewTypology = z.infer<typeof newTypologySchema>;
export type CreateStructure = z.infer<typeof createStructureSchema>;
export type CreateStructureResult = z.infer<typeof createStructureResultSchema>;
