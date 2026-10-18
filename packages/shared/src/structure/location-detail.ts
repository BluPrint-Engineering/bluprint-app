import { z } from "zod";
import { locationTypeSchema } from "./location-type.js";
import { unitChangesSchema, unitTypeRefSchema } from "./unit-type-ref.js";

export const locationRefSchema = z.object({
	id: z.uuid(),
	type: locationTypeSchema,
	name: z.string().meta({ example: "Torre A" }),
});

export const roomSchema = z.object({
	id: z.uuid(),
	name: z.string().meta({
		description:
			"The room's name in this location, free text of 1 to 60 characters. For a room that came from the unit type and was renamed here, the name given here.",
		example: "Sala",
	}),
	unitTypeRoomId: z.uuid().nullable().meta({
		description:
			"The room of the unit type this one came from, or null for a room only this location has.",
	}),
	renamed: z.boolean().meta({
		description:
			"Whether a room that came from the unit type was renamed in this unit, so a rename in the type no longer reaches it.",
	}),
});

export const droppedRoomSchema = z.object({
	unitTypeRoomId: z.uuid().meta({
		description: "The room of the unit type that this unit took out.",
	}),
	name: z.string().meta({
		description: "The room's name in the unit type.",
		example: "Sacada",
	}),
});

export const locationDetailSchema = z.object({
	id: z.uuid(),
	type: locationTypeSchema,
	name: z.string().meta({ example: "903" }),
	position: z.int().nonnegative().meta({
		description:
			"Where the location sits among the locations under the same parent, counting from 0, as it was created. Positions can have gaps after a removal; the order is what counts.",
		example: 2,
	}),
	ancestors: z.array(locationRefSchema).meta({
		description:
			"The locations above this one, from the highest down to its parent. Empty for a tower and for a common area of the project.",
	}),
	children: z.array(locationRefSchema).meta({
		description:
			"The locations directly below this one in their stored order: floors and common areas of a tower, units and common areas of a floor. Empty for a unit and a common area.",
	}),
	unitType: unitTypeRefSchema.nullable().meta({
		description:
			"The unit type a unit follows. Null for a unit without one and for every other kind of location.",
	}),
	changes: unitChangesSchema,
	rooms: z.array(roomSchema).meta({
		description:
			"The rooms of a unit or a common area: the ones that came from the unit type first, in the order of the type, then the ones only this location has. Empty for a tower and a floor.",
	}),
	droppedRooms: z.array(droppedRoomSchema).meta({
		description:
			"The rooms of the unit type this unit took out, in the order of the type. Empty for anything but a unit with a unit type.",
	}),
});

export type LocationRef = z.infer<typeof locationRefSchema>;
export type Room = z.infer<typeof roomSchema>;
export type DroppedRoom = z.infer<typeof droppedRoomSchema>;
export type LocationDetail = z.infer<typeof locationDetailSchema>;
