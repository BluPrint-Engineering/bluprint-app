import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, getSchemaPath, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { authPaths, authSchemas } from "./auth/auth.openapi";
import { exampleFor } from "./common/problems/api-error-responses.decorator";
import { PROBLEM_JSON } from "./common/problems/problem-details";
import { ProblemDetailsDto } from "./common/problems/problem-details.dto";
import { Env } from "./lib/env";

const DOCS_PATH = "docs";
const SESSION_COOKIE = "better-auth.session_token";

const DESCRIPTION = `
Interactive documentation for the API, generated from the same Zod schemas
that validate every request and response (docs/adr/0003-shared-zod-via-nestjs-zod.md).

## Before running

1. \`docker compose up -d --wait\` — Postgres, once per session.
2. \`.env\` with \`BETTER_AUTH_SECRET\` and \`ALLOW_SELF_SIGNUP=true\`. Without the
   second, sign-up answers 403 and this looks broken — self-signup is
   scaffolding and defaults to off (docs/adr/0011-self-signup-is-scaffolding.md).
3. \`bun run dev\` — starts the API on \`:3000\` and the web app on \`:5173\`.

Open this page at \`http://localhost:5173/api/docs\`, not \`:3000\`: same origin
as the web app, so **Try it out** sends the session cookie and the browser
sets \`Origin\` itself.

## Suggested order

Sign up → Current session → My projects. **Try it out** on sign-up stores the
session cookie in your browser for the rest of the page automatically.

That cookie outlives this page and is shared by every port on \`localhost\`, so
the web app's session reaches Try it out too. The **Authorize** padlock does not
control it: to call a route anonymously, use a private window or delete
\`better-auth.session_token\` in DevTools → Application → Cookies.

## Errors

Every non-2xx response, auth routes included, is RFC 9457 problem details
served as \`application/problem+json\`. Branch on \`code\` — stable and
machine-readable — never on \`title\` or \`detail\`, which are English text for
whoever reads the response. A \`VALIDATION_FAILED\` also lists each invalid
input in \`errors\`, with a JSON Pointer to it. See
docs/adr/0047-errors-are-rfc-9457-problem-details.md.

## What is not here

Better Auth generates dozens of routes beyond sign-up, sign-in and session —
password reset, email verification, and more. They are inert until a
transactional email provider exists (#11), and documenting them here would be
maintenance with no reader.
`.trim();

/** Why off in production: docs/adr/0046-openapi-via-nestjs-swagger.md */
export function apiDocsEnabled(config: ConfigService<Env, true>): boolean {
	const flag = config.get("API_DOCS_ENABLED", { infer: true });
	return flag ?? process.env.NODE_ENV !== "production";
}

/** Bypasses Nest's `AuthGuard` and needs no CSP exception, both by
 * construction — see docs/adr/0046-openapi-via-nestjs-swagger.md. */
export function setupApiDocs(app: INestApplication): void {
	const config = new DocumentBuilder()
		.setTitle("BluPrint API")
		.setDescription(DESCRIPTION)
		.setVersion("1.0")
		.addTag("Health", "Whether the API and the database are reachable.")
		.addTag(
			"Auth",
			"Better Auth routes, mounted outside Nest's router. Only the happy path is documented — sign-up, sign-in and session.",
		)
		.addTag("Projects", "Projects visible to the signed-in caller.")
		.addCookieAuth(
			SESSION_COOKIE,
			{
				type: "apiKey",
				in: "cookie",
				description:
					"Set by sign-up or sign-in. `httpOnly`, so no JavaScript ever reads or sets it directly — Try it out relies on the browser sending it.",
			},
			"session",
		)
		.addSecurityRequirements("session")
		.addGlobalResponse({
			status: 500,
			description: "Internal Server Error",
			content: {
				[PROBLEM_JSON]: {
					schema: { $ref: getSchemaPath(ProblemDetailsDto) },
					example: exampleFor(500),
				},
			},
		})
		.build();

	const document = SwaggerModule.createDocument(app, config, {
		extraModels: [ProblemDetailsDto],
		operationIdFactory: (controllerKey, methodKey) =>
			`${controllerKey.replace(/Controller$/, "").toLowerCase()}_${methodKey}`,
	});

	// The scanner never sees Better Auth's routes: see auth.openapi.ts.
	document.paths = { ...document.paths, ...authPaths };
	document.components = {
		...document.components,
		schemas: { ...document.components?.schemas, ...authSchemas },
	};

	SwaggerModule.setup(DOCS_PATH, app, cleanupOpenApiDoc(document), {
		useGlobalPrefix: true,
		jsonDocumentUrl: `${DOCS_PATH}/openapi.json`,
		raw: ["json"],
	});
}
