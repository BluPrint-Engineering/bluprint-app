import { z } from "zod";

export const healthQuerySchema = z.object({
	verbose: z.stringbool().optional().meta({
		description: "Adds the `verbose` block to the response.",
		example: true,
	}),
});

export type HealthQuery = z.infer<typeof healthQuerySchema>;
