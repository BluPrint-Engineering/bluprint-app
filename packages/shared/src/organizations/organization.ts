import { z } from "zod";
import { defaultRoleSchema } from "../roles.js";

/** Only switches interface on and off; the API still authorizes from the effective role (ADR 0022). */
export const organizationSchema = z.object({
	id: z.uuid(),
	name: z.string().meta({
		description: "The organization's name.",
		example: "Construtora Horizonte",
	}),
	role: defaultRoleSchema.meta({
		description:
			"The caller's default role in the organization. It never authorizes anything: a project's rules read the effective role on the project membership.",
	}),
});

export type Organization = z.infer<typeof organizationSchema>;
