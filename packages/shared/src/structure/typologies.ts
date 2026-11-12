import { z } from "zod";
import { typologyRefSchema } from "./typology-ref.js";

const count = z.int().nonnegative();

export const typologyRoomSchema = z.object({
	id: z.uuid(),
	name: z.string().meta({
		description:
			"The room's name in the typology, free text of 1 to 60 characters.",
		example: "Sala",
	}),
});

export const typologySchema = typologyRefSchema.extend({
	rooms: z.array(typologyRoomSchema).meta({
		description: "The typology's rooms in their stored order.",
	}),
	unitCount: count.meta({
		description: "How many units follow this typology.",
	}),
	changedUnitCount: count.meta({
		description:
			"How many of those units have changes against it: a room only they have, a room of the type they dropped or a room of the type they renamed.",
	}),
});

export const typologyListSchema = z.object({
	typologies: z.array(typologySchema).meta({
		description: "The project's typologies in the order they were created.",
	}),
});

export type TypologyRoom = z.infer<typeof typologyRoomSchema>;
export type Typology = z.infer<typeof typologySchema>;
export type TypologyList = z.infer<typeof typologyListSchema>;
