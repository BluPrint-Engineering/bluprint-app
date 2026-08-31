import { z } from "zod";

const envSchema = z.object({
	PORT: z.coerce.number().int().positive().default(3000),
	CORS_ORIGIN: z.url().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);
