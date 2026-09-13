import { z } from "zod";

export const healthQuerySchema = z.object({
	verbose: z.stringbool().optional(),
});

export type HealthQuery = z.infer<typeof healthQuerySchema>;
