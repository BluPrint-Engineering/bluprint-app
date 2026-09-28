import { z } from "zod";

export const projectManagerSchema = z.object({
	id: z.string().meta({
		description: "The user's id, the value of the list's `manager` filter.",
	}),
	name: z.string().meta({
		description: "The user's name.",
		example: "Carla Mendes",
	}),
});

export const projectManagersSchema = z.array(projectManagerSchema).meta({
	description:
		"Everyone who is `manager` on at least one project of the organization, by name.",
});

export type ProjectManager = z.infer<typeof projectManagerSchema>;
