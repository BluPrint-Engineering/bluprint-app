import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	LOCATION_NOT_FOUND,
	PROJECT_NOT_FOUND,
	locationDetailSchema,
	problemDetailsSchema,
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
import { location } from "./location.entity";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";

const anyId = expect.any(String) as string;

type Person = { userId: string; agent: ReturnType<typeof request.agent> };

let app: INestApplication;
let server: Server;
let db: Database;

let admin: Person;
let manager: Person;
let assistant: Person;
let unlinked: Person;
let outsider: Person;

let projectId: string;
let otherProjectId: string;
let emptyProjectId: string;
let outsiderProjectId: string;

let towerA: string;
let towerB: string;
let ground: string;
let ninth: string;
let unit901: string;
let guarita: string;
let salao: string;
let hall: string;
let otherProjectTower: string;
let bigProjectId: string;

const structurePath = (id: string) => `/api/projects/${id}/structure`;
const locationPath = (id: string, locationId: string) =>
	`/api/projects/${id}/locations/${locationId}`;

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
	organizationId: string,
	role: "manager" | "assistant",
) {
	await db
		.delete(organization)
		.where(eq(organization.id, await organizationOf(person.userId)));
	await db
		.insert(member)
		.values({ organizationId, userId: person.userId, role });
}

async function insert(
	values: {
		projectId: string;
		parentId?: string | null;
		type: "tower" | "floor" | "unit" | "common_area";
		name: string;
		position: number;
	}[],
) {
	return db.insert(location).values(values).returning({ id: location.id });
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

	const organizationId = await organizationOf(admin.userId);
	await joinOrganization(manager, organizationId, "manager");
	await joinOrganization(assistant, organizationId, "assistant");
	await joinOrganization(unlinked, organizationId, "manager");

	const projects = await db
		.insert(project)
		.values([
			{ organizationId, name: "Casa Moinhos", reservedUnits: 600 },
			{ organizationId, name: "Torre Ipê", reservedUnits: 10 },
			{ organizationId, name: "Galpão Sul" },
			{ organizationId, name: "Obra Grande", reservedUnits: 600 },
		])
		.returning({ id: project.id });
	projectId = projects[0]!.id;
	otherProjectId = projects[1]!.id;
	emptyProjectId = projects[2]!.id;
	bigProjectId = projects[3]!.id;

	await db.insert(projectMember).values([
		{ projectId, userId: manager.userId, role: "manager" },
		{ projectId, userId: assistant.userId, role: "assistant" },
		{ projectId: otherProjectId, userId: manager.userId, role: "manager" },
		{ projectId: bigProjectId, userId: manager.userId, role: "manager" },
	]);

	const [outsiderProject] = await db
		.insert(project)
		.values({
			organizationId: await organizationOf(outsider.userId),
			name: "Casa Moinhos",
		})
		.returning({ id: project.id });
	outsiderProjectId = outsiderProject!.id;

	const towers = await insert([
		{ projectId, type: "tower", name: "Torre A", position: 0 },
		{ projectId, type: "tower", name: "Torre B", position: 1 },
		{ projectId, type: "common_area", name: "Guarita", position: 0 },
	]);
	towerA = towers[0]!.id;
	towerB = towers[1]!.id;
	guarita = towers[2]!.id;

	const floors = await insert([
		{ projectId, parentId: towerA, type: "floor", name: "Térreo", position: 0 },
		{
			projectId,
			parentId: towerA,
			type: "floor",
			name: "9º andar",
			position: 1,
		},
	]);
	ground = floors[0]!.id;
	ninth = floors[1]!.id;

	const inside = await insert([
		{
			projectId,
			parentId: towerA,
			type: "common_area",
			name: "Salão de festas",
			position: 2,
		},
		{
			projectId,
			parentId: ground,
			type: "common_area",
			name: "Hall de entrada",
			position: 0,
		},
		{ projectId, parentId: ninth, type: "unit", name: "902", position: 1 },
		{ projectId, parentId: ninth, type: "unit", name: "901", position: 0 },
		{
			projectId,
			parentId: ninth,
			type: "common_area",
			name: "Hall",
			position: 2,
		},
	]);
	salao = inside[0]!.id;
	hall = inside[4]!.id;
	unit901 = inside[3]!.id;

	const [other] = await insert([
		{ projectId: otherProjectId, type: "tower", name: "Torre A", position: 0 },
	]);
	otherProjectTower = other!.id;

	const [bigTower] = await insert([
		{ projectId: bigProjectId, type: "tower", name: "Torre A", position: 0 },
	]);
	const bigFloors = await insert(
		Array.from({ length: 25 }, (_, i) => ({
			projectId: bigProjectId,
			parentId: bigTower!.id,
			type: "floor" as const,
			name: `${i + 1}º andar`,
			position: i,
		})),
	);
	await insert(
		bigFloors.flatMap((floor, floorIndex) =>
			Array.from({ length: 20 }, (_, unitIndex) => ({
				projectId: bigProjectId,
				parentId: floor.id,
				type: "unit" as const,
				name: String((floorIndex + 1) * 100 + unitIndex + 1),
				position: unitIndex,
			})),
		),
	);
});

afterAll(async () => {
	for (const { userId } of [admin, manager, assistant, unlinked, outsider]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await app.close();
});

describe("GET /api/projects/:id/structure", () => {
	test.each([
		["the admin", () => admin],
		["a manager of the project", () => manager],
		["an assistant of the project", () => assistant],
	])("%s reads the whole structure in stored order", async (_, who) => {
		const res = await who().agent.get(structurePath(projectId));

		expect(res.status).toBe(200);
		expect(structureSchema.parse(res.body)).toEqual({
			towers: [
				{
					id: towerA,
					name: "Torre A",
					floors: [
						{
							id: ground,
							name: "Térreo",
							units: [],
							commonAreas: [{ id: anyId, name: "Hall de entrada" }],
						},
						{
							id: ninth,
							name: "9º andar",
							units: [
								{ id: unit901, name: "901" },
								{ id: anyId, name: "902" },
							],
							commonAreas: [{ id: hall, name: "Hall" }],
						},
					],
					commonAreas: [{ id: salao, name: "Salão de festas" }],
				},
				{ id: towerB, name: "Torre B", floors: [], commonAreas: [] },
			],
			commonAreas: [{ id: guarita, name: "Guarita" }],
			counts: { towers: 2, floors: 2, units: 2, commonAreas: 4 },
		});
	});

	test("a project without structure answers an empty one", async () => {
		const res = await admin.agent.get(structurePath(emptyProjectId));

		expect(res.status).toBe(200);
		expect(structureSchema.parse(res.body)).toEqual({
			towers: [],
			commonAreas: [],
			counts: { towers: 0, floors: 0, units: 0, commonAreas: 0 },
		});
	});

	test("answers about 500 units in one response", async () => {
		const res = await manager.agent.get(structurePath(bigProjectId));

		expect(res.status).toBe(200);
		const structure = structureSchema.parse(res.body);
		expect(structure.counts).toMatchObject({
			towers: 1,
			floors: 25,
			units: 500,
		});
		expect(structure.towers[0]!.floors[24]!.units).toHaveLength(20);
	});

	test.each([
		["a manager without a membership on it", () => unlinked, () => projectId],
		["a person from another organization", () => outsider, () => projectId],
		["a project of another organization", () => admin, () => outsiderProjectId],
	])("answers PROJECT_NOT_FOUND to %s", async (_, who, id) => {
		const res = await who().agent.get(structurePath(id()));

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
	});

	test("answers PROJECT_NOT_FOUND to a project that does not exist", async () => {
		const res = await admin.agent.get(structurePath(randomUUID()));

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
	});

	test("refuses an id that is not a UUID", async () => {
		const res = await admin.agent.get(structurePath("not-a-uuid"));

		expect(res.status).toBe(400);
	});

	test("requires a session", async () => {
		const res = await request(server).get(structurePath(projectId));

		expect(res.status).toBe(401);
	});
});

describe("GET /api/projects/:id/locations/:locationId", () => {
	test("a floor lists its ancestors and its units and common areas in stored order", async () => {
		const res = await manager.agent.get(locationPath(projectId, ninth));

		expect(res.status).toBe(200);
		expect(locationDetailSchema.parse(res.body)).toEqual({
			id: ninth,
			type: "floor",
			name: "9º andar",
			ancestors: [{ id: towerA, type: "tower", name: "Torre A" }],
			children: [
				{ id: unit901, type: "unit", name: "901" },
				{ id: anyId, type: "unit", name: "902" },
				{ id: hall, type: "common_area", name: "Hall" },
			],
		});
	});

	test("a unit lists its floor and tower from the highest down, and has no children", async () => {
		const res = await assistant.agent.get(locationPath(projectId, unit901));

		expect(res.status).toBe(200);
		expect(locationDetailSchema.parse(res.body)).toEqual({
			id: unit901,
			type: "unit",
			name: "901",
			ancestors: [
				{ id: towerA, type: "tower", name: "Torre A" },
				{ id: ninth, type: "floor", name: "9º andar" },
			],
			children: [],
		});
	});

	test("a tower lists its floors and common areas and has no ancestors", async () => {
		const res = await admin.agent.get(locationPath(projectId, towerA));

		expect(res.status).toBe(200);
		expect(locationDetailSchema.parse(res.body)).toMatchObject({
			type: "tower",
			ancestors: [],
			children: [
				{ id: ground, type: "floor", name: "Térreo" },
				{ id: ninth, type: "floor", name: "9º andar" },
				{ id: salao, type: "common_area", name: "Salão de festas" },
			],
		});
	});

	test("a common area of the project has no ancestors", async () => {
		const res = await admin.agent.get(locationPath(projectId, guarita));

		expect(res.status).toBe(200);
		expect(locationDetailSchema.parse(res.body)).toMatchObject({
			type: "common_area",
			name: "Guarita",
			ancestors: [],
			children: [],
		});
	});

	test("answers LOCATION_NOT_FOUND to a location that does not exist", async () => {
		const res = await admin.agent.get(locationPath(projectId, randomUUID()));

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(LOCATION_NOT_FOUND);
	});

	test("answers LOCATION_NOT_FOUND to a location of another project, even one the caller sees", async () => {
		const res = await manager.agent.get(
			locationPath(projectId, otherProjectTower),
		);

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(LOCATION_NOT_FOUND);
	});

	test.each([
		["a manager without a membership on it", () => unlinked],
		["a person from another organization", () => outsider],
	])("answers PROJECT_NOT_FOUND to %s", async (_, who) => {
		const res = await who().agent.get(locationPath(projectId, ninth));

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
	});

	test("refuses a location id that is not a UUID", async () => {
		const res = await admin.agent.get(locationPath(projectId, "not-a-uuid"));

		expect(res.status).toBe(400);
	});
});
