import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Server } from "node:http";
import { join } from "node:path";
import {
	healthResponseSchema,
	problemDetailsSchema,
	PROJECT_NOT_FOUND,
} from "@bluprint/shared";
import { Body, Controller, Get, INestApplication, Post } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Session, UserSession } from "@thallesp/nestjs-better-auth";
import { eq } from "drizzle-orm";
import { Client, Pool } from "pg";
import request from "supertest";
import { z } from "zod";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { createDatabase, DATABASE, type Database } from "../db/database.module";
import { applyMigrations, migrationsFolder } from "../db/migrator";
import {
	member,
	organization,
	project,
	projectMember,
	session,
} from "../db/schema";

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

const SESSION_TOKEN = "better-auth.session_token";
const SESSION_DATA = "better-auth.session_data";
const EIGHT_HOURS = 8 * 60 * 60;
const ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

let app: INestApplication;
let server: Server;
let db: Database;
let forwardedFor = 1;

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
	db = app.get<Database>(DATABASE);

	const email = `${randomUUID()}@example.com`;
	signedIn = request.agent(server);
	signUpResponse = await signedIn
		.post(SIGN_UP)
		.send({ email, password: PASSWORD, name: "Engenheira de Obra" });
	expect(signUpResponse.status).toBe(200);
	account = {
		email,
		userId: authUserSchema.parse(signUpResponse.body).user.id,
	};
});

afterAll(async () => {
	await app.close();
});

function setCookieLines(res: request.Response): string[] {
	const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
	return raw ?? [];
}

function sessionCookie(res: request.Response): string {
	const cookie = setCookieLines(res).find((line) =>
		line.includes(`${SESSION_TOKEN}=`),
	);
	expect(cookie).toBeDefined();
	return cookie as string;
}

function cookiePair(line: string): string {
	return line.split(";")[0] ?? "";
}

function isCacheCookie(pair: string): boolean {
	const name = pair.split("=")[0] ?? "";
	return name === SESSION_DATA || name.startsWith(`${SESSION_DATA}.`);
}

function cookieHeader(res: request.Response, cache: boolean): string {
	return setCookieLines(res)
		.map(cookiePair)
		.filter((pair) => cache || !isCacheCookie(pair))
		.join("; ");
}

function freshIp(): string {
	forwardedFor += 1;
	return `10.212.0.${forwardedFor}`;
}

async function signUp(name: string) {
	const email = `${randomUUID()}@example.com`;
	const res = await request(server)
		.post(SIGN_UP)
		.set("X-Forwarded-For", freshIp())
		.send({ email, password: PASSWORD, name });
	expect(res.status).toBe(200);
	return {
		email,
		userId: authUserSchema.parse(res.body).user.id,
		res,
	};
}

async function withClient<T>(
	database: string,
	run: (client: Client) => Promise<T>,
): Promise<T> {
	const url = new URL(process.env.DATABASE_URL!);
	url.pathname = `/${database}`;
	const client = new Client({ connectionString: url.toString() });
	await client.connect();
	try {
		return await run(client);
	} finally {
		await client.end();
	}
}

async function boot(databaseUrl: string): Promise<{
	server: Server;
	close: () => Promise<void>;
}> {
	const pool = new Pool({ connectionString: databaseUrl });
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
		controllers: [ProbeController],
	})
		.overrideProvider(DATABASE)
		.useValue(createDatabase(pool))
		.compile();
	const booted = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(booted);
	await booted.init();
	return {
		server: booted.getHttpServer() as Server,
		close: async () => {
			await booted.close();
			await pool.end();
		},
	};
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

	test("keeps the session cookie alive for 8 hours", () => {
		expect(sessionCookie(signUpResponse)).toContain(`Max-Age=${EIGHT_HOURS}`);
	});

	test("keeps the session token out of reach of page JavaScript", () => {
		expect(sessionCookie(signUpResponse)).toContain("HttpOnly");
	});

	test("ignores isPlatformAdmin sent in the payload", async () => {
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

describe("session cookie", () => {
	test("keeps the session when a request arrives inside 8 hours", async () => {
		const signed = await signUp("Quem Continua");
		const createdAt = new Date(Date.now() - 9 * 60 * 60 * 1000);
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
		await db
			.update(session)
			.set({ createdAt, updatedAt: createdAt, expiresAt })
			.where(eq(session.userId, signed.userId));
		const before = await db.query.session.findFirst({
			where: eq(session.userId, signed.userId),
		});

		const probe = await request(server)
			.get("/api/probe")
			.set("Cookie", cookieHeader(signed.res, false));

		expect(probe.status).toBe(200);
		expect(probeIdentitySchema.parse(probe.body).userId).toBe(signed.userId);
		const after = await db.query.session.findFirst({
			where: eq(session.userId, signed.userId),
		});
		expect(after?.token).toBe(before?.token);
		expect(after?.createdAt.getTime()).toBeLessThan(
			Date.now() - EIGHT_HOURS * 1000,
		);
		const extended = after?.expiresAt.getTime() ?? 0;
		expect(extended).toBeGreaterThan(Date.now() + EIGHT_HOURS * 1000 - 60_000);
		expect(extended).toBeLessThan(Date.now() + EIGHT_HOURS * 1000 + 60_000);
	});

	test("answers 401 when the session cookie has been idle for 8 hours", async () => {
		const signed = await signUp("Quem Parou");
		await db
			.update(session)
			.set({ expiresAt: new Date(Date.now() - 1000) })
			.where(eq(session.userId, signed.userId));

		const probe = await request(server)
			.get("/api/probe")
			.set("Cookie", cookieHeader(signed.res, false));

		expect(probe.status).toBe(401);
		expect(problemDetailsSchema.parse(probe.body).code).toBe("UNAUTHORIZED");
	});

	test("keeps the session cookie cache after the row is deleted, then answers 401", async () => {
		const signed = await signUp("Cache Ainda Vale");
		expect(
			setCookieLines(signed.res).some((line) =>
				line.includes(`${SESSION_DATA}=`),
			),
		).toBe(true);
		await db.delete(session).where(eq(session.userId, signed.userId));

		const cached = await request(server)
			.get("/api/probe")
			.set("Cookie", cookieHeader(signed.res, true));

		expect(cached.status).toBe(200);
		expect(probeIdentitySchema.parse(cached.body).userId).toBe(signed.userId);

		const after = await request(server)
			.get("/api/probe")
			.set("Cookie", cookieHeader(signed.res, false));

		expect(after.status).toBe(401);
		expect(problemDetailsSchema.parse(after.body).code).toBe("UNAUTHORIZED");
	});

	test("answers 404 PROJECT_NOT_FOUND on the next request after removal from the project, with the session cookie cache still valid", async () => {
		const owner = await signUp("Dona da Obra");
		const person = await signUp("Removida da Obra");
		expect(
			setCookieLines(person.res).some((line) =>
				line.includes(`${SESSION_DATA}=`),
			),
		).toBe(true);
		const ownerMembership = await db.query.member.findFirst({
			where: eq(member.userId, owner.userId),
		});
		const personMembership = await db.query.member.findFirst({
			where: eq(member.userId, person.userId),
		});
		await db
			.delete(organization)
			.where(eq(organization.id, personMembership!.organizationId));
		await db.insert(member).values({
			organizationId: ownerMembership!.organizationId,
			userId: person.userId,
			role: "assistant",
		});
		const [created] = await db
			.insert(project)
			.values({
				organizationId: ownerMembership!.organizationId,
				name: "Casa Moinhos",
			})
			.returning({ id: project.id });
		await db.insert(projectMember).values({
			projectId: created!.id,
			userId: person.userId,
			role: "assistant",
		});
		const path = `/api/projects/${created!.id}`;
		const cookies = cookieHeader(person.res, true);

		const before = await request(server).get(path).set("Cookie", cookies);
		expect(before.status).toBe(200);

		await db
			.delete(projectMember)
			.where(eq(projectMember.userId, person.userId));

		const after = await request(server).get(path).set("Cookie", cookies);

		expect(after.status).toBe(404);
		expect(problemDetailsSchema.parse(after.body).code).toBe(PROJECT_NOT_FOUND);
	});

	test("signing out ends only that session cookie", async () => {
		const signed = await signUp("Dois Aparelhos");
		const other = await request(server)
			.post(SIGN_IN)
			.set("X-Forwarded-For", freshIp())
			.send({ email: signed.email, password: PASSWORD });
		expect(other.status).toBe(200);

		const out = await request(server)
			.post("/api/auth/sign-out")
			.set("Origin", ORIGIN)
			.set("Cookie", cookieHeader(signed.res, true))
			.send({});

		expect(out.status).toBe(200);
		const cleared = setCookieLines(out).filter((line) =>
			line.includes("Max-Age=0"),
		);
		expect(cleared.some((line) => line.startsWith(`${SESSION_TOKEN}=`))).toBe(
			true,
		);
		expect(cleared.some((line) => line.startsWith(`${SESSION_DATA}=`))).toBe(
			true,
		);

		const gone = await request(server)
			.get("/api/probe")
			.set("Cookie", cookieHeader(signed.res, false));
		expect(gone.status).toBe(401);

		const still = await request(server)
			.get("/api/probe")
			.set("Cookie", cookieHeader(other, true));
		expect(still.status).toBe(200);
		expect(probeIdentitySchema.parse(still.body).userId).toBe(signed.userId);
	});

	test("ends every existing session once when the deploy migration runs", async () => {
		const journal = JSON.parse(
			readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"),
		) as { entries: { tag: string; when: number }[] };
		const wipe = journal.entries.find(
			(entry) => entry.tag === "0012_end_existing_sessions",
		);
		expect(wipe).toBeDefined();

		const scratch = `bluprint_session_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
		const url = new URL(process.env.DATABASE_URL!);
		url.pathname = `/${scratch}`;
		const scratchUrl = url.toString();
		await withClient("postgres", (client) =>
			client.query(`CREATE DATABASE "${scratch}"`),
		);
		try {
			await applyMigrations(scratchUrl);
			const booted = await boot(scratchUrl);
			try {
				const signUpOn = async (name: string) => {
					const res = await request(booted.server)
						.post(SIGN_UP)
						.set("X-Forwarded-For", freshIp())
						.send({
							email: `${randomUUID()}@example.com`,
							password: PASSWORD,
							name,
						});
					expect(res.status).toBe(200);
					return cookieHeader(res, false);
				};
				const probe = (cookie: string) =>
					request(booted.server).get("/api/probe").set("Cookie", cookie);

				const before = await signUpOn("Sessão Antiga");
				expect((await probe(before)).status).toBe(200);

				await withClient(scratch, (client) =>
					client.query(
						"DELETE FROM drizzle.__drizzle_migrations WHERE created_at = $1",
						[wipe!.when],
					),
				);
				await applyMigrations(scratchUrl);

				const ended = await probe(before);
				expect(ended.status).toBe(401);
				expect(problemDetailsSchema.parse(ended.body).code).toBe(
					"UNAUTHORIZED",
				);

				const after = await signUpOn("Sessão Nova");
				await applyMigrations(scratchUrl);
				expect((await probe(after)).status).toBe(200);
			} finally {
				await booted.close();
			}
		} finally {
			await withClient("postgres", (client) =>
				client.query(`DROP DATABASE IF EXISTS "${scratch}" WITH (FORCE)`),
			);
		}
	}, 60_000);
});

describe("route protection", () => {
	test("refuses an undecorated route to an anonymous caller", async () => {
		const res = await request(server).get("/api/probe");

		expect(res.status).toBe(401);
		expect(problemDetailsSchema.parse(res.body).code).toBe("UNAUTHORIZED");
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

describe("signing in", () => {
	test("rejects the wrong password, with Better Auth's code as problem details", async () => {
		const res = await request(server)
			.post(SIGN_IN)
			.send({ email: account.email, password: "senha-errada-123" });

		expect(res.status).toBe(401);
		expect(res.headers["set-cookie"]).toBeUndefined();
		expect(res.headers["content-type"]).toContain("application/problem+json");
		expect(problemDetailsSchema.parse(res.body)).toMatchObject({
			code: "INVALID_EMAIL_OR_PASSWORD",
			instance: SIGN_IN,
		});
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

	test("refuses a cookie-bearing request from an untrusted origin", async () => {
		const res = await signedIn
			.post(SIGN_IN)
			.set("Origin", "http://evil.example.com")
			.send({ email: account.email, password: PASSWORD });

		expect(res.status).toBe(403);
		expect(problemDetailsSchema.parse(res.body).code).toBe("INVALID_ORIGIN");
	});

	test("blocks repeated attempts before they can guess", async () => {
		let limited: request.Response | undefined;

		for (let attempt = 0; attempt < 12 && !limited; attempt++) {
			const res = await request(server)
				.post(SIGN_IN)
				.send({ email: account.email, password: "senha-errada-123" });
			if (res.status === 429) limited = res;
		}

		expect(limited).toBeDefined();
		expect(problemDetailsSchema.parse(limited?.body).code).toBe(
			"TOO_MANY_REQUESTS",
		);
		expect(limited?.headers["x-retry-after"]).toBeDefined();
	}, 60_000);
});
