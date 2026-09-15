import { z } from "zod";

export const envSchema = z.object({
	PORT: z.coerce.number().int().positive().default(3000),
	CORS_ORIGIN: z.url().default("http://localhost:5173"),
	DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
	BETTER_AUTH_SECRET: z
		.string()
		.min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
	BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
	// stringbool, not coerce.boolean: coercion turns "false" into true and opens self-signup in production
	ALLOW_SELF_SIGNUP: z.stringbool().default(false),
	// no default: apiDocsEnabled derives one from NODE_ENV — see docs/adr/0046-openapi-via-nestjs-swagger.md
	API_DOCS_ENABLED: z.stringbool().optional(),
});

export type Env = z.infer<typeof envSchema>;
