import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	LOCATION_ID_TAKEN,
	LOCATION_NAME_TAKEN,
	LOCATION_NOT_FOUND,
	LOCATION_PARENT_INVALID,
	locationDetailSchema,
	NO_UNITS_LEFT,
	type NewLocation,
	type NewUnitType,
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	ROOM_ID_TAKEN,
	structureSchema,
	subtreeRoomsSchema,
	UNIT_TYPE_ID_TAKEN,
	UNIT_TYPE_NAME_TAKEN,
	UNIT_TYPE_NOT_FOUND,
	UNIT_TYPE_ROOM_INVALID,
	unitTypeListSchema,
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
	floors = 2,
	unitsPerFloor = 2,
}: { towerName?: string; floors?: number; unitsPerFloor?: number } = {}) {
	const tower = entry(null, "tower", towerName);
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

async function createWith(
	person: Person,
	projectId: string,
	unitTypes: NewUnitType[],
	locations: NewLocation[],
) {
	return person.agent
		.post(structurePath(projectId))
		.send({ unitTypes, locations });
}

const unitTypeOf = (name: string, rooms: string[]): NewUnitType => ({
	id: randomUUID(),
	name,
	rooms: rooms.map((room) => ({ id: randomUUID(), name: room })),
});

const unitOf = (
	floorId: string,
	name: string,
	unitTypeId?: string,
	position = 0,
): NewLocation => ({
	...entry(floorId, "unit", name, position),
	...(unitTypeId !== undefined && { unitTypeId }),
});

async function readLocation(projectId: string, locationId: string) {
	const res = await admin.agent.get(
		`/api/projects/${projectId}/locations/${locationId}`,
	);
	return locationDetailSchema.parse(res.body);
}

async function readUnitTypes(projectId: string) {
	const res = await admin.agent.get(`/api/projects/${projectId}/unit-types`);
	return unitTypeListSchema.parse(res.body).unitTypes;
}

async function readStructure(projectId: string) {
	const res = await admin.agent.get(structurePath(projectId));
	return structureSchema.parse(res.body);
}

async function countLocations(projectId: string) {
	return (
		await db.select().from(location).where(eq(location.projectId, projectId))
	).length;
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

describe("POST /api/projects/:id/structure", () => {
	it("creates every location of the request and answers what it describes", async () => {
		const projectId = await newProject(100);
		const { tower, locations } = building({ floors: 3, unitsPerFloor: 4 });
		const hall = entry(tower.id, "common_area", "Salão de festas", 3);
		const guarita = entry(null, "common_area", "Guarita", 1);

		const res = await create(manager, projectId, [...locations, hall, guarita]);

		expect(res.status).toBe(201);
		expect(res.body).toEqual({
			counts: { towers: 1, floors: 3, units: 12, commonAreas: 2 },
		});
		const structure = await readStructure(projectId);
		expect(structure.counts).toEqual({
			towers: 1,
			floors: 3,
			units: 12,
			commonAreas: 2,
		});
		expect(structure.towers[0]!.name).toBe("Torre A");
		expect(structure.towers[0]!.floors.map((floor) => floor.name)).toEqual([
			"1º andar",
			"2º andar",
			"3º andar",
		]);
		expect(
			structure.towers[0]!.floors[1]!.units.map((unit) => unit.name),
		).toEqual(["201", "202", "203", "204"]);
		expect(structure.towers[0]!.commonAreas.map((area) => area.name)).toEqual([
			"Salão de festas",
		]);
		expect(structure.commonAreas.map((area) => area.name)).toEqual(["Guarita"]);
	});

	it("stores trimmed names and no unit type", async () => {
		const projectId = await newProject(10);
		const tower = entry(null, "tower", "  Torre   A  ");
		const floor = entry(tower.id, "floor", "1º andar");
		const unit = entry(floor.id, "unit", "101");

		const res = await create(manager, projectId, [tower, floor, unit]);

		expect(res.status).toBe(201);
		const rows = await db
			.select()
			.from(location)
			.where(eq(location.projectId, projectId));
		expect(rows.find((row) => row.type === "tower")!.name).toBe("Torre   A");
		expect(rows.find((row) => row.type === "unit")!.unitTypeId).toBeNull();
	});

	it("answers the same and creates nothing when the request is sent again", async () => {
		const projectId = await newProject(100);
		const { locations } = building({ floors: 2, unitsPerFloor: 3 });

		const first = await create(manager, projectId, locations);
		const second = await create(manager, projectId, locations);

		expect(first.status).toBe(201);
		expect(second.status).toBe(201);
		expect(second.body).toEqual(first.body);
		expect(await countLocations(projectId)).toBe(locations.length);
	});

	it("adds only the new locations when a resend carries more", async () => {
		const projectId = await newProject(100);
		const { tower, locations } = building({ floors: 1, unitsPerFloor: 2 });
		await create(manager, projectId, locations);
		const extra = entry(tower.id, "floor", "2º andar", 1);

		const res = await create(manager, projectId, [...locations, extra]);

		expect(res.status).toBe(201);
		expect(await countLocations(projectId)).toBe(locations.length + 1);
	});

	it("answers a resend after the last unit is spent with the same 201", async () => {
		const projectId = await newProject(4);
		const { locations } = building({ floors: 2, unitsPerFloor: 2 });

		const first = await create(manager, projectId, locations);
		const again = await create(manager, projectId, locations);

		expect(first.status).toBe(201);
		expect(again.status).toBe(201);
		expect(again.body).toEqual(first.body);
	});

	it("refuses an id that belongs to another project", async () => {
		const projectId = await newProject(100);
		const otherId = await newProject(100);
		const { locations } = building();
		await create(manager, otherId, locations);
		const taken = locations[2]!;
		const request = [
			entry(null, "tower", "Torre Nova"),
			{ ...taken, parentId: null, type: "tower" as const, name: "Outra" },
		];

		const res = await create(manager, projectId, request);

		expect(res.status).toBe(409);
		expect(problemOf(res.body).code).toBe(LOCATION_ID_TAKEN);
		expect(await countLocations(projectId)).toBe(0);
	});

	it("refuses an id of this project reused as another kind or under another parent", async () => {
		const projectId = await newProject(100);
		const { tower, locations } = building({ floors: 2, unitsPerFloor: 1 });
		await create(manager, projectId, locations);
		const floor = locations[1]!;
		const otherFloor = locations[3]!;

		const asOtherKind = await create(manager, projectId, [
			{ ...floor, type: "common_area" },
		]);
		const underOtherParent = await create(manager, projectId, [
			tower,
			otherFloor,
			{ ...locations[2]!, parentId: otherFloor.id },
		]);

		expect(asOtherKind.status).toBe(409);
		expect(problemOf(asOtherKind.body).code).toBe(LOCATION_ID_TAKEN);
		expect(underOtherParent.status).toBe(409);
		expect(problemOf(underOtherParent.body).code).toBe(LOCATION_ID_TAKEN);
	});

	it.each([
		["case", "torre a"],
		["repeated spaces", "Torre    A"],
		["the ends", "  Torre A "],
	])("refuses a tower name that differs only by %s", async (_label, name) => {
		const projectId = await newProject(100);
		await create(manager, projectId, [entry(null, "tower", "Torre A")]);

		const res = await create(manager, projectId, [entry(null, "tower", name)]);

		expect(res.status).toBe(409);
		const problem = problemOf(res.body);
		expect(problem.code).toBe(LOCATION_NAME_TAKEN);
		expect(problem.names).toEqual([name.trim()]);
		expect(await countLocations(projectId)).toBe(1);
	});

	it("lets a name that differs by an accent through", async () => {
		const projectId = await newProject(100);
		const tower = entry(null, "tower", "Torre A");
		await create(manager, projectId, [
			tower,
			entry(tower.id, "floor", "Térreo"),
		]);

		const res = await create(manager, projectId, [
			entry(tower.id, "floor", "Terreo", 1),
		]);

		expect(res.status).toBe(201);
	});

	it("refuses two units of one tower with the same name even on different floors", async () => {
		const projectId = await newProject(100);
		const tower = entry(null, "tower", "Torre A");
		const first = entry(tower.id, "floor", "1º andar");
		const second = entry(tower.id, "floor", "2º andar", 1);

		const res = await create(manager, projectId, [
			tower,
			first,
			second,
			entry(first.id, "unit", "101"),
			entry(second.id, "unit", "101"),
		]);

		expect(res.status).toBe(409);
		const problem = problemOf(res.body);
		expect(problem.code).toBe(LOCATION_NAME_TAKEN);
		expect(problem.names).toEqual(["101"]);
		expect(await countLocations(projectId)).toBe(0);
	});

	it("lets two towers each have their own 101 and their own floors", async () => {
		const projectId = await newProject(100);
		const a = building({ towerName: "Torre A", floors: 1, unitsPerFloor: 1 });
		const b = building({ towerName: "Torre B", floors: 1, unitsPerFloor: 1 });

		const res = await create(manager, projectId, [
			...a.locations,
			...b.locations,
		]);

		expect(res.status).toBe(201);
		expect(res.body).toEqual({
			counts: { towers: 2, floors: 2, units: 2, commonAreas: 0 },
		});
	});

	it("refuses a unit name already used in the tower by an earlier request", async () => {
		const projectId = await newProject(100);
		const { tower, locations } = building({ floors: 1, unitsPerFloor: 1 });
		await create(manager, projectId, locations);
		const second = entry(tower.id, "floor", "2º andar", 1);

		const res = await create(manager, projectId, [
			second,
			entry(second.id, "unit", " 101 "),
		]);

		expect(res.status).toBe(409);
		expect(problemOf(res.body).names).toEqual(["101"]);
	});

	it("refuses two common areas with one name under the same parent", async () => {
		const projectId = await newProject(100);

		const res = await create(manager, projectId, [
			entry(null, "common_area", "Guarita"),
			entry(null, "common_area", "guarita", 1),
		]);

		expect(res.status).toBe(409);
		expect(problemOf(res.body).code).toBe(LOCATION_NAME_TAKEN);
	});

	it("lets a tower and a common area of the project share a name", async () => {
		const projectId = await newProject(100);

		const res = await create(manager, projectId, [
			entry(null, "tower", "Bloco"),
			entry(null, "common_area", "Bloco"),
		]);

		expect(res.status).toBe(201);
	});

	it.each([
		["a unit straight under a tower", "tower", "unit"],
		["a floor under a floor", "floor", "floor"],
		["a tower under a tower", "tower", "tower"],
	] as const)("refuses %s", async (_label, parentType, type) => {
		const projectId = await newProject(100);
		const tower = entry(null, "tower", "Torre A");
		const floor = entry(tower.id, "floor", "1º andar");
		const parent = parentType === "tower" ? tower : floor;

		const res = await create(manager, projectId, [
			tower,
			floor,
			entry(parent.id, type, "X"),
		]);

		expect(res.status).toBe(400);
		expect(problemOf(res.body).code).toBe(LOCATION_PARENT_INVALID);
		expect(await countLocations(projectId)).toBe(0);
	});

	it("refuses a parent that does not exist, that comes later or that is another project's", async () => {
		const projectId = await newProject(100);
		const otherId = await newProject(100);
		const foreign = entry(null, "tower", "Torre A");
		await create(manager, otherId, [foreign]);
		const tower = entry(null, "tower", "Torre B");
		const floor = entry(tower.id, "floor", "1º andar");

		const unknown = await create(manager, projectId, [
			entry(randomUUID(), "floor", "1º andar"),
		]);
		const later = await create(manager, projectId, [floor, tower]);
		const another = await create(manager, projectId, [
			entry(foreign.id, "floor", "1º andar"),
		]);

		for (const res of [unknown, later, another]) {
			expect(res.status).toBe(400);
			expect(problemOf(res.body).code).toBe(LOCATION_PARENT_INVALID);
		}
		expect(await countLocations(projectId)).toBe(0);
	});

	it("refuses a floor with more than 30 units, a repeated id and an empty request", async () => {
		const projectId = await newProject(100);
		const tower = entry(null, "tower", "Torre A");
		const floor = entry(tower.id, "floor", "1º andar");
		const units = Array.from({ length: 31 }, (_, i) =>
			entry(floor.id, "unit", `1${String(i + 1).padStart(2, "0")}`, i),
		);

		const crowded = await create(manager, projectId, [tower, floor, ...units]);
		const repeated = await create(manager, projectId, [tower, tower]);
		const empty = await create(manager, projectId, []);

		for (const res of [crowded, repeated, empty]) {
			expect(res.status).toBe(400);
			expect(problemOf(res.body).code).toBe("VALIDATION_FAILED");
		}
	});

	it("takes 30 units on a floor and refuses more than 5000 locations", async () => {
		const projectId = await newProject(100);
		const tower = entry(null, "tower", "Torre A");
		const floor = entry(tower.id, "floor", "1º andar");
		const units = Array.from({ length: 30 }, (_, i) =>
			entry(floor.id, "unit", `1${String(i + 1).padStart(2, "0")}`, i),
		);
		const tooMany = Array.from({ length: 5001 }, (_, i) =>
			entry(null, "common_area", `Área ${i}`, i),
		);

		const full = await create(manager, projectId, [tower, floor, ...units]);
		const over = await create(manager, projectId, tooMany);

		expect(full.status).toBe(201);
		expect(over.status).toBe(400);
		expect(problemOf(over.body).code).toBe("VALIDATION_FAILED");
	});

	it("takes a request of 5000 locations", async () => {
		const projectId = await newProject(0);
		const areas = Array.from({ length: 5000 }, (_, i) =>
			entry(null, "common_area", `Área ${i}`, i),
		);

		const res = await create(manager, projectId, areas);

		expect(res.status).toBe(201);
		expect(await countLocations(projectId)).toBe(5000);
	}, 30_000);

	describe("the project's reservation", () => {
		it("refuses units beyond what remains and creates nothing", async () => {
			const projectId = await newProject(3);
			const { locations } = building({ floors: 2, unitsPerFloor: 2 });

			const res = await create(manager, projectId, locations);

			expect(res.status).toBe(409);
			expect(res.body).toMatchObject({
				code: NO_UNITS_LEFT,
				requested: 4,
				available: 3,
			});
			expect(await countLocations(projectId)).toBe(0);
		});

		it("counts the units already in the project", async () => {
			const projectId = await newProject(5);
			await create(
				manager,
				projectId,
				building({ floors: 1, unitsPerFloor: 3 }).locations,
			);

			const res = await create(
				manager,
				projectId,
				building({ towerName: "Torre B", floors: 1, unitsPerFloor: 3 })
					.locations,
			);

			expect(res.status).toBe(409);
			expect(res.body).toMatchObject({ requested: 3, available: 2 });
		});

		it("takes exactly what remains and then refuses one more", async () => {
			const projectId = await newProject(3);
			const { tower, locations } = building({ floors: 1, unitsPerFloor: 3 });
			const floor = locations[1]!;

			const fits = await create(manager, projectId, locations);
			const one = await create(manager, projectId, [
				entry(floor.id, "unit", "199", 9),
			]);

			expect(fits.status).toBe(201);
			expect(one.status).toBe(409);
			expect(one.body).toMatchObject({ requested: 1, available: 0 });
			expect(tower.id).toBeDefined();
		});

		it("does not charge for towers, floors or common areas", async () => {
			const projectId = await newProject(0);
			const tower = entry(null, "tower", "Torre A");

			const res = await create(manager, projectId, [
				tower,
				entry(tower.id, "floor", "1º andar"),
				entry(null, "common_area", "Guarita"),
			]);

			expect(res.status).toBe(201);
		});

		it("never lets simultaneous requests pass the reservation", async () => {
			const projectId = await newProject(5);
			const requests = Array.from({ length: 4 }, (_, i) =>
				create(
					manager,
					projectId,
					building({ towerName: `Torre ${i}`, floors: 1, unitsPerFloor: 2 })
						.locations,
				),
			);

			const answers = await Promise.all(requests);

			const created = answers.filter((res) => res.status === 201);
			const refused = answers.filter((res) => res.status === 409);
			expect(created).toHaveLength(2);
			expect(refused).toHaveLength(2);
			expect((await readStructure(projectId)).counts.units).toBe(4);
		});

		it("never lets simultaneous requests repeat a name", async () => {
			const projectId = await newProject(50);

			const answers = await Promise.all(
				Array.from({ length: 4 }, () =>
					create(
						manager,
						projectId,
						building({ floors: 1, unitsPerFloor: 1 }).locations,
					),
				),
			);

			expect(answers.filter((res) => res.status === 201)).toHaveLength(1);
			const refused = answers.filter((res) => res.status === 409);
			expect(refused).toHaveLength(3);
			for (const res of refused) {
				expect(problemOf(res.body).code).toBe(LOCATION_NAME_TAKEN);
			}
			expect((await readStructure(projectId)).counts.towers).toBe(1);
		});

		it("answers simultaneous copies of one request with the same 201", async () => {
			const projectId = await newProject(6);
			const { locations } = building({ floors: 1, unitsPerFloor: 3 });

			const answers = await Promise.all(
				Array.from({ length: 3 }, () => create(manager, projectId, locations)),
			);

			for (const res of answers) expect(res.status).toBe(201);
			expect(await countLocations(projectId)).toBe(locations.length);
		});
	});

	describe("who may write", () => {
		it.each([
			["the admin of the organization", () => admin],
			["a manager of the project", () => manager],
			["an assistant of the project", () => assistant],
		])("lets %s create", async (_label, who) => {
			const projectId = await newProject(10);

			const res = await create(who(), projectId, building().locations);

			expect(res.status).toBe(201);
		});

		it("answers 404 PROJECT_NOT_FOUND to someone without a membership on the project", async () => {
			const projectId = await newProject(10);

			const res = await create(unlinked, projectId, building().locations);

			expect(res.status).toBe(404);
			expect(problemOf(res.body).code).toBe(PROJECT_NOT_FOUND);
			expect(await countLocations(projectId)).toBe(0);
		});

		it("answers 404 PROJECT_NOT_FOUND to another organization and to a project that does not exist", async () => {
			const projectId = await newProject(10);

			const other = await create(outsider, projectId, building().locations);
			const missing = await create(admin, randomUUID(), building().locations);

			for (const res of [other, missing]) {
				expect(res.status).toBe(404);
				expect(problemOf(res.body).code).toBe(PROJECT_NOT_FOUND);
			}
		});

		it("answers 401 without a session", async () => {
			const projectId = await newProject(10);

			const res = await request(server)
				.post(structurePath(projectId))
				.send({ locations: building().locations });

			expect(res.status).toBe(401);
		});

		it("answers 409 PROJECT_DELIVERED for a delivered project, whoever asks", async () => {
			const projectId = await newProject(10, "delivered");

			for (const who of [admin, manager, assistant]) {
				const res = await create(who, projectId, building().locations);
				expect(res.status).toBe(409);
				expect(problemOf(res.body).code).toBe(PROJECT_DELIVERED);
			}
			expect(await countLocations(projectId)).toBe(0);
		});
	});

	it("moves the project's last activity", async () => {
		const projectId = await newProject(10);
		const before = new Date("2026-01-01T00:00:00Z");
		await db
			.update(project)
			.set({ lastActivityAt: before })
			.where(eq(project.id, projectId));

		await create(manager, projectId, building().locations);

		const [after] = await db
			.select({ lastActivityAt: project.lastActivityAt })
			.from(project)
			.where(eq(project.id, projectId));
		expect(after!.lastActivityAt.getTime()).toBeGreaterThan(before.getTime());
	});

	it("leaves the last activity alone when the request is refused", async () => {
		const projectId = await newProject(1);
		const before = new Date("2026-01-01T00:00:00Z");
		await db
			.update(project)
			.set({ lastActivityAt: before })
			.where(eq(project.id, projectId));

		await create(manager, projectId, building().locations);

		const [after] = await db
			.select({ lastActivityAt: project.lastActivityAt })
			.from(project)
			.where(eq(project.id, projectId));
		expect(after!.lastActivityAt.getTime()).toBe(before.getTime());
	});
});

describe("POST /api/projects/:id/structure with unit types", () => {
	const roomsOfA = ["Sala", "Cozinha", "Dormitório"];

	const aTower = () => entry(null, "tower", "Torre A");

	function floorWith(towerName = "Torre A") {
		const tower = entry(null, "tower", towerName);
		const floor = entry(tower.id, "floor", "1º andar");
		return { tower, floor };
	}

	it("creates the unit types with their rooms and gives each unit the rooms of its type", async () => {
		const projectId = await newProject(10);
		const typeA = unitTypeOf("Tipologia A", roomsOfA);
		const typeB = unitTypeOf("Tipologia B", ["Sala", "Banheiro"]);
		const { tower, floor } = floorWith();
		const unitA = unitOf(floor.id, "101", typeA.id);
		const unitB = unitOf(floor.id, "102", typeB.id, 1);

		const res = await createWith(
			manager,
			projectId,
			[typeA, typeB],
			[tower, floor, unitA, unitB],
		);

		expect(res.status).toBe(201);
		expect(res.body).toEqual({
			counts: { towers: 1, floors: 1, units: 2, commonAreas: 0 },
		});
		const detailA = await readLocation(projectId, unitA.id);
		expect(detailA.unitType).toEqual({ id: typeA.id, name: "Tipologia A" });
		expect(detailA.rooms.map((room) => room.name)).toEqual(roomsOfA);
		expect(detailA.rooms.map((room) => room.unitTypeRoomId)).toEqual(
			typeA.rooms.map((room) => room.id),
		);
		expect(detailA.rooms.every((room) => !room.renamed)).toBe(true);
		expect(detailA.changes).toBe(0);
		const detailB = await readLocation(projectId, unitB.id);
		expect(detailB.rooms.map((room) => room.name)).toEqual([
			"Sala",
			"Banheiro",
		]);
		const listed = await readUnitTypes(projectId);
		expect(listed.find((type) => type.id === typeA.id)).toMatchObject({
			name: "Tipologia A",
			unitCount: 1,
			changedUnitCount: 0,
			rooms: typeA.rooms,
		});
		expect(listed.find((type) => type.id === typeB.id)).toMatchObject({
			name: "Tipologia B",
			unitCount: 1,
		});
	});

	it("leaves a unit without a unit type with no unit type and no rooms", async () => {
		const projectId = await newProject(10);
		const typeA = unitTypeOf("Tipologia A", roomsOfA);
		const { tower, floor } = floorWith();
		const bare = unitOf(floor.id, "101");

		const res = await createWith(
			manager,
			projectId,
			[typeA],
			[tower, floor, bare],
		);

		expect(res.status).toBe(201);
		const detail = await readLocation(projectId, bare.id);
		expect(detail.unitType).toBeNull();
		expect(detail.rooms).toEqual([]);
		expect((await readUnitTypes(projectId))[0]!.unitCount).toBe(0);
	});

	it("creates a unit type with no rooms", async () => {
		const projectId = await newProject(10);
		const empty = unitTypeOf("Tipologia A", []);
		const { tower, floor } = floorWith();
		const unit = unitOf(floor.id, "101", empty.id);

		const res = await createWith(
			manager,
			projectId,
			[empty],
			[tower, floor, unit],
		);

		expect(res.status).toBe(201);
		expect((await readLocation(projectId, unit.id)).rooms).toEqual([]);
	});

	it("answers the same and creates nothing when the request is sent again", async () => {
		const projectId = await newProject(10);
		const typeA = unitTypeOf("Tipologia A", roomsOfA);
		const { tower, floor } = floorWith();
		const unit = unitOf(floor.id, "101", typeA.id);
		const request: [NewUnitType[], NewLocation[]] = [
			[typeA],
			[tower, floor, unit],
		];

		const first = await createWith(manager, projectId, ...request);
		const again = await createWith(manager, projectId, ...request);

		expect(again.status).toBe(201);
		expect(again.body).toEqual(first.body);
		expect(await readUnitTypes(projectId)).toHaveLength(1);
		expect((await readLocation(projectId, unit.id)).rooms).toHaveLength(3);
	});

	it("gives a unit of a later request the rooms of a unit type that already exists", async () => {
		const projectId = await newProject(10);
		const typeA = unitTypeOf("Tipologia A", roomsOfA);
		const { tower, floor } = floorWith();
		await createWith(manager, projectId, [typeA], [tower, floor]);
		const unit = unitOf(floor.id, "101", typeA.id);

		const res = await createWith(manager, projectId, [], [unit]);

		expect(res.status).toBe(201);
		expect(
			(await readLocation(projectId, unit.id)).rooms.map((r) => r.name),
		).toEqual(roomsOfA);
	});

	it.each([
		["case", "tipologia a"],
		["repeated spaces", "Tipologia    A"],
		["the ends", "  Tipologia A "],
	])(
		"refuses a unit type name that differs only by %s",
		async (_label, name) => {
			const projectId = await newProject(10);
			await createWith(
				manager,
				projectId,
				[unitTypeOf("Tipologia A", [])],
				[aTower()],
			);
			const { tower, floor } = floorWith("Torre B");

			const res = await createWith(
				manager,
				projectId,
				[unitTypeOf(name, ["Sala"])],
				[tower, floor, unitOf(floor.id, "101")],
			);

			expect(res.status).toBe(409);
			const problem = problemOf(res.body);
			expect(problem.code).toBe(UNIT_TYPE_NAME_TAKEN);
			expect(problem.names).toEqual([name.trim()]);
			expect(await countLocations(projectId)).toBe(1);
			expect(await readUnitTypes(projectId)).toHaveLength(1);
		},
	);

	it("refuses two unit types of one request with the same name and creates nothing", async () => {
		const projectId = await newProject(10);
		const { tower, floor } = floorWith();

		const res = await createWith(
			manager,
			projectId,
			[unitTypeOf("Tipologia A", ["Sala"]), unitTypeOf("tipologia a", [])],
			[tower, floor],
		);

		expect(res.status).toBe(409);
		expect(problemOf(res.body).code).toBe(UNIT_TYPE_NAME_TAKEN);
		expect(await countLocations(projectId)).toBe(0);
	});

	it("lets two projects each have their own unit type of the same name", async () => {
		const first = await newProject(10);
		const second = await newProject(10);

		const a = await createWith(
			manager,
			first,
			[unitTypeOf("Tipologia A", [])],
			[aTower()],
		);
		const b = await createWith(
			manager,
			second,
			[unitTypeOf("Tipologia A", [])],
			[aTower()],
		);

		expect(a.status).toBe(201);
		expect(b.status).toBe(201);
	});

	it("refuses a unit that follows a unit type the project does not have", async () => {
		const projectId = await newProject(10);
		const otherId = await newProject(10);
		const foreign = unitTypeOf("Tipologia A", ["Sala"]);
		const { tower, floor } = floorWith();
		await createWith(manager, otherId, [foreign], [tower, floor]);
		const mine = floorWith();

		const unknown = await createWith(
			manager,
			projectId,
			[],
			[mine.tower, mine.floor, unitOf(mine.floor.id, "101", randomUUID())],
		);
		const ofAnotherProject = await createWith(
			manager,
			projectId,
			[],
			[mine.tower, mine.floor, unitOf(mine.floor.id, "101", foreign.id)],
		);

		for (const res of [unknown, ofAnotherProject]) {
			expect(res.status).toBe(400);
			expect(problemOf(res.body).code).toBe(UNIT_TYPE_NOT_FOUND);
		}
		expect(await countLocations(projectId)).toBe(0);
	});

	it("refuses a unit type id or a room id that belongs to another project", async () => {
		const projectId = await newProject(10);
		const otherId = await newProject(10);
		const taken = unitTypeOf("Tipologia A", ["Sala"]);
		await createWith(manager, otherId, [taken], [aTower()]);

		const sameType = await createWith(
			manager,
			projectId,
			[{ ...unitTypeOf("Outra", []), id: taken.id }],
			[aTower()],
		);
		const sameRoom = await createWith(
			manager,
			projectId,
			[{ ...unitTypeOf("Outra", []), rooms: taken.rooms }],
			[aTower()],
		);

		for (const res of [sameType, sameRoom]) {
			expect(res.status).toBe(409);
			expect(problemOf(res.body).code).toBe(UNIT_TYPE_ID_TAKEN);
		}
		expect(await readUnitTypes(projectId)).toEqual([]);
	});

	it("refuses a malformed unit type request", async () => {
		const projectId = await newProject(10);
		const { tower, floor } = floorWith();
		const typeA = unitTypeOf("Tipologia A", ["Sala", "sala"]);

		const sameRoomTwice = await createWith(
			manager,
			projectId,
			[typeA],
			[tower, floor],
		);
		const onAFloor = await createWith(
			manager,
			projectId,
			[unitTypeOf("Tipologia B", [])],
			[tower, { ...floor, unitTypeId: randomUUID() }],
		);
		const sharedId = unitTypeOf("Tipologia C", []);
		const twoWithOneId = await createWith(
			manager,
			projectId,
			[sharedId, { ...sharedId, name: "Tipologia D" }],
			[tower, floor],
		);

		for (const res of [sameRoomTwice, onAFloor, twoWithOneId]) {
			expect(res.status).toBe(400);
		}
		expect(await countLocations(projectId)).toBe(0);
	});

	it("creates no unit type when the units do not fit the reservation", async () => {
		const projectId = await newProject(1);
		const typeA = unitTypeOf("Tipologia A", ["Sala"]);
		const { tower, floor } = floorWith();

		const res = await createWith(
			manager,
			projectId,
			[typeA],
			[
				tower,
				floor,
				unitOf(floor.id, "101", typeA.id),
				unitOf(floor.id, "102", typeA.id, 1),
			],
		);

		expect(res.status).toBe(409);
		expect(problemOf(res.body).code).toBe(NO_UNITS_LEFT);
		expect(await readUnitTypes(projectId)).toEqual([]);
	});

	it("lets the assistant send unit types and refuses a delivered project", async () => {
		const projectId = await newProject(10);
		const delivered = await newProject(10, "delivered");

		const ok = await createWith(
			assistant,
			projectId,
			[unitTypeOf("Tipologia A", [])],
			[aTower()],
		);
		const refused = await createWith(
			admin,
			delivered,
			[unitTypeOf("Tipologia A", [])],
			[aTower()],
		);

		expect(ok.status).toBe(201);
		expect(refused.status).toBe(409);
		expect(problemOf(refused.body).code).toBe(PROJECT_DELIVERED);
		expect(await readUnitTypes(delivered)).toEqual([]);
	});
});

describe("POST /api/projects/:id/structure with the rooms of a copy", () => {
	const typeA = () => unitTypeOf("Tipologia A", ["Sala", "Cozinha", "Quarto"]);

	function floorWith() {
		const tower = entry(null, "tower", "Torre A");
		const floor = entry(tower.id, "floor", "1º andar");
		return { tower, floor };
	}

	const roomOf = (
		name: string,
		extra: { unitTypeRoomId?: string; renamed?: boolean } = {},
	) => ({ id: randomUUID(), name, ...extra });

	it("keeps the rooms a unit was given, the one renamed, the one only it has and the one it dropped", async () => {
		const projectId = await newProject(10);
		const type = typeA();
		const { tower, floor } = floorWith();
		const [sala, cozinha, quarto] = type.rooms;
		const copy: NewLocation = {
			...unitOf(floor.id, "101", type.id),
			rooms: [
				roomOf("Sala de estar", { unitTypeRoomId: sala!.id, renamed: true }),
				roomOf(cozinha!.name, { unitTypeRoomId: cozinha!.id }),
				roomOf("Varanda"),
			],
			droppedRooms: [quarto!.id],
		};

		const res = await createWith(
			manager,
			projectId,
			[type],
			[tower, floor, copy],
		);

		expect(res.status).toBe(201);
		const detail = await readLocation(projectId, copy.id);
		expect(detail.rooms).toEqual([
			expect.objectContaining({
				name: "Sala de estar",
				unitTypeRoomId: sala!.id,
				renamed: true,
			}),
			expect.objectContaining({
				name: "Cozinha",
				unitTypeRoomId: cozinha!.id,
				renamed: false,
			}),
			expect.objectContaining({
				name: "Varanda",
				unitTypeRoomId: null,
				renamed: false,
			}),
		]);
		expect(detail.droppedRooms).toEqual([
			{ unitTypeRoomId: quarto!.id, name: "Quarto" },
		]);
		expect(detail.changes).toBe(3);
	});

	it("gives a unit exactly the rooms of the request, in their order", async () => {
		const projectId = await newProject(10);
		const { tower, floor } = floorWith();
		const unit: NewLocation = {
			...unitOf(floor.id, "101"),
			rooms: [roomOf("Sala"), roomOf("Cozinha")],
		};

		const res = await create(manager, projectId, [tower, floor, unit]);

		expect(res.status).toBe(201);
		const detail = await readLocation(projectId, unit.id);
		expect(detail.rooms).toEqual(
			unit.rooms!.map(({ id, name }) => ({
				id,
				name,
				unitTypeRoomId: null,
				renamed: false,
			})),
		);
	});

	it("keeps a unit that took out every room of its unit type", async () => {
		const projectId = await newProject(10);
		const type = typeA();
		const { tower, floor } = floorWith();
		const copy: NewLocation = {
			...unitOf(floor.id, "101", type.id),
			rooms: [],
			droppedRooms: type.rooms.map((room) => room.id),
		};

		const res = await createWith(
			manager,
			projectId,
			[type],
			[tower, floor, copy],
		);

		expect(res.status).toBe(201);
		const detail = await readLocation(projectId, copy.id);
		expect(detail.rooms).toEqual([]);
		expect(detail.droppedRooms).toHaveLength(3);
	});

	it.each([
		[
			"leave out the rooms of its unit type",
			(): Partial<NewLocation> => ({ rooms: [] }),
		],
		[
			"take out one room of its unit type and leave out the others",
			(type: NewUnitType): Partial<NewLocation> => ({
				rooms: [roomOf("Varanda")],
				droppedRooms: [type.rooms[0]!.id],
			}),
		],
		[
			"carry another name for a room of its unit type not renamed",
			(type: NewUnitType): Partial<NewLocation> => ({
				rooms: type.rooms.map((room, at) =>
					roomOf(at === 0 ? "Sala de estar" : room.name, {
						unitTypeRoomId: room.id,
					}),
				),
			}),
		],
	])(
		"refuses a unit whose rooms %s and creates nothing",
		async (_label, roomsFor) => {
			const projectId = await newProject(10);
			const type = typeA();
			const { tower, floor } = floorWith();
			const copy: NewLocation = {
				...unitOf(floor.id, "101", type.id),
				...roomsFor(type),
			};

			const res = await createWith(
				manager,
				projectId,
				[type],
				[tower, floor, copy],
			);

			expect(res.status).toBe(400);
			expect(problemOf(res.body).code).toBe(UNIT_TYPE_ROOM_INVALID);
			expect(await countLocations(projectId)).toBe(0);
		},
	);

	it("refuses a unit whose rooms leave out a room its unit type already had", async () => {
		const projectId = await newProject(10);
		const type = typeA();
		const { tower, floor } = floorWith();
		await createWith(manager, projectId, [type], [tower, floor]);
		const copy: NewLocation = {
			...unitOf(floor.id, "101", type.id),
			rooms: type.rooms
				.slice(1)
				.map((room) => roomOf(room.name, { unitTypeRoomId: room.id })),
		};

		const res = await createWith(manager, projectId, [], [copy]);

		expect(res.status).toBe(400);
		expect(problemOf(res.body).code).toBe(UNIT_TYPE_ROOM_INVALID);
		expect(await countLocations(projectId)).toBe(2);
	});

	it("gives a common area the rooms it was given", async () => {
		const projectId = await newProject(10);
		const { tower, floor } = floorWith();
		const hall: NewLocation = {
			...entry(floor.id, "common_area", "Salão de festas"),
			rooms: [roomOf("Cozinha"), roomOf("Banheiro")],
		};

		const res = await create(manager, projectId, [tower, floor, hall]);

		expect(res.status).toBe(201);
		const detail = await readLocation(projectId, hall.id);
		expect(detail.rooms.map((room) => room.name)).toEqual([
			"Cozinha",
			"Banheiro",
		]);
	});

	it("creates the rooms once when the request is sent again", async () => {
		const projectId = await newProject(10);
		const type = typeA();
		const { tower, floor } = floorWith();
		const [sala, ...kept] = type.rooms;
		const copy: NewLocation = {
			...unitOf(floor.id, "101", type.id),
			rooms: [
				...kept.map((room) => roomOf(room.name, { unitTypeRoomId: room.id })),
				roomOf("Varanda"),
			],
			droppedRooms: [sala!.id],
		};
		const locations = [tower, floor, copy];
		await createWith(manager, projectId, [type], locations);

		const again = await createWith(manager, projectId, [type], locations);

		expect(again.status).toBe(201);
		const detail = await readLocation(projectId, copy.id);
		expect(detail.rooms.map((room) => room.name)).toEqual([
			"Cozinha",
			"Quarto",
			"Varanda",
		]);
		expect(detail.droppedRooms).toHaveLength(1);
	});

	it("refuses a room that belongs to another unit type and creates nothing", async () => {
		const projectId = await newProject(10);
		const type = typeA();
		const other = unitTypeOf("Tipologia B", ["Banheiro"]);
		const { tower, floor } = floorWith();
		const copy: NewLocation = {
			...unitOf(floor.id, "101", type.id),
			rooms: [roomOf("Banheiro", { unitTypeRoomId: other.rooms[0]!.id })],
		};

		const res = await createWith(
			manager,
			projectId,
			[type, other],
			[tower, floor, copy],
		);

		expect(res.status).toBe(400);
		expect(problemOf(res.body).code).toBe(UNIT_TYPE_ROOM_INVALID);
		expect(await countLocations(projectId)).toBe(0);
		expect(await readUnitTypes(projectId)).toEqual([]);
	});

	it("refuses a dropped room that does not exist", async () => {
		const projectId = await newProject(10);
		const type = typeA();
		const { tower, floor } = floorWith();
		const copy: NewLocation = {
			...unitOf(floor.id, "101", type.id),
			rooms: [],
			droppedRooms: [randomUUID()],
		};

		const res = await createWith(
			manager,
			projectId,
			[type],
			[tower, floor, copy],
		);

		expect(res.status).toBe(400);
		expect(problemOf(res.body).code).toBe(UNIT_TYPE_ROOM_INVALID);
	});

	it("refuses a room of the unit type that is both kept and taken out", async () => {
		const projectId = await newProject(10);
		const type = typeA();
		const { tower, floor } = floorWith();
		const [sala, ...kept] = type.rooms;
		const copy: NewLocation = {
			...unitOf(floor.id, "101", type.id),
			rooms: [sala!, ...kept].map((room) =>
				roomOf(room.name, { unitTypeRoomId: room.id }),
			),
			droppedRooms: [sala!.id],
		};

		const res = await createWith(
			manager,
			projectId,
			[type],
			[tower, floor, copy],
		);

		expect(res.status).toBe(400);
		expect(await countLocations(projectId)).toBe(0);
	});

	it("refuses a room id already used by another location", async () => {
		const projectId = await newProject(10);
		const { tower, floor } = floorWith();
		const first: NewLocation = {
			...entry(floor.id, "common_area", "Hall"),
			rooms: [roomOf("Cozinha")],
		};
		await create(manager, projectId, [tower, floor, first]);
		const second: NewLocation = {
			...entry(floor.id, "common_area", "Salão", 1),
			rooms: [{ id: first.rooms![0]!.id, name: "Cozinha" }],
		};

		const res = await create(manager, projectId, [second]);

		expect(res.status).toBe(409);
		expect(problemOf(res.body).code).toBe(ROOM_ID_TAKEN);
		expect(await countLocations(projectId)).toBe(3);
	});

	it.each([
		[
			"rooms on a floor",
			(floorId: string): NewLocation => ({
				...entry(null, "floor", "2º andar"),
				parentId: floorId,
				rooms: [{ id: randomUUID(), name: "Sala" }],
			}),
		],
		[
			"rooms of a unit type on a unit without one",
			(floorId: string): NewLocation => ({
				...unitOf(floorId, "101"),
				rooms: [
					{ id: randomUUID(), name: "Sala", unitTypeRoomId: randomUUID() },
				],
			}),
		],
		[
			"dropped rooms on a unit that does not list its rooms",
			(floorId: string): NewLocation => ({
				...unitOf(floorId, "101"),
				droppedRooms: [],
			}),
		],
		[
			"dropped rooms on a common area",
			(floorId: string): NewLocation => ({
				...entry(floorId, "common_area", "Hall"),
				droppedRooms: [randomUUID()],
			}),
		],
		[
			"the same room name twice",
			(floorId: string): NewLocation => ({
				...entry(floorId, "common_area", "Hall"),
				rooms: [
					{ id: randomUUID(), name: "Sala" },
					{ id: randomUUID(), name: " sala " },
				],
			}),
		],
		[
			"a renamed room that is not of a unit type",
			(floorId: string): NewLocation => ({
				...entry(floorId, "common_area", "Hall"),
				rooms: [{ id: randomUUID(), name: "Sala", renamed: true }],
			}),
		],
	])("refuses %s", async (_label, build) => {
		const projectId = await newProject(10);
		const { tower, floor } = floorWith();

		const res = await create(manager, projectId, [
			tower,
			floor,
			build(floor.id),
		]);

		expect(res.status).toBe(400);
		expect(await countLocations(projectId)).toBe(0);
	});
});

describe("GET /api/projects/:id/locations/:locationId/subtree-rooms", () => {
	const subtreePath = (projectId: string, locationId: string) =>
		`/api/projects/${projectId}/locations/${locationId}/subtree-rooms`;

	async function buildTower() {
		const projectId = await newProject(10);
		const type = unitTypeOf("Tipologia A", ["Sala", "Cozinha"]);
		const tower = entry(null, "tower", "Torre A");
		const floor = entry(tower.id, "floor", "1º andar");
		const otherFloor = entry(tower.id, "floor", "2º andar", 1);
		const unit = {
			...unitOf(floor.id, "101", type.id),
			droppedRooms: [type.rooms[1]!.id],
			rooms: [
				{
					id: randomUUID(),
					name: "Sala",
					unitTypeRoomId: type.rooms[0]!.id,
				},
				{ id: randomUUID(), name: "Varanda" },
			],
		};
		const bare = unitOf(floor.id, "102", undefined, 1);
		const hall: NewLocation = {
			...entry(floor.id, "common_area", "Hall", 2),
			rooms: [{ id: randomUUID(), name: "Depósito" }],
		};
		const towerArea = entry(tower.id, "common_area", "Salão", 2);
		const upper = unitOf(otherFloor.id, "201", type.id);
		const res = await createWith(
			manager,
			projectId,
			[type],
			[tower, floor, otherFloor, unit, bare, hall, towerArea, upper],
		);
		expect(res.status).toBe(201);
		return { projectId, tower, floor, unit, bare, hall, towerArea, upper };
	}

	it("lists every unit and common area below a tower with their rooms", async () => {
		const { projectId, tower, unit, bare, hall, towerArea, upper } =
			await buildTower();

		const res = await manager.agent.get(subtreePath(projectId, tower.id));

		expect(res.status).toBe(200);
		const { locations } = subtreeRoomsSchema.parse(res.body);
		expect(locations.map(({ id }) => id).sort()).toEqual(
			[unit.id, bare.id, hall.id, towerArea.id, upper.id].sort(),
		);
		const found = locations.find(({ id }) => id === unit.id)!;
		expect(found.rooms.map(({ name }) => name)).toEqual(["Sala", "Varanda"]);
		expect(found.droppedRooms.map(({ name }) => name)).toEqual(["Cozinha"]);
		expect(locations.find(({ id }) => id === bare.id)).toEqual({
			id: bare.id,
			rooms: [],
			droppedRooms: [],
		});
		expect(
			locations.find(({ id }) => id === hall.id)!.rooms.map(({ name }) => name),
		).toEqual(["Depósito"]);
	});

	it("lists only what is below a floor, and a unit alone", async () => {
		const { projectId, floor, unit, bare, hall } = await buildTower();

		const ofFloor = await manager.agent.get(subtreePath(projectId, floor.id));
		const ofUnit = await manager.agent.get(subtreePath(projectId, unit.id));

		expect(
			subtreeRoomsSchema
				.parse(ofFloor.body)
				.locations.map(({ id }) => id)
				.sort(),
		).toEqual([unit.id, bare.id, hall.id].sort());
		expect(
			subtreeRoomsSchema.parse(ofUnit.body).locations.map(({ id }) => id),
		).toEqual([unit.id]);
	});

	it("answers LOCATION_NOT_FOUND for a location of another project or none", async () => {
		const { tower } = await buildTower();
		const other = await newProject(10);

		const elsewhere = await manager.agent.get(subtreePath(other, tower.id));
		const missing = await manager.agent.get(subtreePath(other, randomUUID()));

		expect(elsewhere.status).toBe(404);
		expect(problemOf(elsewhere.body).code).toBe(LOCATION_NOT_FOUND);
		expect(missing.status).toBe(404);
		expect(problemOf(missing.body).code).toBe(LOCATION_NOT_FOUND);
	});

	it("answers PROJECT_NOT_FOUND to someone who cannot see the project, and 401 without a session", async () => {
		const { projectId, tower } = await buildTower();

		const unseen = await unlinked.agent.get(subtreePath(projectId, tower.id));
		const outside = await outsider.agent.get(subtreePath(projectId, tower.id));
		const anonymous = await request(server).get(
			subtreePath(projectId, tower.id),
		);

		expect(unseen.status).toBe(404);
		expect(problemOf(unseen.body).code).toBe(PROJECT_NOT_FOUND);
		expect(outside.status).toBe(404);
		expect(anonymous.status).toBe(401);
	});
});
