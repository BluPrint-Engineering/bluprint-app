import { z } from "zod";
import { effectiveRoles } from "../roles.js";

/** RF-134: the role reported for a project is the effective one when the
 * caller has a vínculo with the project (RF-122), and `admin` when access
 * comes only from the vínculo with the organization (RF-111, RF-114). Kept
 * apart from `defaultRoleSchema` on purpose — the default role never
 * authorizes anything (RF-123), and this schema is what a client sees. */
export const projectAccessRoleSchema = z.enum([...effectiveRoles, "admin"]);

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
