import { z } from "zod";
import { projectNameSchema } from "./project-name.js";

export const createProjectSchema = z.object({
	name: projectNameSchema,
	units: z.int().min(1).meta({
		description:
			"Units the project reserves from the organization's free units. Taken at creation and held by the project; it does not spend them.",
		example: 80,
	}),
});

export type CreateProject = z.infer<typeof createProjectSchema>;
