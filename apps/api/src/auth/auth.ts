import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { Database } from "../db/database.module";
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
	return betterAuth({
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
		// RNF-04. The client must never send `rememberMe: false` — that turns the
		// cookie into a browser-session cookie and this window stops mattering.
		session: { expiresIn: 90 * DAY, updateAge: DAY },
		user: {
			additionalFields: {
				// RF-101, the boundary RF-105 protects. `input: false` is what keeps
				// the field off the signup payload; `required` makes it NOT NULL.
				isPlatformAdmin: {
					type: "boolean",
					required: true,
					defaultValue: false,
					input: false,
				},
			},
		},
		hooks: {
			// The library's own `emailAndPassword.disableSignUp` answers 400 and
			// `disabledPaths` answers 404; the scaffold has to answer 403.
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
					// Better Auth drains this hook after the user row commits but
					// before it builds the response, so undoing the user is the only
					// way left to keep a failed provisioning from leaving an account
					// behind. Throw a plain Error, never an APIError: only the plain
					// one takes better-call's headerless 500, which hands back no
					// session cookie.
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
		// keyed by an IP read from a header; see ARCHITECTURE.md § Autenticação for
		// what that costs until #21 puts a proxy in front.
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
}
