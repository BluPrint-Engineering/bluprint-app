import { z } from "zod";
import { projectNameSchema } from "./project-name.js";

export const renameProjectSchema = z.object({
	name: projectNameSchema,
});

export type RenameProject = z.infer<typeof renameProjectSchema>;
