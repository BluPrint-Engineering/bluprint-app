import { z } from "zod";

export const moveDirections = ["up", "down"] as const;

export const moveLocationSchema = z.object({
	direction: z.enum(moveDirections).meta({
		description:
			"Where the location goes among its siblings of the same kind. For a floor, `up` is one floor higher; for a unit, `up` is one place earlier in the list.",
		example: "up",
	}),
});

export type MoveDirection = (typeof moveDirections)[number];
export type MoveLocation = z.infer<typeof moveLocationSchema>;
