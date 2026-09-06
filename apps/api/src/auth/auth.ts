import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { Database } from "../db/database.module";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface AuthOptions {
	secret: string;
	baseURL: string;
	trustedOrigins: string[];
}

export function createAuth(db: Database, options: AuthOptions) {
	return betterAuth({
		database: drizzleAdapter(db, { provider: "pg" }),
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
