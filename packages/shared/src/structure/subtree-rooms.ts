import { z } from "zod";
import { newLocationDisciplineSchema } from "./create-structure.js";
import { droppedRoomSchema, roomSchema } from "./location-detail.js";

export const subtreeRoomsSchema = z.object({
	locations: z
		.array(
			z.object({
				id: z.uuid(),
				rooms: z.array(roomSchema).meta({
					description:
						"The location's rooms in the order of `GET .../locations/:locationId`: the ones that came from the typology first, then the ones only this location has. Empty for a tower and a floor.",
				}),
				droppedRooms: z.array(droppedRoomSchema).meta({
					description:
						"The rooms of the typology the location took out. Empty for a tower, a floor, and a unit or a common area without a typology.",
				}),
				disciplines: z.array(newLocationDisciplineSchema).meta({
					description:
						"The exceptions stored at the location, in the order of the project's catalog: each discipline whose applying here differs from the default of the location's kind (ADR 0081). Empty when the location follows the default for every discipline.",
				}),
			}),
		)
		.meta({
			description:
				"The location and every location below it, towers and floors included, with their rooms and their discipline exceptions: what copying the location needs. Locations without rooms are listed with empty arrays.",
		}),
});

export type SubtreeRooms = z.infer<typeof subtreeRoomsSchema>;
