import { z } from "zod";

export const UNIT_TYPE_NAME_MAX_LENGTH = 60;
export const ROOM_NAME_MAX_LENGTH = 60;

export const unitTypeNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(UNIT_TYPE_NAME_MAX_LENGTH)
	.meta({
		description: `The unit type's name, trimmed, 1 to ${UNIT_TYPE_NAME_MAX_LENGTH} characters. Unique in the project, ignoring case and repeated spaces; accents count.`,
		example: "Tipologia A",
	});

export const roomNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(ROOM_NAME_MAX_LENGTH)
	.meta({
		description: `The room's name, trimmed, 1 to ${ROOM_NAME_MAX_LENGTH} characters. Unique in its unit type, ignoring case and repeated spaces; accents count.`,
		example: "Sala",
	});

export const unitTypeRefSchema = z.object({
	id: z.uuid(),
	name: z.string().meta({
		description: "The unit type's name, free text of 1 to 60 characters.",
		example: "Tipologia A",
	}),
});

export const unitChangesSchema = z.int().nonnegative().meta({
	description:
		"How many changes the unit has against its unit type, counted from what is recorded: rooms only this unit has, rooms of the type it dropped and rooms of the type it renamed. Always 0 for a unit without a unit type.",
});

export type UnitTypeRef = z.infer<typeof unitTypeRefSchema>;
