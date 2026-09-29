import { z } from "zod";
import { effectiveRoles } from "../roles.js";
import { projectStatusSchema } from "./project-status.js";

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
	lastActivityAt: z.iso.datetime().meta({
		description:
			"When anyone last changed the project's operational content. Creation counts as the first activity; renaming does not.",
	}),
	role: projectAccessRoleSchema,
	status: projectStatusSchema.meta({
		description:
			"`active`: in progress. `delivered`: handed over to the client; its content is frozen until it is reopened.",
	}),
});

export type ProjectAccessRole = z.infer<typeof projectAccessRoleSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
