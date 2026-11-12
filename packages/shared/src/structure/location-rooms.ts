import { z } from "zod";
import { projectParamsSchema } from "../projects/project-params.js";
import { locationParamsSchema } from "./location-params.js";
import { ROOM_NAME_MAX_LENGTH } from "./typology-ref.js";

export const locationRoomNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(ROOM_NAME_MAX_LENGTH)
	.meta({
		description: `The room's name, trimmed, 1 to ${ROOM_NAME_MAX_LENGTH} characters. Unique in its unit or common area, ignoring case and repeated spaces; accents count.`,
		example: "Lavanderia",
	});

export const addRoomSchema = z.object({
	id: z.uuid().meta({
		description:
			"The room's id, chosen by the client and kept across retries: sending it again, to the same location, answers the same `201` and adds nothing (ADR 0071).",
		example: "0190a000-0000-7000-8000-0000000000b1",
	}),
	name: locationRoomNameSchema,
});

export const renameRoomSchema = z.object({
	name: locationRoomNameSchema,
});

export const changeTypologySchema = z.object({
	typologyId: z.uuid().nullable().meta({
		description:
			"The typology the unit follows from now on, one of the project's. Null leaves the unit without one, keeping its current rooms as rooms only it has.",
	}),
});

export const roomParamsSchema = projectParamsSchema.extend({
	roomId: z.uuid().meta({ description: "The room's id." }),
});

export const droppedRoomParamsSchema = locationParamsSchema.extend({
	typologyRoomId: z.uuid().meta({
		description: "The room of the typology that the unit took out.",
	}),
});

export type AddRoom = z.infer<typeof addRoomSchema>;
export type RenameRoom = z.infer<typeof renameRoomSchema>;
export type ChangeTypology = z.infer<typeof changeTypologySchema>;
export type RoomParams = z.infer<typeof roomParamsSchema>;
export type DroppedRoomParams = z.infer<typeof droppedRoomParamsSchema>;
