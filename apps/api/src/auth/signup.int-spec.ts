import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "../db/database.module";
import { license, member, user } from "../db/schema";
import * as provisioning from "./signup-provisioning";

const SIGN_UP = "/api/auth/sign-up/email";
const SIGN_IN = "/api/auth/sign-in/email";
const PASSWORD = "senha-de-obra-123";

let app: INestApplication;
let server: Server;
let db: Database;

/** Shared because sign-up is rate limited at 5/min: an account per test would
 * spend the budget the forced-failure test needs. */
let account: { email: string; userId: string };

beforeAll(async () => {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	server = app.getHttpServer() as Server;
	db = app.get<Database>(DATABASE);

	const email = `${randomUUID()}@example.com`;
	const res = await request(server)
		.post(SIGN_UP)
		.send({ email, password: PASSWORD, name: "Engenheira de Obra" });

	expect(res.status).toBe(200);
	account = { email, userId: (res.body as { user: { id: string } }).user.id };
});

afterAll(async () => {
	await db.delete(user).where(eq(user.id, account.userId));
	await app.close();
});

async function tenantOf(userId: string) {
	const links = await db.query.member.findMany({
		where: eq(member.userId, userId),
	});
	const licenses = links[0]
		? await db.query.license.findMany({
				where: eq(license.organizationId, links[0].organizationId),
			})
		: [];
	return { links, licenses };
}

describe("signing up", () => {
	test("creates one organization and one admin membership (RF-121)", async () => {
		const { links } = await tenantOf(account.userId);

		expect(links).toHaveLength(1);
		expect(links[0]?.role).toBe("admin");
	});

	test("creates three free licenses for that organization (RF-110)", async () => {
		const { licenses } = await tenantOf(account.userId);

		expect(licenses).toHaveLength(3);
	});

	test("leaves the organization with that one member and nobody else", async () => {
		const { links } = await tenantOf(account.userId);
		const everyone = await db.query.member.findMany({
			where: eq(member.organizationId, links[0]!.organizationId),
		});

		expect(everyone).toHaveLength(1);
	});
});

describe("signing in again", () => {
	test("does not provision a second time", async () => {
		const res = await request(server)
			.post(SIGN_IN)
			.send({ email: account.email, password: PASSWORD });
		expect(res.status).toBe(200);

		const { links, licenses } = await tenantOf(account.userId);

		expect(links).toHaveLength(1);
		expect(licenses).toHaveLength(3);
	});
});

describe("when provisioning fails", () => {
	// The forced error prints a `# SERVER_ERROR:` stack — that is the failure
	// being injected, not the test failing.
	test("leaves no user behind, and no session", async () => {
		const email = `${randomUUID()}@example.com`;
		jest
			.spyOn(provisioning, "provisionTenant")
			.mockRejectedValueOnce(new Error("provisioning is down"));

		const failed = await request(server)
			.post(SIGN_UP)
			.send({ email, password: PASSWORD, name: "Engenheira de Obra" });

		expect(failed.status).toBeGreaterThanOrEqual(400);
		expect(failed.headers["set-cookie"]).toBeUndefined();

		// The same address signing up cleanly is the black-box proof: a surviving
		// user row would answer 422, not 200.
		const retry = await request(server)
			.post(SIGN_UP)
			.send({ email, password: PASSWORD, name: "Engenheira de Obra" });

		expect(retry.status).toBe(200);
		await db
			.delete(user)
			.where(eq(user.id, (retry.body as { user: { id: string } }).user.id));
	});
});
