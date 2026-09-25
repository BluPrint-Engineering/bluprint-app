import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { Database } from "../db/database.module";
import { withProblemDetails } from "./auth-problem-details";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** ctx.path strips the `/api/auth` base Better Auth mounts under. */
const SIGN_UP_PATH = "/sign-up/email";

export interface AuthOptions {
	secret: string;
	baseURL: string;
	trustedOrigins: string[];
	allowSelfSignup: boolean;
	onUserCreated: (user: { id: string; name: string }) => Promise<void>;
}

export function createAuth(db: Database, options: AuthOptions) {
	const auth = betterAuth({
		// transaction defaults off, which would make user/account/session three separate autocommits
		database: drizzleAdapter(db, { provider: "pg", transaction: true }),
		secret: options.secret,
		baseURL: options.baseURL,
		trustedOrigins: options.trustedOrigins,
		advanced: {
			// pinned: Better Auth disables this itself when NODE_ENV is "test"
			disableOriginCheck: false,
		},
		emailAndPassword: { enabled: true },
		session: { expiresIn: 90 * DAY, updateAge: DAY },
		user: {
			additionalFields: {
				// input: false is what stops a sign-up payload from setting it (ADR 0013)
				isPlatformAdmin: {
					type: "boolean",
					required: true,
					defaultValue: false,
					input: false,
				},
			},
		},
		hooks: {
			// TODO(#11): remove with self-signup (ADR 0011)
			before: createAuthMiddleware((ctx) => {
				if (!options.allowSelfSignup && ctx.path === SIGN_UP_PATH) {
					throw new APIError("FORBIDDEN", {
						message: "Self-service sign-up is disabled",
						code: "SELF_SIGNUP_DISABLED",
					});
				}
				return Promise.resolve();
			}),
		},
		databaseHooks: {
			user: {
				create: {
					// TODO(#11): seeds every new user, invited too (ADR 0012)
					after: (created) => options.onUserCreated(created),
				},
			},
		},
		// enabled explicitly: the default is off outside production
		rateLimit: {
			enabled: true,
			window: MINUTE,
			max: 100,
			// spelled out: the library's own default for these paths is stricter and invisible (3/10s)
			customRules: {
				"/sign-in/email": { window: MINUTE, max: 5 },
				"/sign-up/email": { window: MINUTE, max: 5 },
			},
		},
	});

	return { ...auth, handler: withProblemDetails(auth.handler) };
}
