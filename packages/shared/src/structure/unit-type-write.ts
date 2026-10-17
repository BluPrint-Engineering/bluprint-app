import { z } from "zod";
import { projectParamsSchema } from "../projects/project-params.js";
import {
	comparableLocationName,
	MAX_ROOMS_PER_UNIT_TYPE,
	newUnitTypeRoomSchema,
	newUnitTypeSchema,
} from "./create-structure.js";
import { unitTypeNameSchema } from "./unit-type-ref.js";
import { unitTypeSchema } from "./unit-types.js";

const roomsSchema = z
	.array(newUnitTypeRoomSchema)
	.max(MAX_ROOMS_PER_UNIT_TYPE)
	.superRefine((rooms, ctx) => {
		const ids = new Set<string>();
		const names = new Set<string>();
		rooms.forEach((room, index) => {
			if (ids.has(room.id)) {
				ctx.addIssue({
					code: "custom",
					path: [index, "id"],
					message: "Two rooms of the unit type share an id.",
				});
			}
			ids.add(room.id);

			const comparable = comparableLocationName(room.name);
			if (names.has(comparable)) {
				ctx.addIssue({
					code: "custom",
					path: [index, "name"],
					message: "A unit type lists the same room name twice.",
				});
			}
			names.add(comparable);
		});
	});

export const unitTypeParamsSchema = projectParamsSchema.extend({
	unitTypeId: z.uuid().meta({ description: "The unit type's id." }),
});

export const createUnitTypeSchema = newUnitTypeSchema.extend({
	rooms: roomsSchema.default([]).meta({
		description: `The unit type's rooms in their stored order, at most ${MAX_ROOMS_PER_UNIT_TYPE}. Left out, the unit type starts without rooms.`,
	}),
});

export const updateUnitTypeSchema = z
	.object({
		name: unitTypeNameSchema.optional(),
		rooms: roomsSchema.optional().meta({
			description: `The unit type's whole ordered list of rooms, at most ${MAX_ROOMS_PER_UNIT_TYPE}. A room keeps the id it has; a room without a stored id is new, with an id of the client's choosing. Rooms left out of the list are taken out of the unit type. Left out, the rooms stay as they are.`,
		}),
	})
	.refine(({ name, rooms }) => name !== undefined || rooms !== undefined, {
		message: "Send a name, a list of rooms or both.",
	});

export const updateUnitTypeResultSchema = z.object({
	unitType: unitTypeSchema,
	updatedUnitCount: z.int().nonnegative().meta({
		description:
			"How many units of the unit type changed: the ones that got a new room, lost one, took a new room name or now list their rooms in another order. A unit that renamed a room keeps its name, and a unit that has a room only it has keeps it. 0 when only the name of the unit type changed.",
	}),
});

export type CreateUnitType = z.infer<typeof createUnitTypeSchema>;
export type UpdateUnitType = z.infer<typeof updateUnitTypeSchema>;
export type UpdateUnitTypeResult = z.infer<typeof updateUnitTypeResultSchema>;
export type UnitTypeParams = z.infer<typeof unitTypeParamsSchema>;
