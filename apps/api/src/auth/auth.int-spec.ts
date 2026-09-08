import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import { healthResponseSchema } from "@bluprint/shared";
import { Body, Controller, Get, INestApplication, Post } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Session, UserSession } from "@thallesp/nestjs-better-auth";
import request from "supertest";
import { z } from "zod";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";

/** Deliberately undecorated: a route written without a thought about auth must
 * still refuse an anonymous caller. */
@Controller("probe")
class ProbeController {
	@Get()
	whoAmI(@Session() session: UserSession): { userId: string } {
		return { userId: session.user.id };
	}

	@Post()
	echo(@Body() body: unknown): { received: unknown } {
		return { received: body };
	}
}

const authUserSchema = z.object({
	user: z.object({
		id: z.string(),
		email: z.email(),
		emailVerified: z.boolean(),
		isPlatformAdmin: z.boolean(),
	}),
});
const probeIdentitySchema = z.object({ userId: z.string() });
const probeEchoSchema = z.object({ received: z.unknown() });

const SIGN_UP = "/api/auth/sign-up/email";
const SIGN_IN = "/api/auth/sign-in/email";
const PASSWORD = "senha-de-obra-123";

let app: INestApplication;
let server: Server;

/** Shared because sign-up and sign-in are rate limited: an account per test
 * would spend the budget the brute-force test needs. */
let account: { email: string; userId: string };
let signUpResponse: request.Response;
let signedIn: ReturnType<typeof request.agent>;

beforeAll(async () => {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
		controllers: [ProbeController],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	server = app.getHttpServer() as Server;

	const email = `${randomUUID()}@example.com`;
	signedIn = request.agent(server);
	signUpResponse = await signedIn
		.post(SIGN_UP)
		.send({ email, password: PASSWORD, name: "Engenheira de Obra" });
	// Asserted before the parse: a `.env` without ALLOW_SELF_SIGNUP answers 403,
	// and the Zod issue about a missing `user` key never mentions sign-up.
	expect(signUpResponse.status).toBe(200);
	account = {
		email,
		userId: authUserSchema.parse(signUpResponse.body).user.id,
	};
});

afterAll(async () => {
	await app.close();
});

function sessionCookie(res: request.Response): string {
	const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
	const cookie = (raw ?? []).find((c) => c.includes("session_token"));
	expect(cookie).toBeDefined();
	return cookie as string;
}

describe("signing up", () => {
	test("creates the account and returns a session, with no verification step", async () => {
		expect(signUpResponse.status).toBe(200);
		const signedUp = authUserSchema.parse(signUpResponse.body);
		expect(signedUp.user.email).toBe(account.email);
		expect(signedUp.user.emailVerified).toBe(false);

		const session = await signedIn.get("/api/auth/get-session");

		expect(session.status).toBe(200);
		expect(authUserSchema.parse(session.body).user.email).toBe(account.email);
	});

	test("keeps the session cookie alive for 90 days (RNF-04)", () => {
		const ninetyDaysInSeconds = 60 * 60 * 24 * 90;

		expect(sessionCookie(signUpResponse)).toContain(
			`Max-Age=${ninetyDaysInSeconds}`,
		);
	});

	test("keeps the session token out of reach of page JavaScript", () => {
		expect(sessionCookie(signUpResponse)).toContain("HttpOnly");
	});

	test("ignores isPlatformAdmin sent in the payload (RF-101, RF-105)", async () => {
		const res = await request(server)
			.post(SIGN_UP)
			.send({
				email: `${randomUUID()}@example.com`,
				password: PASSWORD,
				name: "Alguém Ambicioso",
				isPlatformAdmin: true,
			});

		expect(res.status).toBe(200);
		expect(authUserSchema.parse(res.body).user.isPlatformAdmin).toBe(false);
	});
});

describe("route protection", () => {
	test("refuses an undecorated route to an anonymous caller", async () => {
		const res = await request(server).get("/api/probe");

		expect(res.status).toBe(401);
		expect(res.body).toEqual({ error: "Unauthorized" });
	});

	test("lets a signed-in caller through", async () => {
		const res = await signedIn.get("/api/probe");

		expect(res.status).toBe(200);
		expect(probeIdentitySchema.parse(res.body).userId).toBe(account.userId);
	});

	test("keeps health anonymous", async () => {
		const res = await request(server).get("/api/health");

		expect(res.status).toBe(200);
		expect(healthResponseSchema.parse(res.body).status).toBe("ok");
	});
});

describe("body parsing on our own routes", () => {
	test("still parses JSON, with Nest's own parser disabled", async () => {
		const res = await signedIn
			.post("/api/probe")
			.send({ name: "Casa Moinhos" });

		expect(res.status).toBe(201);
		expect(probeEchoSchema.parse(res.body).received).toEqual({
			name: "Casa Moinhos",
		});
	});
});

// Last, and in one block: the limiter counts every attempt in this process, so
// anything running after would inherit a spent budget.
describe("signing in", () => {
	test("rejects the wrong password", async () => {
		const res = await request(server)
			.post(SIGN_IN)
			.send({ email: account.email, password: "senha-errada-123" });

		expect(res.status).toBe(401);
		expect(res.headers["set-cookie"]).toBeUndefined();
	});

	test("accepts the right password and hands back a session", async () => {
		const agent = request.agent(server);

		const res = await agent
			.post(SIGN_IN)
			.send({ email: account.email, password: PASSWORD });

		expect(res.status).toBe(200);
		const session = await agent.get("/api/auth/get-session");
		expect(authUserSchema.parse(session.body).user.email).toBe(account.email);
	});

	// Only fires on a cookie-bearing request — the shape of a CSRF attempt — so a
	// fresh client's first call always looks like it passes.
	test("refuses a cookie-bearing request from an untrusted origin", async () => {
		const res = await signedIn
			.post(SIGN_IN)
			.set("Origin", "http://evil.example.com")
			.send({ email: account.email, password: PASSWORD });

		expect(res.status).toBe(403);
	});

	test("blocks repeated attempts before they can guess", async () => {
		const statuses: number[] = [];

		for (let attempt = 0; attempt < 12; attempt++) {
			const res = await request(server)
				.post(SIGN_IN)
				.send({ email: account.email, password: "senha-errada-123" });
			statuses.push(res.status);
			if (res.status === 429) break;
		}

		expect(statuses).toContain(429);
	}, 60_000);
});
