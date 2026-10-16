import { z } from "zod";

export const createProjectSchema = z.object({
	name: z.string().trim().min(1).max(120).meta({
		description: "The project's name, chosen by the organization admin.",
		example: "Casa Moinhos",
	}),
	units: z.int().min(1).meta({
		description:
			"Units the project reserves from the organization's free units. Taken at creation and held by the project; it does not spend them.",
		example: 80,
	}),
});

export type CreateProject = z.infer<typeof createProjectSchema>;
