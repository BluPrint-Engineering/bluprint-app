import { z } from "zod";

export const healthResponseSchema = z.object({
	status: z.enum(["ok", "degraded"]).meta({
		description: "`degraded` when the database check fails.",
	}),
	database: z.enum(["up", "down"]),
	timestamp: z.iso.datetime(),
	uptime: z
		.number()
		.meta({ description: "Seconds since the process started." }),
	verbose: z
		.object({
			environment: z.string(),
			runtime: z.string(),
		})
		.optional()
		.meta({ description: "Present only when `verbose=true` was requested." }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
