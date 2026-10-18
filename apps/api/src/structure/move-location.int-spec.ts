import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	LOCATION_NOT_FOUND,
	locationRefSchema,
	type NewLocation,
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	type Structure,
	structureSchema,
} from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "../db/database.module";
import {
	member,
	organization,
	project,
	projectMember,
	user,
} from "../db/schema";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";

type Person = { userId: string; agent: ReturnType<typeof request.agent> };

let app: INestApplication;
let server: Server;
let db: Database;

let admin: Person;
let manager: Person;
let assistant: Person;
let unlinked: Person;
let outsider: Person;
let organizationId: string;

const structurePath = (projectId: string) =>
	`/api/projects/${projectId}/structure`;

async function signUp(name: string): Promise<Person> {
	const agent = request.agent(server);
	const res = await agent
		.post(SIGN_UP)
		.send({ email: `${randomUUID()}@example.com`, password: PASSWORD, name });
	return { userId: (res.body as { user: { id: string } }).user.id, agent };
}

async function organizationOf(userId: string): Promise<string> {
	const found = await db.query.member.findFirst({
		where: eq(member.userId, userId),
	});
	return found!.organizationId;
}

async function joinOrganization(
	person: Person,
	orgId: string,
	role: "manager" | "assistant",
) {
	await db
		.delete(organization)
		.where(eq(organization.id, await organizationOf(person.userId)));
	await db
		.insert(member)
		.values({ organizationId: orgId, userId: person.userId, role });
}

async function newProject(
	reservedUnits: number,
	status: "active" | "delivered" = "active",
): Promise<string> {
	const [created] = await db
		.insert(project)
		.values({ organizationId, name: "Casa Moinhos", reservedUnits, status })
		.returning({ id: project.id });
	await db.insert(projectMember).values([
		{ projectId: created!.id, userId: manager.userId, role: "manager" },
		{ projectId: created!.id, userId: assistant.userId, role: "assistant" },
	]);
	return created!.id;
}

const entry = (
	parentId: string | null,
	type: NewLocation["type"],
	name: string,
	position = 0,
): NewLocation => ({ id: randomUUID(), parentId, type, name, position });

function building({
	towerName = "Torre A",
	towerPosition = 0,
	floors = 2,
	unitsPerFloor = 2,
}: {
	towerName?: string;
	towerPosition?: number;
	floors?: number;
	unitsPerFloor?: number;
} = {}) {
	const tower = entry(null, "tower", towerName, towerPosition);
	const locations: NewLocation[] = [tower];
	for (let f = 1; f <= floors; f++) {
		const floor = entry(tower.id, "floor", `${f}º andar`, f - 1);
		locations.push(floor);
		for (let u = 1; u <= unitsPerFloor; u++) {
			locations.push(
				entry(floor.id, "unit", `${f}${String(u).padStart(2, "0")}`, u - 1),
			);
		}
	}
	return { tower, locations };
}

async function create(
	person: Person,
	projectId: string,
	locations: NewLocation[],
) {
	return person.agent.post(structurePath(projectId)).send({ locations });
}

async function readStructure(projectId: string) {
	const res = await admin.agent.get(structurePath(projectId));
	return structureSchema.parse(res.body);
}

const locationPath = (projectId: string, locationId: string) =>
	`/api/projects/${projectId}/locations/${locationId}`;

async function twoTowers(projectId: string) {
	const a = building({ towerName: "Torre A", floors: 2, unitsPerFloor: 2 });
	const b = building({
		towerName: "Torre B",
		towerPosition: 1,
		floors: 2,
		unitsPerFloor: 2,
	});
	const hall = entry(a.tower.id, "common_area", "Salão de festas", 2);
	const guarita = entry(null, "common_area", "Guarita", 2);
	const res = await create(manager, projectId, [
		...a.locations,
		...b.locations,
		hall,
		guarita,
	]);
	expect(res.status).toBe(201);
	const byName = (name: string, type: NewLocation["type"], parent?: string) =>
		[...a.locations, ...b.locations, hall, guarita].find(
			(row) =>
				row.name === name &&
				row.type === type &&
				(parent === undefined || row.parentId === parent),
		)!;
	return { a, b, hall, guarita, byName };
}

function problemOf(body: unknown) {
	return problemDetailsSchema.parse(body);
}

beforeAll(async () => {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	server = app.getHttpServer() as Server;
	db = app.get<Database>(DATABASE);

	admin = await signUp("Admin da Construtora");
	manager = await signUp("Gerente Vinculada");
	assistant = await signUp("Assistente Vinculado");
	unlinked = await signUp("Gerente Sem Vínculo");
	outsider = await signUp("Pessoa de Outra Construtora");

	organizationId = await organizationOf(admin.userId);
	await joinOrganization(manager, organizationId, "manager");
	await joinOrganization(assistant, organizationId, "assistant");
	await joinOrganization(unlinked, organizationId, "manager");
});

afterAll(async () => {
	for (const { userId } of [admin, manager, assistant, unlinked, outsider]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await app.close();
});

function move(
	person: Person,
	projectId: string,
	locationId: string,
	direction: unknown,
) {
	return person.agent
		.post(`${locationPath(projectId, locationId)}/move`)
		.send({ direction });
}

const floorNames = (structure: Structure, tower = 0) =>
	structure.towers[tower]!.floors.map((floor) => floor.name);

const unitNames = (structure: Structure, floor = 0, tower = 0) =>
	structure.towers[tower]!.floors[floor]!.units.map((unit) => unit.name);

describe("POST /api/projects/:id/locations/:locationId/move", () => {
	describe("a floor", () => {
		it("moves a floor up by one floor higher and answers the location", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const first = byName("1º andar", "floor", a.tower.id);

			const res = await move(manager, projectId, first.id, "up");

			expect(res.status).toBe(200);
			expect(locationRefSchema.parse(res.body)).toEqual({
				id: first.id,
				type: "floor",
				name: "1º andar",
			});
			expect(floorNames(await readStructure(projectId))).toEqual([
				"2º andar",
				"1º andar",
			]);
		});

		it("moves a floor down by one floor lower", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const second = byName("2º andar", "floor", a.tower.id);

			const res = await move(manager, projectId, second.id, "down");

			expect(res.status).toBe(200);
			expect(floorNames(await readStructure(projectId))).toEqual([
				"2º andar",
				"1º andar",
			]);
		});

		it("does nothing for the highest floor going up and the lowest going down", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const before = await readStructure(projectId);

			const top = await move(
				manager,
				projectId,
				byName("2º andar", "floor", a.tower.id).id,
				"up",
			);
			const bottom = await move(
				manager,
				projectId,
				byName("1º andar", "floor", a.tower.id).id,
				"down",
			);

			expect(top.status).toBe(200);
			expect(bottom.status).toBe(200);
			expect(await readStructure(projectId)).toEqual(before);
		});

		it("keeps the units of the floor and the floors of the other tower where they were", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const before = await readStructure(projectId);

			await move(
				manager,
				projectId,
				byName("1º andar", "floor", a.tower.id).id,
				"up",
			);

			const after = await readStructure(projectId);
			expect(after.towers[1]).toEqual(before.towers[1]);
			expect(unitNames(after, 0)).toEqual(["201", "202"]);
			expect(unitNames(after, 1)).toEqual(["101", "102"]);
			expect(after.towers[0]!.commonAreas).toEqual(
				before.towers[0]!.commonAreas,
			);
			expect(after.counts).toEqual(before.counts);
		});
	});

	describe("a unit", () => {
		it("moves a unit up to an earlier place and down to a later one", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const floor = byName("1º andar", "floor", a.tower.id);
			const second = byName("102", "unit", floor.id);

			const up = await move(manager, projectId, second.id, "up");
			expect(unitNames(await readStructure(projectId))).toEqual(["102", "101"]);
			const down = await move(manager, projectId, second.id, "down");

			expect([up.status, down.status]).toEqual([200, 200]);
			expect(unitNames(await readStructure(projectId))).toEqual(["101", "102"]);
		});

		it("does nothing for the first unit going up and the last going down", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const floor = byName("1º andar", "floor", a.tower.id);
			const before = await readStructure(projectId);

			const first = await move(
				manager,
				projectId,
				byName("101", "unit", floor.id).id,
				"up",
			);
			const last = await move(
				manager,
				projectId,
				byName("102", "unit", floor.id).id,
				"down",
			);

			expect([first.status, last.status]).toEqual([200, 200]);
			expect(await readStructure(projectId)).toEqual(before);
		});

		it("swaps with the unit next to it, passing over the common areas between them", async () => {
			const projectId = await newProject(100);
			const tower = entry(null, "tower", "Torre A");
			const floor = entry(tower.id, "floor", "1º andar");
			const first = entry(floor.id, "unit", "101", 0);
			const hall = entry(floor.id, "common_area", "Hall", 1);
			const last = entry(floor.id, "unit", "102", 2);
			await create(manager, projectId, [tower, floor, first, hall, last]);

			await move(manager, projectId, last.id, "up");

			const structure = await readStructure(projectId);
			expect(unitNames(structure)).toEqual(["102", "101"]);
			expect(structure.towers[0]!.floors[0]!.commonAreas).toEqual([
				{ id: hall.id, name: "Hall" },
			]);
		});

		it("keeps a unit moved to an earlier place there after a reload of the location", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const floor = byName("1º andar", "floor", a.tower.id);

			await move(manager, projectId, byName("102", "unit", floor.id).id, "up");

			const res = await admin.agent.get(locationPath(projectId, floor.id));
			expect(
				(res.body as { children: { name: string }[] }).children.map(
					(child) => child.name,
				),
			).toEqual(["102", "101"]);
		});

		it("moves a unit added at the end after a removal", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const floor = byName("1º andar", "floor", a.tower.id);
			const removed = await manager.agent.delete(
				locationPath(projectId, byName("101", "unit", floor.id).id),
			);
			const added = {
				id: randomUUID(),
				parentId: floor.id,
				type: "unit" as const,
				name: "103",
			};
			expect(removed.status).toBe(200);
			expect((await create(manager, projectId, [added])).status).toBe(201);

			await move(manager, projectId, added.id, "up");
			expect(unitNames(await readStructure(projectId))).toEqual(["103", "102"]);

			await move(manager, projectId, added.id, "down");
			expect(unitNames(await readStructure(projectId))).toEqual(["102", "103"]);
		});
	});

	describe("other kinds", () => {
		it("moves a tower among the towers of the project", async () => {
			const projectId = await newProject(100);
			const { b } = await twoTowers(projectId);

			const res = await move(manager, projectId, b.tower.id, "up");

			expect(res.status).toBe(200);
			expect(
				(await readStructure(projectId)).towers.map((tower) => tower.name),
			).toEqual(["Torre B", "Torre A"]);
		});
	});

	describe("who may move", () => {
		it.each([
			["the admin of the organization", () => admin],
			["a manager of the project", () => manager],
			["an assistant of the project", () => assistant],
		])("lets %s move", async (_label, who) => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);

			const res = await move(
				who(),
				projectId,
				byName("1º andar", "floor", a.tower.id).id,
				"up",
			);

			expect(res.status).toBe(200);
			expect(floorNames(await readStructure(projectId))).toEqual([
				"2º andar",
				"1º andar",
			]);
		});

		it("answers 404 PROJECT_NOT_FOUND to someone without a membership, to another organization and to a project that does not exist", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const first = byName("1º andar", "floor", a.tower.id);

			const results = [
				await move(unlinked, projectId, first.id, "up"),
				await move(outsider, projectId, first.id, "up"),
				await move(admin, randomUUID(), first.id, "up"),
			];

			for (const res of results) {
				expect(res.status).toBe(404);
				expect(problemOf(res.body).code).toBe(PROJECT_NOT_FOUND);
			}
			expect(floorNames(await readStructure(projectId))).toEqual([
				"1º andar",
				"2º andar",
			]);
		});

		it("answers 401 without a session", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const res = await request(server)
				.post(`${locationPath(projectId, a.tower.id)}/move`)
				.send({ direction: "up" });

			expect(res.status).toBe(401);
		});
	});

	it("answers 404 LOCATION_NOT_FOUND for a location of another project and for one that does not exist", async () => {
		const mine = await newProject(100);
		const other = await newProject(100);
		const { a } = await twoTowers(other);

		for (const id of [a.tower.id, randomUUID()]) {
			const res = await move(manager, mine, id, "up");

			expect(res.status).toBe(404);
			expect(problemOf(res.body).code).toBe(LOCATION_NOT_FOUND);
		}
	});

	it.each([
		["a direction that is not up or down", { direction: "left" }],
		["no direction", {}],
	])("answers 400 for %s", async (_label, body) => {
		const projectId = await newProject(100);
		const { a } = await twoTowers(projectId);

		const res = await manager.agent
			.post(`${locationPath(projectId, a.tower.id)}/move`)
			.send(body);

		expect(res.status).toBe(400);
	});

	it("answers 409 PROJECT_DELIVERED to everyone and moves nothing", async () => {
		const projectId = await newProject(100);
		const { a, byName } = await twoTowers(projectId);
		await db
			.update(project)
			.set({ status: "delivered" })
			.where(eq(project.id, projectId));

		for (const who of [admin, manager, assistant]) {
			const res = await move(
				who,
				projectId,
				byName("1º andar", "floor", a.tower.id).id,
				"up",
			);
			expect(res.status).toBe(409);
			expect(problemOf(res.body).code).toBe(PROJECT_DELIVERED);
		}
		expect(floorNames(await readStructure(projectId))).toEqual([
			"1º andar",
			"2º andar",
		]);
	});

	it("moves the project's last activity", async () => {
		const projectId = await newProject(100);
		const { a, byName } = await twoTowers(projectId);
		const before = new Date("2026-01-01T00:00:00Z");
		await db
			.update(project)
			.set({ lastActivityAt: before })
			.where(eq(project.id, projectId));

		await move(
			manager,
			projectId,
			byName("1º andar", "floor", a.tower.id).id,
			"up",
		);

		const [row] = await db
			.select({ at: project.lastActivityAt })
			.from(project)
			.where(eq(project.id, projectId));
		expect(row!.at.getTime()).toBeGreaterThan(before.getTime());
	});
});
