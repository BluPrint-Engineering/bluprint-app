import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { Database } from "../db/database.module";
import { withProblemDetails } from "./auth-problem-details";
import { discardUser, provisionTenant } from "./signup-provisioning";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Better Auth's own path for the route: what `ctx.path` holds inside a hook,
 * with the `/api/auth` base stripped off. */
const SIGN_UP_PATH = "/sign-up/email";

export interface AuthOptions {
	secret: string;
	baseURL: string;
	trustedOrigins: string[];
	allowSelfSignup: boolean;
}

export function createAuth(db: Database, options: AuthOptions) {
	const auth = betterAuth({
		// `transaction` is off by default in the adapter, which makes `user`,
		// `account` and `session` three separate autocommits.
		database: drizzleAdapter(db, { provider: "pg", transaction: true }),
		secret: options.secret,
		baseURL: options.baseURL,
		trustedOrigins: options.trustedOrigins,
		advanced: {
			// Pinned: Better Auth turns the origin check off by itself when
			// NODE_ENV is `test`, so the suite would prove what production doesn't.
			disableOriginCheck: false,
		},
		// No verification and no password reset: both need an email provider,
		// which arrives with the invite in #11.
		emailAndPassword: { enabled: true },
		// People in the field stay logged in. The client must never send
		// `rememberMe: false` — that turns the cookie into a browser-session
		// cookie and this window stops mattering.
		session: { expiresIn: 90 * DAY, updateAge: DAY },
		user: {
			additionalFields: {
				// `input: false` keeps the field off the sign-up payload:
				// docs/adr/0013-better-auth-tables-are-generated.md
				isPlatformAdmin: {
					type: "boolean",
					required: true,
					defaultValue: false,
					input: false,
				},
			},
		},
		hooks: {
			// TODO(#11): remove with self-signup. Why a hook answering 403:
			// docs/adr/0011-self-signup-is-scaffolding.md
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
					// TODO(#11): seeds on every user creation, invited people included.
					// Runs after the user commits; rethrow a plain Error, never an
					// APIError, or the failed sign-up can still set a session cookie.
					// See docs/adr/0012-signup-seeding-as-compensated-saga.md
					after: async (created) => {
						try {
							await provisionTenant(db, created.id, created.name);
						} catch (error) {
							await discardUser(db, created.id);
							throw error;
						}
					},
				},
			},
		},
		// Enabled explicitly — the default is off outside production. Buckets are
		// keyed by an IP read from a header; what that costs until #21 puts a
		// proxy in front: docs/adr/0010-self-hosted-better-auth.md.
		rateLimit: {
			enabled: true,
			window: MINUTE,
			max: 100,
			// Spelled out because the library's own default for these paths is
			// stricter and invisible (3 per 10s).
			customRules: {
				"/sign-in/email": { window: MINUTE, max: 5 },
				"/sign-up/email": { window: MINUTE, max: 5 },
			},
		},
	});

	return { ...auth, handler: withProblemDetails(auth.handler) };
}
