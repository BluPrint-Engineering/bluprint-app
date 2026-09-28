import { z } from "zod";
import { projectSummarySchema } from "./project-summary.js";

export const projectListSchema = z.object({
	items: z.array(projectSummarySchema).meta({
		description:
			"One page of visible projects, in the requested order, ties broken by id so pages never overlap.",
	}),
	total: z.number().int().nonnegative().meta({
		description: "Visible projects across every page.",
		example: 26,
	}),
});

export type ProjectList = z.infer<typeof projectListSchema>;
