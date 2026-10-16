import { z } from "zod";
import { unitTypeRefSchema } from "./unit-type-ref.js";

const count = z.int().nonnegative();

export const unitTypeRoomSchema = z.object({
	id: z.uuid(),
	name: z.string().meta({
		description:
			"The room's name in the unit type, free text of 1 to 60 characters.",
		example: "Sala",
	}),
});

export const unitTypeSchema = unitTypeRefSchema.extend({
	rooms: z.array(unitTypeRoomSchema).meta({
		description: "The unit type's rooms in their stored order.",
	}),
	unitCount: count.meta({
		description: "How many units follow this unit type.",
	}),
	changedUnitCount: count.meta({
		description:
			"How many of those units have changes against it: a room only they have, a room of the type they dropped or a room of the type they renamed.",
	}),
});

export const unitTypeListSchema = z.object({
	unitTypes: z.array(unitTypeSchema).meta({
		description: "The project's unit types in the order they were created.",
	}),
});

export type UnitTypeRoom = z.infer<typeof unitTypeRoomSchema>;
export type UnitType = z.infer<typeof unitTypeSchema>;
export type UnitTypeList = z.infer<typeof unitTypeListSchema>;
