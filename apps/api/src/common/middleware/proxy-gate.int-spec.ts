import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import { healthResponseSchema, problemDetailsSchema } from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../../app";

const PROXY_SECRET = "proxy-secret-for-the-gate-integration-test";
const SIGN_IN = "/api/auth/sign-in/email";

let app: INestApplication;
let server: Server;

beforeAll(async () => {
	process.env.PROXY_SECRET = PROXY_SECRET;
	const { AppModule } = await import("../../app.module.js");

	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	server = app.getHttpServer() as Server;
}, 30_000);

afterAll(async () => {
	await app.close();
});

describe("without the proxy secret", () => {
	test.each([["/api/projects"], ["/api/auth/get-session"]])(
		"refuses GET %s as problem details",
		async (path) => {
			const res = await request(server).get(path);

			expect(res.status).toBe(403);
			expect(res.headers["content-type"]).toContain("application/problem+json");
			expect(problemDetailsSchema.parse(res.body)).toMatchObject({
				code: "NOT_FROM_PROXY",
				instance: path,
			});
		},
	);

	test("refuses a wrong secret", async () => {
		const res = await request(server)
			.get("/api/auth/get-session")
			.set("X-Proxy-Secret", `${PROXY_SECRET}-forged`);

		expect(res.status).toBe(403);
		expect(problemDetailsSchema.parse(res.body).code).toBe("NOT_FROM_PROXY");
	});

	test("refuses a sign-in attempt before Better Auth sees it", async () => {
		const res = await request(server)
			.post(SIGN_IN)
			.send({ email: `${randomUUID()}@example.com`, password: "qualquer" });

		expect(res.status).toBe(403);
		expect(problemDetailsSchema.parse(res.body).code).toBe("NOT_FROM_PROXY");
	});

	test("still answers the health check", async () => {
		const res = await request(server).get("/api/health");

		expect(res.status).toBe(200);
		expect(healthResponseSchema.parse(res.body).status).toBe("ok");
	});
});

describe("with the proxy secret", () => {
	test("lets the request through", async () => {
		const res = await request(server)
			.get("/api/auth/get-session")
			.set("X-Proxy-Secret", PROXY_SECRET);

		expect(res.status).toBe(200);
	});

	test("rate-limits sign-in per client IP, not for everyone at once", async () => {
		const failSignIn = (clientIp: string) =>
			request(server)
				.post(SIGN_IN)
				.set("X-Proxy-Secret", PROXY_SECRET)
				.set("X-Client-IP", clientIp)
				.send({
					email: `${randomUUID()}@example.com`,
					password: "senha-errada-123",
				});

		let limited: request.Response | undefined;
		for (let attempt = 0; attempt < 12 && !limited; attempt++) {
			const res = await failSignIn("203.0.113.7");
			if (res.status === 429) limited = res;
		}
		const otherPerson = await failSignIn("198.51.100.23");

		expect(limited).toBeDefined();
		expect(otherPerson.status).toBe(401);
		expect(problemDetailsSchema.parse(otherPerson.body).code).toBe(
			"INVALID_EMAIL_OR_PASSWORD",
		);
	}, 60_000);
});
