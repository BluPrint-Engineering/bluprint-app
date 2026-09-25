import { config } from "dotenv";
import { Pool } from "pg";
import { createAuth } from "./src/auth/auth";
import { createDatabase } from "./src/db/database.module";
import { envSchema } from "./src/lib/env";

// read only by the Better Auth CLI, outside the Nest ConfigModule — same reason drizzle.config.ts exists
config({ path: ["../../.env.local", "../../.env"] });

const env = envSchema.parse(process.env);

export const auth = createAuth(
	createDatabase(new Pool({ connectionString: env.DATABASE_URL })),
	{
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		trustedOrigins: [env.CORS_ORIGIN],
		allowSelfSignup: env.ALLOW_SELF_SIGNUP,
		checkBreachedPasswords: env.PASSWORD_BREACH_CHECK,
		// the CLI only generates tables; it never creates a user
		onUserCreated: () => Promise.resolve(),
	},
);
