import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@bluprint/shared";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { haveIBeenPwned } from "better-auth/plugins";
import { Database } from "../db/database.module";
import { SIGN_UP_PATH } from "./auth-paths";
import { withProblemDetails } from "./auth-problem-details";
import { rejectGuessablePassword } from "./password-policy/password-policy";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface AuthOptions {
	secret: string;
	baseURL: string;
	trustedOrigins: string[];
	allowSelfSignup: boolean;
	checkBreachedPasswords: boolean;
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
		emailAndPassword: {
			enabled: true,
			minPasswordLength: PASSWORD_MIN_LENGTH,
			maxPasswordLength: PASSWORD_MAX_LENGTH,
		},
		// fails closed: while the HIBP API is unreachable, setting a password answers 500 (ADR 0052)
		plugins: [haveIBeenPwned({ enabled: options.checkBreachedPasswords })],
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
			before: createAuthMiddleware(async (ctx) => {
				// TODO(#11): remove with self-signup (ADR 0011)
				if (!options.allowSelfSignup && ctx.path === SIGN_UP_PATH) {
					throw new APIError("FORBIDDEN", {
						message: "Self-service sign-up is disabled",
						code: "SELF_SIGNUP_DISABLED",
					});
				}
				await rejectGuessablePassword(ctx);
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
