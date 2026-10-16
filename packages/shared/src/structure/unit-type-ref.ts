import { z } from "zod";

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
