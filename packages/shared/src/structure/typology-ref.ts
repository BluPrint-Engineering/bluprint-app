import { z } from "zod";

export const TYPOLOGY_NAME_MAX_LENGTH = 60;
export const ROOM_NAME_MAX_LENGTH = 60;

export const typologyNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(TYPOLOGY_NAME_MAX_LENGTH)
	.meta({
		description: `The typology's name, trimmed, 1 to ${TYPOLOGY_NAME_MAX_LENGTH} characters. Unique in the project, ignoring case and repeated spaces; accents count.`,
		example: "Tipologia A",
	});

export const roomNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(ROOM_NAME_MAX_LENGTH)
	.meta({
		description: `The room's name, trimmed, 1 to ${ROOM_NAME_MAX_LENGTH} characters. Unique in its typology, ignoring case and repeated spaces; accents count.`,
		example: "Sala",
	});

export const typologyRefSchema = z.object({
	id: z.uuid(),
	name: z.string().meta({
		description: "The typology's name, free text of 1 to 60 characters.",
		example: "Tipologia A",
	}),
});

export const unitChangesSchema = z.int().nonnegative().meta({
	description:
		"How many changes the unit has against its typology, counted from what is recorded: rooms only this unit has, rooms of the type it dropped and rooms of the type it renamed. Always 0 for a unit without a typology.",
});

export type TypologyRef = z.infer<typeof typologyRefSchema>;
