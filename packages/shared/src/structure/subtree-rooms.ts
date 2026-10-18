import { z } from "zod";
import { droppedRoomSchema, roomSchema } from "./location-detail.js";

export const subtreeRoomsSchema = z.object({
	locations: z
		.array(
			z.object({
				id: z.uuid(),
				rooms: z.array(roomSchema).meta({
					description:
						"The location's rooms in the order of `GET .../locations/:locationId`: the ones that came from the unit type first, then the ones only this location has.",
				}),
				droppedRooms: z.array(droppedRoomSchema).meta({
					description:
						"The rooms of the unit type the unit took out. Empty for a common area and a unit without a unit type.",
				}),
			}),
		)
		.meta({
			description:
				"Every unit and common area at or below the location, with its rooms: what copying the location needs. Locations without rooms are listed with empty arrays.",
		}),
});

export type SubtreeRooms = z.infer<typeof subtreeRoomsSchema>;
