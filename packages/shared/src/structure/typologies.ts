import { z } from "zod";
import { typologyLocationTypeSchema } from "./location-type.js";
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
	locationType: typologyLocationTypeSchema,
	version: z.int().positive().meta({
		description:
			"Starts at 1 and rises by 1 on every change to the typology's name or rooms. A rename or a change of rooms sends the version the screen read (ADR 0084).",
		example: 1,
	}),
	rooms: z.array(typologyRoomSchema).meta({
		description: "The typology's rooms in their stored order.",
	}),
	locationCount: count.meta({
		description:
			"How many locations follow this typology: units for a `unit` typology; common areas of the project, of a tower and of a floor for a `common_area` one.",
	}),
	changedLocationCount: count.meta({
		description:
			"How many of those locations have changes against it: a room only they have, a room of the type they dropped or a room of the type they renamed.",
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
