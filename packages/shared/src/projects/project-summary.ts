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

export const projectUnitsSchema = z.object({
	reserved: z.int().nonnegative().meta({
		description: "Units the project holds from the organization's licenses.",
		example: 80,
	}),
	used: z.int().nonnegative().meta({
		description:
			"Units the project has used, always within `reserved`: the units that exist in its structure.",
		example: 0,
	}),
});

export const projectDeliverySchema = z.object({
	at: z.iso.datetime().meta({ description: "When the project was delivered." }),
	by: z.string().nullable().meta({
		description:
			"Name of who delivered the project; `null` when that person no longer exists.",
		example: "Rafael Souza",
	}),
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
	units: projectUnitsSchema,
	status: projectStatusSchema.meta({
		description:
			"`active`: in progress. `delivered`: handed over to the client; delivery is final, so nothing in the project changes again.",
	}),
	delivery: projectDeliverySchema.nullable().meta({
		description:
			"Who delivered the project and when; `null` while it is in progress.",
	}),
});

export type ProjectAccessRole = z.infer<typeof projectAccessRoleSchema>;
export type ProjectDelivery = z.infer<typeof projectDeliverySchema>;
export type ProjectUnits = z.infer<typeof projectUnitsSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
