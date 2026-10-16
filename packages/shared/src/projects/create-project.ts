import { z } from "zod";
import { projectNameSchema } from "./project-name.js";

export const createProjectSchema = z.object({
	id: z.uuid().meta({
		description:
			"The project's id, chosen by the client when the page opens and kept across retries: sending it again answers the project already created instead of creating another (ADR 0068).",
		example: "0190a000-0000-7000-8000-000000000001",
	}),
	name: projectNameSchema,
	units: z.int().min(1).meta({
		description:
			"Units the project reserves from the organization's free units. Taken at creation and held by the project; it does not spend them.",
		example: 80,
	}),
});

export type CreateProject = z.infer<typeof createProjectSchema>;
