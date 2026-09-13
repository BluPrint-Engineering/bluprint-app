import { Server } from "node:http";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { OpenAPIObject, OperationObject } from "@nestjs/swagger";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "./app";
import { AppModule } from "./app.module";

const HTTP_METHODS = [
	"get",
	"put",
	"post",
	"delete",
	"options",
	"head",
	"patch",
	"trace",
] as const;

let app: INestApplication;
let server: Server;
let document: OpenAPIObject;

beforeAll(async () => {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	server = app.getHttpServer() as Server;

	const res = await request(server).get("/api/docs/openapi.json");
	document = res.body as OpenAPIObject;
});

afterAll(async () => {
	await app.close();
});

function allOperations(): [string, string, OperationObject][] {
	const operations: [string, string, OperationObject][] = [];
	for (const [path, pathItem] of Object.entries(document.paths)) {
		for (const method of HTTP_METHODS) {
			const operation = pathItem[method];
			if (operation) operations.push([path, method, operation]);
		}
	}
	return operations;
}

describe("GET /api/docs/openapi.json", () => {
	test("is served without a session", async () => {
		const res = await request(server).get("/api/docs/openapi.json");

		expect(res.status).toBe(200);
	});

	test("every $ref points at a schema the document defines", () => {
		const refs = JSON.stringify(document).match(/"\$ref":"[^"]+"/g) ?? [];
		const dangling = refs
			.map((ref) => ref.slice('"$ref":"#/components/schemas/'.length, -1))
			.filter((name) => !document.components?.schemas?.[name]);

		expect(dangling).toEqual([]);
	});

	test("every error response is problem+json", () => {
		const offenders = allOperations().flatMap(([path, method, operation]) =>
			Object.entries(operation.responses)
				.filter(([status]) => Number(status) >= 400)
				.filter(
					([, response]) =>
						!response ||
						!("content" in response) ||
						!response.content?.["application/problem+json"],
				)
				.map(([status]) => `${method.toUpperCase()} ${path} ${status}`),
		);

		expect(offenders).toEqual([]);
	});

	test("every operation has a summary, a tag, an id and a documented 2xx response", () => {
		const incomplete = allOperations()
			.filter(
				([, , operation]) =>
					!operation.summary ||
					!operation.operationId ||
					!operation.tags?.length ||
					!Object.keys(operation.responses).some((status) =>
						status.startsWith("2"),
					),
			)
			.map(([path, method]) => `${method.toUpperCase()} ${path}`);

		expect(incomplete).toEqual([]);
	});

	test("every route outside /api/auth documents at least one error response", () => {
		const undocumented = allOperations()
			.filter(([path]) => !path.startsWith("/api/auth/"))
			.filter(
				([, , operation]) =>
					!Object.keys(operation.responses).some(
						(status) => status.startsWith("4") || status.startsWith("5"),
					),
			)
			.map(([path, method]) => `${method.toUpperCase()} ${path}`);

		expect(undocumented).toEqual([]);
	});

	test("health opts out of the global session requirement", () => {
		expect(document.paths["/api/health"]?.get?.security).toEqual([{}]);
	});

	test("projects inherits the global session requirement", () => {
		expect(document.paths["/api/projects"]?.get?.security).toBeUndefined();
		expect(document.security).toEqual([{ session: [] }]);
	});
});

describe("GET /api/docs", () => {
	test("serves the Swagger UI page", async () => {
		const res = await request(server).get("/api/docs");

		expect(res.status).toBe(200);
		expect(res.type).toBe("text/html");
	});
});

describe("documented /api/auth/* routes", () => {
	test.each([
		["/api/auth/sign-up/email", "post"],
		["/api/auth/sign-in/email", "post"],
		["/api/auth/get-session", "get"],
	] as const)("%s still exists on the real app", async (path, method) => {
		// Any status but 404: an empty body answers 400 or 429, depending on the
		// rate limit other suites already spent.
		const res = await request(server)[method](path).send({});

		expect(res.status).not.toBe(404);
	});
});
