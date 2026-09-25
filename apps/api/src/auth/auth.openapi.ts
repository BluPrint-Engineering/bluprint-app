import {
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	PASSWORD_TOO_GUESSABLE_CODE,
} from "@bluprint/shared";
import {
	ComponentsObject,
	getSchemaPath,
	PathsObject,
	ResponseObject,
	SchemaObject,
} from "@nestjs/swagger";
import {
	PROBLEM_JSON,
	problemDetails,
} from "../common/problems/problem-details";
import { ProblemDetailsDto } from "../common/problems/problem-details.dto";

// hand-documented: @nestjs/swagger never scans Better Auth's routes; openapi.int-spec.ts fails on a renamed path
const userSchema: SchemaObject = {
	type: "object",
	description: "The account created or authenticated.",
	properties: {
		id: { type: "string" },
		name: { type: "string" },
		email: { type: "string", format: "email" },
		emailVerified: {
			type: "boolean",
			description:
				"Always false. Verification is out until a transactional email provider exists (docs/adr/0010-self-hosted-better-auth.md).",
		},
		image: { type: "string", nullable: true },
		createdAt: { type: "string", format: "date-time" },
		updatedAt: { type: "string", format: "date-time" },
		isPlatformAdmin: {
			type: "boolean",
			description:
				"Always false from this route: the field is `input: false` on the server, so a caller-supplied value is silently ignored.",
		},
	},
	required: [
		"id",
		"name",
		"email",
		"emailVerified",
		"createdAt",
		"updatedAt",
		"isPlatformAdmin",
	],
};

function problemResponse(
	description: string,
	status: number,
	examples: Record<string, { code?: string; detail: string }>,
	instance: string,
): ResponseObject {
	return {
		description,
		content: {
			[PROBLEM_JSON]: {
				schema: { $ref: getSchemaPath(ProblemDetailsDto) },
				examples: Object.fromEntries(
					Object.entries(examples).map(([name, { code, detail }]) => [
						name,
						{
							summary: code ?? name,
							value: problemDetails({ status, code, detail, instance }),
						},
					]),
				),
			},
		},
	};
}

const tooManyAttempts = (instance: string) =>
	problemResponse(
		"More than 5 attempts in the same minute, per IP. `X-Retry-After` holds the seconds left.",
		429,
		{ rateLimited: { detail: "Too many requests. Please try again later." } },
		instance,
	);

const SIGN_UP = "/api/auth/sign-up/email";
const SIGN_IN = "/api/auth/sign-in/email";

export const authSchemas: ComponentsObject["schemas"] = {
	BetterAuthUser: userSchema,
};

export const authPaths: PathsObject = {
	[SIGN_UP]: {
		post: {
			tags: ["Auth"],
			operationId: "auth_signUpEmail",
			summary: "Sign up (email and password)",
			description:
				"Creates the account and returns the session in the same response — there is no email verification step. It is the only way an account is created today; the finished product creates accounts from invitations (#11).\n\n" +
				"**The same request creates the whole tenant.** Along with the user come that person's organization, a membership with default role `admin`, and three free licenses, seeded server-side in the same request — no second client call does this.",
			security: [],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								email: { type: "string", format: "email" },
								password: {
									type: "string",
									minLength: PASSWORD_MIN_LENGTH,
									maxLength: PASSWORD_MAX_LENGTH,
									description:
										"Refused when easy to guess (a common password, a sequence, or one whose core is BluPrint's name or the person's own name or e-mail) or found in a breach on Have I Been Pwned. No composition rules (docs/adr/0052-password-policy.md).",
								},
								name: { type: "string" },
							},
							required: ["email", "password", "name"],
						},
						example: {
							email: "lucamandelli@example.com",
							password: "luca-de-obra-123",
							name: "Luca CTO",
						},
					},
				},
			},
			responses: {
				"200": {
					description:
						"Account created; the tenant is seeded and the session cookie is set.",
					headers: {
						"Set-Cookie": {
							description:
								"`better-auth.session_token`, `httpOnly`, `SameSite=Lax`, `Max-Age=7776000` (90 days).",
							schema: { type: "string" },
						},
					},
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									token: { type: "string" },
									user: { $ref: "#/components/schemas/BetterAuthUser" },
								},
								required: ["token", "user"],
							},
						},
					},
				},
				"400": problemResponse(
					"The body failed Better Auth's own validation, or the password breaks the policy: outside 8–64 characters, easy to guess, or breached.",
					400,
					{
						passwordTooShort: {
							code: "PASSWORD_TOO_SHORT",
							detail: "Password too short",
						},
						passwordTooLong: {
							code: "PASSWORD_TOO_LONG",
							detail: "Password too long",
						},
						passwordTooGuessable: {
							code: PASSWORD_TOO_GUESSABLE_CODE,
							detail: "Password is too easy to guess",
						},
						passwordCompromised: {
							code: "PASSWORD_COMPROMISED",
							detail:
								"The password you entered has been compromised. Please choose a different password.",
						},
						invalidBody: {
							code: "VALIDATION_FAILED",
							detail: "[body.email] Invalid email address",
						},
					},
					SIGN_UP,
				),
				"403": problemResponse(
					"Two unrelated causes share this status — read `code` before touching the `Origin` header. `SELF_SIGNUP_DISABLED`: `ALLOW_SELF_SIGNUP` is off on the server (docs/adr/0011-self-signup-is-scaffolding.md). `MISSING_OR_NULL_ORIGIN`: a cookie-bearing request with no `Origin`, what a non-browser client sends.",
					403,
					{
						selfSignupDisabled: {
							code: "SELF_SIGNUP_DISABLED",
							detail: "Self-service sign-up is disabled",
						},
						missingOrNullOrigin: {
							code: "MISSING_OR_NULL_ORIGIN",
							detail: "Missing or null Origin",
						},
					},
					SIGN_UP,
				),
				"422": problemResponse(
					"Email already registered.",
					422,
					{
						userAlreadyExists: {
							code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
							detail: "User already exists. Use another email.",
						},
					},
					SIGN_UP,
				),
				"429": tooManyAttempts(SIGN_UP),
				"500": problemResponse(
					"The breach check could not reach Have I Been Pwned, or it answered an error, so no account was created; retry later. No `code`: the detail varies. It fails closed on purpose (docs/adr/0052-password-policy.md).",
					500,
					{
						breachCheckUnreachable: {
							detail: "Failed to check password. Please try again later.",
						},
						breachCheckAnsweredError: {
							detail: "Failed to check password. Status: 503",
						},
					},
					SIGN_UP,
				),
			},
		},
	},
	[SIGN_IN]: {
		post: {
			tags: ["Auth"],
			operationId: "auth_signInEmail",
			summary: "Sign in (email and password)",
			description:
				"Authenticates with email and password and returns a new session, writing the cookie over any previous one.",
			security: [],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								email: { type: "string", format: "email" },
								password: { type: "string" },
							},
							required: ["email", "password"],
						},
						example: {
							email: "lucamandelli@example.com",
							password: "luca-de-obra-123",
						},
					},
				},
			},
			responses: {
				"200": {
					description: "Authenticated; the session cookie is renewed.",
					headers: {
						"Set-Cookie": {
							description:
								"`better-auth.session_token`, same shape as sign-up's.",
							schema: { type: "string" },
						},
					},
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									redirect: { type: "boolean" },
									token: { type: "string" },
									user: { $ref: "#/components/schemas/BetterAuthUser" },
								},
								required: ["redirect", "token", "user"],
							},
						},
					},
				},
				"401": problemResponse(
					"Wrong password, or an email that does not exist.",
					401,
					{
						invalidCredentials: {
							code: "INVALID_EMAIL_OR_PASSWORD",
							detail: "Invalid email or password",
						},
					},
					SIGN_IN,
				),
				"403": problemResponse(
					"A cookie-bearing request with a missing, `null` or untrusted `Origin` — what a non-browser client or a sandboxed iframe sends.",
					403,
					{
						missingOrNullOrigin: {
							code: "MISSING_OR_NULL_ORIGIN",
							detail: "Missing or null Origin",
						},
						invalidOrigin: { code: "INVALID_ORIGIN", detail: "Invalid origin" },
					},
					SIGN_IN,
				),
				"429": tooManyAttempts(SIGN_IN),
			},
		},
	},
	"/api/auth/get-session": {
		get: {
			tags: ["Auth"],
			operationId: "auth_getSession",
			summary: "Current session",
			description:
				"Reads the session from the cookie and returns the user and their session — the only way the web app finds out who is logged in, since the cookie is `httpOnly`. With no session it answers 200 with `null`, not 401: this is a Better Auth route, not a product one.",
			security: [],
			responses: {
				"200": {
					description:
						"A valid session, or `null` with no cookie or an expired one.",
					content: {
						"application/json": {
							schema: {
								nullable: true,
								type: "object",
								properties: {
									session: {
										type: "object",
										properties: {
											id: { type: "string" },
											token: { type: "string" },
											userId: { type: "string" },
											expiresAt: { type: "string", format: "date-time" },
											createdAt: { type: "string", format: "date-time" },
											updatedAt: { type: "string", format: "date-time" },
											ipAddress: { type: "string" },
											userAgent: { type: "string" },
										},
									},
									user: { $ref: "#/components/schemas/BetterAuthUser" },
								},
							},
							examples: {
								noSession: { summary: "No cookie, or expired", value: null },
							},
						},
					},
				},
			},
		},
	},
};
