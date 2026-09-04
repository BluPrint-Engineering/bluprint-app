import { z } from "zod";

export const healthQuerySchema = z.object({
	verbose: z.stringbool().optional(),
});

export type HealthQuery = z.infer<typeof healthQuerySchema>;

export const healthResponseSchema = z.object({
	status: z.enum(["ok", "degraded"]),
	database: z.enum(["up", "down"]),
	timestamp: z.iso.datetime(),
	uptime: z.number(),
	verbose: z
		.object({
			environment: z.string(),
			runtime: z.string(),
		})
		.optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
