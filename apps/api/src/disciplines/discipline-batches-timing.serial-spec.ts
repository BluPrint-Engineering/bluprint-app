import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "../db/database.module";
import { location, locationDiscipline } from "../db/schema";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";

let app: INestApplication;
let db: Database;
let admin: ReturnType<typeof request.agent>;

beforeAll(async () => {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();
	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();
	db = app.get<Database>(DATABASE);
	admin = request.agent(app.getHttpServer() as Server);
	const res = await admin.post(SIGN_UP).send({
		email: `${randomUUID()}@example.com`,
		password: PASSWORD,
		name: "Admin da Construtora",
	});
	expect(res.status).toBe(200);
});

afterAll(async () => {
	await app.close();
});

async function disciplineIdOf(
	projectId: string,
	name: string,
): Promise<string> {
	const res = await admin.get(`/api/projects/${projectId}/disciplines`);
	const items = (res.body as { items: { id: string; name: string }[] }).items;
	return items.find((item) => item.name === name)!.id;
}

describe("POST /api/projects/:id/discipline-batches timing", () => {
	test("applies a tower of 5,000 units and common areas naming every discipline within 2 seconds", async () => {
		const projectId = randomUUID();
		const created = await admin
			.post("/api/projects")
			.send({ id: projectId, name: "Casa Moinhos", units: 20 });
		expect(created.status).toBe(201);
		const towerId = randomUUID();
		const floors = Array.from({ length: 167 }, (_, index) => ({
			id: randomUUID(),
			name: `Andar ${index + 1}`,
		}));
		const rows: (typeof location.$inferInsert)[] = [
			{
				id: towerId,
				projectId,
				parentId: null,
				type: "tower" as const,
				name: "Torre A",
				position: 0,
			},
			...floors.map(({ id, name }, position) => ({
				id,
				projectId,
				parentId: towerId,
				type: "floor" as const,
				name,
				position,
			})),
		];
		const leaves = 5000;
		for (let index = 0; index < leaves; index += 1) {
			const floor = floors[index % floors.length]!;
			rows.push({
				id: randomUUID(),
				projectId,
				parentId: floor.id,
				type: index % 100 === 0 ? ("common_area" as const) : ("unit" as const),
				name: `Local ${index}`,
				position: index,
			});
		}
		for (let start = 0; start < rows.length; start += 1000) {
			await db.insert(location).values(rows.slice(start, start + 1000));
		}
		const extras: string[] = [];
		for (let index = 0; index < 10; index += 1) {
			const id = randomUUID();
			const res = await admin
				.post(`/api/projects/${projectId}/disciplines`)
				.send({ id, name: `Extra ${index}`, appliesEverywhere: true });
			expect(res.status).toBe(201);
			extras.push(id);
		}
		const hidraulica = await disciplineIdOf(projectId, "Hidráulica");
		const eletrica = await disciplineIdOf(projectId, "Elétrica");

		const startedAt = performance.now();
		const res = await admin
			.post(`/api/projects/${projectId}/discipline-batches`)
			.send({
				target: { type: "tower", locationId: towerId },
				off: [hidraulica, eletrica, ...extras],
				on: [],
			});
		const elapsedMs = performance.now() - startedAt;

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ locations: leaves });
		const exceptions = await db
			.select()
			.from(locationDiscipline)
			.where(eq(locationDiscipline.projectId, projectId));
		expect(exceptions).toHaveLength(leaves * 12);
		expect(elapsedMs).toBeLessThan(2000);
	}, 60_000);
});
