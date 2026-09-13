import { z } from "zod";
import { effectiveRoles } from "../roles.js";

/** The role reported for a project is the effective one when the caller has a
 * project membership, and `admin` when access comes only from the
 * organization membership. Kept apart from `defaultRoleSchema` on purpose —
 * the default role never authorizes anything, and this schema is what a
 * client sees. */
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
