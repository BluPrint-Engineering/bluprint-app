import { z } from "zod";

export const createProjectSchema = z.object({
	name: z.string().trim().min(1).max(120).meta({
		description: "The project's name, chosen by the organization admin.",
		example: "Casa Moinhos",
	}),
});

export type CreateProject = z.infer<typeof createProjectSchema>;
