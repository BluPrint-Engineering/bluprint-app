import { z } from "zod";
import { effectiveRoles } from "../roles.js";

/** Kept apart from defaultRoleSchema: the default role never authorizes anything, this schema is what a client sees. */
export const projectAccessRoleSchema = z
	.enum([...effectiveRoles, "admin"])
	.meta({
		id: "ProjectAccessRole",
		description:
			"The caller's role in this project: their project membership's role, or `admin` when access comes only from the organization membership.",
	});

export const projectSummarySchema = z.object({
	id: z.uuid(),
	name: z.string(),
	createdAt: z.iso.datetime(),
	role: projectAccessRoleSchema,
});

export const projectListSchema = z.array(projectSummarySchema);

export type ProjectAccessRole = z.infer<typeof projectAccessRoleSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type ProjectList = z.infer<typeof projectListSchema>;
