import { z } from "zod";
import { locationTypeSchema } from "./location-type.js";

export const locationRefSchema = z.object({
	id: z.uuid(),
	type: locationTypeSchema,
	name: z.string().meta({ example: "Torre A" }),
});

export const locationDetailSchema = z.object({
	id: z.uuid(),
	type: locationTypeSchema,
	name: z.string().meta({ example: "903" }),
	ancestors: z.array(locationRefSchema).meta({
		description:
			"The locations above this one, from the highest down to its parent. Empty for a tower and for a common area of the project.",
	}),
	children: z.array(locationRefSchema).meta({
		description:
			"The locations directly below this one in their stored order: floors and common areas of a tower, units and common areas of a floor. Empty for a unit and a common area.",
	}),
});

export type LocationRef = z.infer<typeof locationRefSchema>;
export type LocationDetail = z.infer<typeof locationDetailSchema>;
