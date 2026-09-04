import { Server } from "node:http";
import { healthResponseSchema } from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { configureApp } from "./app";
import { AppModule } from "./app.module";

let app: INestApplication;
let server: Server;

beforeAll(async () => {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication();
	configureApp(app);
	await app.init();

	// getHttpServer() is typed `any`; narrow once here instead of at every call.
	server = app.getHttpServer() as Server;
});

afterAll(async () => {
	await app.close();
});

describe("GET /health", () => {
	test("returns ok status with the database up, matching the shared schema", async () => {
		const res = await request(server).get("/health");

		expect(res.status).toBe(200);
		const body = healthResponseSchema.parse(res.body);
		expect(body.status).toBe("ok");
		expect(body.database).toBe("up");
	});

	test("includes verbose details when requested", async () => {
		const res = await request(server).get("/health?verbose=true");

		expect(res.status).toBe(200);
		const body = healthResponseSchema.parse(res.body);
		expect(body.verbose?.runtime).toContain("node");
	});

	test("rejects an invalid verbose value", async () => {
		const res = await request(server).get("/health?verbose=maybe");

		expect(res.status).toBe(400);
	});
});

describe("unknown routes", () => {
	test("returns a 404 error", async () => {
		const res = await request(server).get("/no-such-route");

		expect(res.status).toBe(404);
		expect(res.body).toEqual({ error: "Not Found" });
	});
});
