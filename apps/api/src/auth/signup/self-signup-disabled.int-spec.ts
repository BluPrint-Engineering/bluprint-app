import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../../app";
import { DATABASE, Database } from "../../db/database.module";
import { user } from "../../db/schema";

const SIGN_UP = "/api/auth/sign-up/email";

let app: INestApplication;
let server: Server;
let db: Database;

const BOOT_TIMEOUT = 30_000;

beforeAll(async () => {
	process.env.ALLOW_SELF_SIGNUP = "false";
	const { AppModule } = await import("../../app.module.js");

	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	server = app.getHttpServer() as Server;
	db = app.get<Database>(DATABASE);
}, BOOT_TIMEOUT);

afterAll(async () => {
	await app.close();
});

describe("with self-signup switched off", () => {
	test("refuses to open an account, and creates nothing", async () => {
		const email = `${randomUUID()}@example.com`;

		const res = await request(server)
			.post(SIGN_UP)
			.send({ email, password: "senha-de-obra-123", name: "Engenheira" });

		expect(res.status).toBe(403);
		expect((res.body as { code: string }).code).toBe("SELF_SIGNUP_DISABLED");
		expect(res.headers["set-cookie"]).toBeUndefined();
		expect(
			await db.query.user.findFirst({ where: eq(user.email, email) }),
		).toBeUndefined();
	});

	test("keeps the rest of the API answering", async () => {
		const res = await request(server).get("/api/health");

		expect(res.status).toBe(200);
	});
});
