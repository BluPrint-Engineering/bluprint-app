import { createHash, randomUUID } from "node:crypto";
import { Server } from "node:http";
import { problemDetailsSchema } from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../../app";
import { DATABASE, Database } from "../../db/database.module";
import { user } from "../../db/schema";

const SIGN_UP = "/api/auth/sign-up/email";
const CHANGE_PASSWORD = "/api/auth/change-password";
const STRONG_PASSWORD = "prumo-nivel-esquadro";
const BREACHED_PASSWORD = "andaime-vazado-na-rede";

let app: INestApplication;
let server: Server;
let db: Database;
let signedIn: ReturnType<typeof request.agent>;
let accountId: string;

const BOOT_TIMEOUT = 30_000;

/** Answers the HIBP range API as if only BREACHED_PASSWORD had ever leaked. */
function stubPwnedPasswords() {
	const hash = createHash("sha1")
		.update(BREACHED_PASSWORD)
		.digest("hex")
		.toUpperCase();
	const realFetch = globalThis.fetch;
	return jest.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
		const url = input instanceof Request ? input.url : String(input);
		if (!url.startsWith("https://api.pwnedpasswords.com/range/")) {
			return realFetch(input, init);
		}
		const body = url.endsWith(hash.slice(0, 5))
			? `${hash.slice(5)}:42\r\n0000000000000000000000000000000000A:0`
			: "0000000000000000000000000000000000A:0";
		return Promise.resolve(new Response(body, { status: 200 }));
	});
}

function signUp(password: string, name = "Engenheira de Obra") {
	return request(server)
		.post(SIGN_UP)
		.send({ email: `${randomUUID()}@example.com`, password, name });
}

beforeAll(async () => {
	// test/setup-env.ts turns the lookup off for every other suite; this one owns it, against a stub
	process.env.PASSWORD_BREACH_CHECK = "true";
	stubPwnedPasswords();
	// dynamic import: ConfigModule.forRoot snapshots process.env when app.module loads
	const { AppModule } = await import("../../app.module.js");

	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	server = app.getHttpServer() as Server;
	db = app.get<Database>(DATABASE);

	signedIn = request.agent(server);
	const res = await signedIn.post(SIGN_UP).send({
		email: `${randomUUID()}@example.com`,
		password: STRONG_PASSWORD,
		name: "Engenheira de Obra",
	});
	expect(res.status).toBe(200);
	accountId = (res.body as { user: { id: string } }).user.id;
}, BOOT_TIMEOUT);

afterAll(async () => {
	jest.restoreAllMocks();
	await db.delete(user).where(eq(user.id, accountId));
	await app.close();
});

// /sign-up/email allows 5 attempts per minute and beforeAll spends one: four tests at most here
describe("signing up", () => {
	test("rejects a password built on the product's name", async () => {
		const res = await signUp("bluprint123");

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe(
			"PASSWORD_TOO_GUESSABLE",
		);
	});

	test("rejects a password built on the person's own name", async () => {
		const res = await signUp("Marcela#2026", "Marcela Duarte");

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe(
			"PASSWORD_TOO_GUESSABLE",
		);
	});

	test("rejects a password longer than 64 characters", async () => {
		const res = await signUp("prumo-nivel-esquadro-".repeat(4));

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("PASSWORD_TOO_LONG");
	});

	test("rejects a password found in a breach", async () => {
		const res = await signUp(BREACHED_PASSWORD);

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe(
			"PASSWORD_COMPROMISED",
		);
	});
});

describe("changing the password", () => {
	test("applies the same blocklist, using the signed-in person's name", async () => {
		const res = await signedIn
			.post(CHANGE_PASSWORD)
			.set("Origin", process.env.CORS_ORIGIN ?? "http://localhost:5173")
			.send({
				currentPassword: STRONG_PASSWORD,
				newPassword: "engenheira-2026",
			});

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe(
			"PASSWORD_TOO_GUESSABLE",
		);
	});
});
