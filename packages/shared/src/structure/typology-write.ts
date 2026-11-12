import { z } from "zod";
import { projectParamsSchema } from "../projects/project-params.js";
import {
	comparableLocationName,
	MAX_ROOMS_PER_TYPOLOGY,
	newTypologyRoomSchema,
	newTypologySchema,
} from "./create-structure.js";
import { typologySchema } from "./typologies.js";
import { typologyNameSchema } from "./typology-ref.js";

const roomsSchema = z
	.array(newTypologyRoomSchema)
	.max(MAX_ROOMS_PER_TYPOLOGY)
	.superRefine((rooms, ctx) => {
		const ids = new Set<string>();
		const names = new Set<string>();
		rooms.forEach((room, index) => {
			if (ids.has(room.id)) {
				ctx.addIssue({
					code: "custom",
					path: [index, "id"],
					message: "Two rooms of the typology share an id.",
				});
			}
			ids.add(room.id);

			const comparable = comparableLocationName(room.name);
			if (names.has(comparable)) {
				ctx.addIssue({
					code: "custom",
					path: [index, "name"],
					message: "A typology lists the same room name twice.",
				});
			}
			names.add(comparable);
		});
	});

export const typologyParamsSchema = projectParamsSchema.extend({
	typologyId: z.uuid().meta({ description: "The typology's id." }),
});

export const createTypologySchema = newTypologySchema.extend({
	rooms: roomsSchema.default([]).meta({
		description: `The typology's rooms in their stored order, at most ${MAX_ROOMS_PER_TYPOLOGY}. Left out, the typology starts without rooms.`,
	}),
});

export const updateTypologySchema = z
	.object({
		name: typologyNameSchema.optional(),
		rooms: roomsSchema.optional().meta({
			description: `The typology's whole ordered list of rooms, at most ${MAX_ROOMS_PER_TYPOLOGY}. A room keeps the id it has; a room without a stored id is new, with an id of the client's choosing. Rooms left out of the list are taken out of the typology. Left out, the rooms stay as they are.`,
		}),
	})
	.refine(({ name, rooms }) => name !== undefined || rooms !== undefined, {
		message: "Send a name, a list of rooms or both.",
	});

export const updateTypologyResultSchema = z.object({
	typology: typologySchema,
	updatedUnitCount: z.int().nonnegative().meta({
		description:
			"How many units of the typology changed: the ones that got a new room, lost one, took a new room name or now list their rooms in another order. A unit that renamed a room keeps its name, and a unit that has a room only it has keeps it. 0 when only the name of the typology changed.",
	}),
});

export type CreateTypology = z.infer<typeof createTypologySchema>;
export type UpdateTypology = z.infer<typeof updateTypologySchema>;
export type UpdateTypologyResult = z.infer<typeof updateTypologyResultSchema>;
export type TypologyParams = z.infer<typeof typologyParamsSchema>;
