import { z } from "zod";
import { projectUnitsSchema } from "./project-summary.js";

export const projectUnitsBalanceSchema = projectUnitsSchema.extend({
	remaining: z.int().nonnegative().meta({
		description:
			"`reserved` minus `used`: how many units and common areas the project can still create.",
		example: 80,
	}),
});

export type ProjectUnitsBalance = z.infer<typeof projectUnitsBalanceSchema>;
