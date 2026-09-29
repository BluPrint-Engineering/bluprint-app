import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { problemDetailsSchema } from "@bluprint/shared";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";

const PROXY_SECRET = "s".repeat(40);
const SIGN_UP = "/api/auth/sign-up/email";
const SIGN_IN = "/api/auth/sign-in/email";
const PASSWORD = "senha-de-obra-123";
const BOOT_TIMEOUT = 30_000;

let app: INestApplication;
let server: Server;
let email: string;

beforeAll(async () => {
	process.env.PROXY_SECRET = PROXY_SECRET;
	const { AppModule } = await import("../app.module.js");

	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	server = app.getHttpServer() as Server;

	email = `${randomUUID()}@example.com`;
	const signUp = await request(server)
		.post(SIGN_UP)
		.set("X-Proxy-Secret", PROXY_SECRET)
		.send({ email, password: PASSWORD, name: "Engenheira de Obra" });
	expect(signUp.status).toBe(200);
}, BOOT_TIMEOUT);

afterAll(async () => {
	await app.close();
	delete process.env.PROXY_SECRET;
});

function signInFrom(ip: string) {
	return request(server)
		.post(SIGN_IN)
		.set("X-Proxy-Secret", PROXY_SECRET)
		.set("X-Client-IP", ip)
		.send({ email, password: "senha-errada-123" });
}

describe("the proxy gate", () => {
	test("refuses an auth route reached without the secret", async () => {
		const res = await request(server)
			.post(SIGN_IN)
			.send({ email, password: PASSWORD });

		expect(res.status).toBe(403);
		expect(res.headers["content-type"]).toContain("application/problem+json");
		expect(problemDetailsSchema.parse(res.body)).toMatchObject({
			status: 403,
			code: "PROXY_REQUIRED",
			instance: SIGN_IN,
		});
		expect(res.headers["set-cookie"]).toBeUndefined();
	});

	test("refuses a Nest route reached without the secret before authentication runs", async () => {
		const res = await request(server).get("/api/projects");

		expect(res.status).toBe(403);
		expect(problemDetailsSchema.parse(res.body).code).toBe("PROXY_REQUIRED");
	});

	test("refuses a wrong secret", async () => {
		const res = await request(server)
			.post(SIGN_IN)
			.set("X-Proxy-Secret", "w".repeat(PROXY_SECRET.length))
			.send({ email, password: PASSWORD });

		expect(res.status).toBe(403);
		expect(problemDetailsSchema.parse(res.body).code).toBe("PROXY_REQUIRED");
	});

	test("refuses a secret of another length", async () => {
		const res = await request(server)
			.get("/api/projects")
			.set("X-Proxy-Secret", "short");

		expect(res.status).toBe(403);
	});

	test("lets the host health check through without the secret", async () => {
		const res = await request(server).get("/api/health");

		expect(res.status).toBe(200);
	});

	test("does not exempt other methods or paths under health", async () => {
		const post = await request(server).post("/api/health");
		const child = await request(server).get("/api/health/anything");

		expect(post.status).toBe(403);
		expect(child.status).toBe(403);
	});

	test("answers a request that carries the secret", async () => {
		const res = await request(server)
			.post(SIGN_IN)
			.set("X-Proxy-Secret", PROXY_SECRET)
			.send({ email, password: PASSWORD });

		expect(res.status).toBe(200);
	});
});

describe("rate limit behind the gate", () => {
	test("counts attempts per client IP, not per API", async () => {
		let limited: request.Response | undefined;
		for (let attempt = 0; attempt < 12 && !limited; attempt++) {
			const res = await signInFrom("203.0.113.1");
			if (res.status === 429) limited = res;
		}
		expect(limited).toBeDefined();

		const otherPerson = await signInFrom("203.0.113.2");

		expect(otherPerson.status).toBe(401);
		expect(problemDetailsSchema.parse(otherPerson.body).code).toBe(
			"INVALID_EMAIL_OR_PASSWORD",
		);
	}, 60_000);
});
