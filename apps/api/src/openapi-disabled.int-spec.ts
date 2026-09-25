import { Server } from "node:http";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "./app";

let app: INestApplication;
let server: Server;

// see auth/signup/self-signup-disabled.int-spec.ts for BOOT_TIMEOUT and the dynamic import
const BOOT_TIMEOUT = 30_000;

beforeAll(async () => {
	process.env.API_DOCS_ENABLED = "false";
	const { AppModule } = await import("./app.module.js");

	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	server = app.getHttpServer() as Server;
}, BOOT_TIMEOUT);

afterAll(async () => {
	await app.close();
});

describe("with API_DOCS_ENABLED=false", () => {
	test("mounts neither the OpenAPI document nor the Swagger UI", async () => {
		const json = await request(server).get("/api/docs/openapi.json");
		const ui = await request(server).get("/api/docs");

		expect(json.status).toBe(404);
		expect(ui.status).toBe(404);
	});

	test("keeps the rest of the API answering", async () => {
		const res = await request(server).get("/api/health");

		expect(res.status).toBe(200);
	});
});
