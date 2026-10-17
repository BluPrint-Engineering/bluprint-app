import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	LOCATION_NAME_TAKEN,
	LOCATION_NOT_FOUND,
	type NewLocation,
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	locationRefSchema,
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

function rename(
	person: Person,
	projectId: string,
	locationId: string,
	name: string,
) {
	return person.agent.patch(locationPath(projectId, locationId)).send({ name });
}

async function storedName(locationId: string) {
	const [row] = await db
		.select({ name: location.name })
		.from(location)
		.where(eq(location.id, locationId));
	return row!.name;
}

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

describe("PATCH /api/projects/:id/locations/:locationId", () => {
	it("renames a tower, a floor, a unit and a common area and answers the new name", async () => {
		const projectId = await newProject(100);
		const { a, hall, guarita, byName } = await twoTowers(projectId);
		const floor = byName("1º andar", "floor", a.tower.id);
		const unit = byName("101", "unit", floor.id);

		const renamed = [
			[a.tower, "tower", "Bloco Azul"],
			[floor, "floor", "Térreo"],
			[unit, "unit", "101A"],
			[hall, "common_area", "Salão"],
			[guarita, "common_area", "Portaria"],
		] as const;
		for (const [target, type, name] of renamed) {
			const res = await rename(manager, projectId, target.id, name);

			expect(res.status).toBe(200);
			expect(locationRefSchema.parse(res.body)).toEqual({
				id: target.id,
				type,
				name,
			});
		}
		const structure = await readStructure(projectId);
		expect(structure.towers[0]!.name).toBe("Bloco Azul");
		expect(structure.towers[0]!.floors[0]!.name).toBe("Térreo");
		expect(structure.towers[0]!.floors[0]!.units[0]!.name).toBe("101A");
		expect(structure.towers[0]!.commonAreas[0]!.name).toBe("Salão");
		expect(structure.commonAreas[0]!.name).toBe("Portaria");
	});

	it("keeps the order, the unit type and the children of what it renames", async () => {
		const projectId = await newProject(100);
		const { a } = await twoTowers(projectId);
		const before = await readStructure(projectId);

		await rename(manager, projectId, a.tower.id, "Bloco Azul");

		const after = await readStructure(projectId);
		expect(after.towers.map((tower) => tower.id)).toEqual(
			before.towers.map((tower) => tower.id),
		);
		expect(after.towers[0]!.floors).toEqual(before.towers[0]!.floors);
		expect(after.counts).toEqual(before.counts);
	});

	it("stores the trimmed name", async () => {
		const projectId = await newProject(100);
		const { a } = await twoTowers(projectId);

		const res = await rename(manager, projectId, a.tower.id, "  Bloco   Azul ");

		expect(res.status).toBe(200);
		expect(await storedName(a.tower.id)).toBe("Bloco   Azul");
	});

	describe("who may rename", () => {
		it.each([
			["the admin of the organization", () => admin],
			["a manager of the project", () => manager],
			["an assistant of the project", () => assistant],
		])("lets %s rename", async (_label, who) => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const res = await rename(who(), projectId, a.tower.id, "Bloco Azul");

			expect(res.status).toBe(200);
		});

		it("answers 404 PROJECT_NOT_FOUND to someone without a membership on the project", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const res = await rename(unlinked, projectId, a.tower.id, "Bloco Azul");

			expect(res.status).toBe(404);
			expect(problemOf(res.body).code).toBe(PROJECT_NOT_FOUND);
			expect(await storedName(a.tower.id)).toBe("Torre A");
		});

		it("answers 404 PROJECT_NOT_FOUND to another organization and to a project that does not exist", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const other = await rename(outsider, projectId, a.tower.id, "Bloco Azul");
			const missing = await rename(admin, randomUUID(), a.tower.id, "Bloco");

			for (const res of [other, missing]) {
				expect(res.status).toBe(404);
				expect(problemOf(res.body).code).toBe(PROJECT_NOT_FOUND);
			}
		});

		it("answers 401 without a session", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const res = await request(server)
				.patch(locationPath(projectId, a.tower.id))
				.send({ name: "Bloco Azul" });

			expect(res.status).toBe(401);
		});
	});

	describe("a location of another project", () => {
		it("answers 404 LOCATION_NOT_FOUND for an id that is not in this project, even for one that exists elsewhere", async () => {
			const mine = await newProject(100);
			const other = await newProject(100);
			const { a } = await twoTowers(other);

			const elsewhere = await rename(manager, mine, a.tower.id, "Bloco Azul");
			const missing = await rename(manager, mine, randomUUID(), "Bloco Azul");

			for (const res of [elsewhere, missing]) {
				expect(res.status).toBe(404);
				expect(problemOf(res.body).code).toBe(LOCATION_NOT_FOUND);
			}
			expect(await storedName(a.tower.id)).toBe("Torre A");
		});
	});

	describe("unique names", () => {
		it("answers 409 LOCATION_NAME_TAKEN for a tower named like another tower of the project", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const res = await rename(manager, projectId, a.tower.id, "Torre B");

			expect(res.status).toBe(409);
			const problem = problemOf(res.body);
			expect(problem.code).toBe(LOCATION_NAME_TAKEN);
			expect(problem.names).toEqual(["Torre B"]);
			expect(await storedName(a.tower.id)).toBe("Torre A");
		});

		it("answers 409 for a floor named like another floor of its tower, but not like a floor of another tower", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const first = byName("1º andar", "floor", a.tower.id);

			const taken = await rename(manager, projectId, first.id, "2º andar");
			const inAnotherTower = await rename(
				manager,
				projectId,
				first.id,
				"Torre B",
			);

			expect(taken.status).toBe(409);
			expect(problemOf(taken.body).code).toBe(LOCATION_NAME_TAKEN);
			expect(inAnotherTower.status).toBe(200);
		});

		it("answers 409 for a unit named like a unit on another floor of its tower, but not like a unit of another tower", async () => {
			const projectId = await newProject(100);
			const { a, b, byName } = await twoTowers(projectId);
			const floor = byName("1º andar", "floor", a.tower.id);
			const unit = byName("101", "unit", floor.id);
			const floorOfB = byName("1º andar", "floor", b.tower.id);
			const unitOfB = byName("101", "unit", floorOfB.id);

			const taken = await rename(manager, projectId, unit.id, "201");
			await rename(manager, projectId, unit.id, "A101");
			const sameNameInAnotherTower = await rename(
				manager,
				projectId,
				unitOfB.id,
				"A101",
			);

			expect(taken.status).toBe(409);
			expect(problemOf(taken.body).code).toBe(LOCATION_NAME_TAKEN);
			expect(sameNameInAnotherTower.status).toBe(200);
		});

		it("answers 409 for a unit named like a unit on its own floor", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const floor = byName("1º andar", "floor", a.tower.id);
			const unit = byName("102", "unit", floor.id);

			const res = await rename(manager, projectId, unit.id, "101");

			expect(res.status).toBe(409);
		});

		it("answers 409 for a common area named like a sibling common area, and allows the name under another parent", async () => {
			const projectId = await newProject(100);
			const { a, b, hall, guarita } = await twoTowers(projectId);
			const siblingOfHall = entry(a.tower.id, "common_area", "Academia", 3);
			await create(manager, projectId, [siblingOfHall]);
			const hallOfB = entry(b.tower.id, "common_area", "Salão de festas", 2);
			const created = await create(manager, projectId, [hallOfB]);

			const taken = await rename(manager, projectId, hall.id, "Academia");
			const projectLevel = await rename(
				manager,
				projectId,
				guarita.id,
				"Academia",
			);

			expect(created.status).toBe(201);
			expect(taken.status).toBe(409);
			expect(problemOf(taken.body).code).toBe(LOCATION_NAME_TAKEN);
			expect(projectLevel.status).toBe(200);
		});

		it("keeps each kind in its own scope: a unit may share a name with a floor or a tower", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const floor = byName("1º andar", "floor", a.tower.id);
			const unit = byName("101", "unit", floor.id);

			const res = await rename(manager, projectId, unit.id, "1º andar");

			expect(res.status).toBe(200);
		});

		it.each([
			["capital letters", "TORRE b"],
			["spaces at the ends", "  Torre B  "],
			["repeated spaces", "Torre    B"],
		])("treats %s as the same name", async (_label, name) => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const res = await rename(manager, projectId, a.tower.id, name);

			expect(res.status).toBe(409);
			expect(problemOf(res.body).code).toBe(LOCATION_NAME_TAKEN);
		});

		it("lets accents tell two names apart", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const floor = byName("1º andar", "floor", a.tower.id);
			await rename(manager, projectId, floor.id, "Térreo");
			const other = byName("2º andar", "floor", a.tower.id);

			const res = await rename(manager, projectId, other.id, "Terreo");

			expect(res.status).toBe(200);
		});

		it("never counts the location's own name as a clash, so the case can change", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const sameName = await rename(manager, projectId, a.tower.id, "Torre A");
			const otherCase = await rename(manager, projectId, a.tower.id, "torre a");

			expect(sameName.status).toBe(200);
			expect(otherCase.status).toBe(200);
			expect(await storedName(a.tower.id)).toBe("torre a");
		});

		it("lets two renames race for the same name and keeps only one", async () => {
			const projectId = await newProject(100);
			const { a, b } = await twoTowers(projectId);

			const results = await Promise.all([
				rename(manager, projectId, a.tower.id, "Bloco Azul"),
				rename(assistant, projectId, b.tower.id, "bloco  azul"),
			]);

			expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
		});
	});

	describe("the request", () => {
		it.each([
			["a blank name", { name: "   " }],
			["a name past 60 characters", { name: "x".repeat(61) }],
			["no name", {}],
		])("answers 400 for %s", async (_label, body) => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const res = await manager.agent
				.patch(locationPath(projectId, a.tower.id))
				.send(body);

			expect(res.status).toBe(400);
			expect(await storedName(a.tower.id)).toBe("Torre A");
		});
	});

	describe("a delivered project", () => {
		it("answers 409 PROJECT_DELIVERED to everyone and renames nothing", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);
			await db
				.update(project)
				.set({ status: "delivered" })
				.where(eq(project.id, projectId));

			for (const who of [admin, manager, assistant]) {
				const res = await rename(who, projectId, a.tower.id, "Bloco Azul");
				expect(res.status).toBe(409);
				expect(problemOf(res.body).code).toBe(PROJECT_DELIVERED);
			}
			expect(await storedName(a.tower.id)).toBe("Torre A");
		});
	});

	describe("the project's last activity", () => {
		async function lastActivity(projectId: string) {
			const [row] = await db
				.select({ at: project.lastActivityAt })
				.from(project)
				.where(eq(project.id, projectId));
			return row!.at.getTime();
		}

		it("moves when a location is renamed", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);
			const before = new Date("2026-01-01T00:00:00Z");
			await db
				.update(project)
				.set({ lastActivityAt: before })
				.where(eq(project.id, projectId));

			await rename(manager, projectId, a.tower.id, "Bloco Azul");

			expect(await lastActivity(projectId)).toBeGreaterThan(before.getTime());
		});

		it("stays where it was when the rename is refused", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);
			const before = new Date("2026-01-01T00:00:00Z");
			await db
				.update(project)
				.set({ lastActivityAt: before })
				.where(eq(project.id, projectId));

			await rename(manager, projectId, a.tower.id, "Torre B");

			expect(await lastActivity(projectId)).toBe(before.getTime());
		});
	});
});
