import { z } from "zod";
import { roomNameSchema } from "./typology-ref.js";

export const roomNamesSchema = z.object({
	names: z.array(roomNameSchema).meta({
		description:
			"The room names in use in the project, in its typologies and in its locations, one per name ignoring accents, case and repeated spaces (ADR 0083). Each is spelled the way most rooms spell it, the oldest spelling on a tie, and the list runs from the most used name to the least, the oldest first on a tie. Empty for a project without rooms.",
		example: ["Sala", "Cozinha", "Box 1"],
	}),
});

export type RoomNames = z.infer<typeof roomNamesSchema>;
