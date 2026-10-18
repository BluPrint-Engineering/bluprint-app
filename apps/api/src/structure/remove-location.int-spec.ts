import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	LOCATION_NOT_FOUND,
	locationDetailSchema,
	type NewLocation,
	NO_UNITS_LEFT,
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	projectUnitsBalanceSchema,
	removeLocationResultSchema,
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
import { LocationContent } from "./location-content";
import { location } from "./location.entity";
import { room } from "./room.entity";

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

const floorNames = (structure: Structure) =>
	structure.towers[0]!.floors.map((floor) => floor.name);

const unitNames = (structure: Structure) =>
	structure.towers[0]!.floors[0]!.units.map((unit) => unit.name);

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

function remove(person: Person, projectId: string, locationId: string) {
	return person.agent.delete(locationPath(projectId, locationId));
}

async function exists(locationId: string) {
	const rows = await db
		.select({ id: location.id })
		.from(location)
		.where(eq(location.id, locationId));
	return rows.length > 0;
}

async function balanceOf(projectId: string) {
	const res = await admin.agent.get(`/api/projects/${projectId}/units`);
	return projectUnitsBalanceSchema.parse(res.body);
}

describe("DELETE /api/projects/:id/locations/:locationId", () => {
	describe("a location with nothing below it", () => {
		it.each([
			["a unit", "unit", { floors: 0, units: 1, commonAreas: 0 }],
			["a floor", "floor", { floors: 1, units: 0, commonAreas: 0 }],
			["a common area", "common_area", { floors: 0, units: 0, commonAreas: 1 }],
			["a tower", "tower", { floors: 0, units: 0, commonAreas: 0 }],
		] as const)(
			"deletes %s and answers what was removed",
			async (_label, type, removed) => {
				const projectId = await newProject(100);
				const tower = entry(null, "tower", "Torre A");
				const floor = entry(tower.id, "floor", "1º andar");
				const unit = entry(floor.id, "unit", "101");
				const hall = entry(floor.id, "common_area", "Hall", 1);
				const emptyFloor = entry(tower.id, "floor", "2º andar", 1);
				const emptyTower = entry(null, "tower", "Torre B", 1);
				await create(manager, projectId, [
					tower,
					floor,
					unit,
					hall,
					emptyFloor,
					emptyTower,
				]);
				const target = {
					unit,
					floor: emptyFloor,
					common_area: hall,
					tower: emptyTower,
				}[type];

				const res = await remove(manager, projectId, target.id);

				expect(res.status).toBe(200);
				expect(removeLocationResultSchema.parse(res.body)).toEqual({
					outcome: "deleted",
					removed,
				});
				expect(await exists(target.id)).toBe(false);
				expect(await exists(floor.id)).toBe(true);
			},
		);
	});

	describe("a location with children", () => {
		it("takes a floor with its units and common areas, and nothing else", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			const floor = byName("1º andar", "floor", a.tower.id);
			const hall = entry(floor.id, "common_area", "Hall", 2);
			expect((await create(manager, projectId, [hall])).status).toBe(201);
			const before = await readStructure(projectId);

			const res = await remove(manager, projectId, floor.id);

			expect(removeLocationResultSchema.parse(res.body)).toEqual({
				outcome: "deleted",
				removed: { floors: 1, units: 2, commonAreas: 1 },
			});
			const after = await readStructure(projectId);
			expect(floorNames(after)).toEqual(["2º andar"]);
			expect(after.towers[1]).toEqual(before.towers[1]);
			expect(after.counts).toEqual({
				towers: 2,
				floors: 3,
				units: 6,
				commonAreas: 2,
			});
			expect(await exists(hall.id)).toBe(false);
		});

		it("takes a tower with its floors, units and common areas", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const res = await remove(manager, projectId, a.tower.id);

			expect(removeLocationResultSchema.parse(res.body)).toEqual({
				outcome: "deleted",
				removed: { floors: 2, units: 4, commonAreas: 1 },
			});
			const after = await readStructure(projectId);
			expect(after.towers.map((tower) => tower.name)).toEqual(["Torre B"]);
			expect(after.counts).toEqual({
				towers: 1,
				floors: 2,
				units: 4,
				commonAreas: 1,
			});
		});

		it("takes the rooms of a unit and leaves other projects alone, even with the same names", async () => {
			const projectId = await newProject(100);
			const other = await newProject(100);
			const first = await twoTowers(projectId);
			await twoTowers(other);
			const roomed = first.a.locations.find((each) => each.name === "101")!;
			const roomId = randomUUID();
			const withRooms = await manager.agent
				.post(`${locationPath(projectId, roomed.id)}/rooms`)
				.send({ id: roomId, name: "Sala" });
			expect(withRooms.status).toBe(201);

			await remove(manager, projectId, first.a.tower.id);

			const rooms = await db
				.select({ id: room.id })
				.from(room)
				.where(eq(room.id, roomId));
			expect(rooms).toEqual([]);
			expect((await readStructure(other)).counts).toEqual({
				towers: 2,
				floors: 4,
				units: 8,
				commonAreas: 2,
			});
		});
	});

	describe("the reservation", () => {
		it("gives the place of a removed unit back, so another can be created", async () => {
			const projectId = await newProject(2);
			const tower = entry(null, "tower", "Torre A");
			const floor = entry(tower.id, "floor", "1º andar");
			const first = entry(floor.id, "unit", "101", 0);
			const second = entry(floor.id, "unit", "102", 1);
			await create(manager, projectId, [tower, floor, first, second]);
			const third = entry(floor.id, "unit", "103", 2);
			const refused = await create(manager, projectId, [third]);
			expect(refused.status).toBe(409);
			expect(problemOf(refused.body).code).toBe(NO_UNITS_LEFT);
			expect(await balanceOf(projectId)).toEqual({
				reserved: 2,
				used: 2,
				remaining: 0,
			});

			await remove(manager, projectId, first.id);

			expect(await balanceOf(projectId)).toEqual({
				reserved: 2,
				used: 1,
				remaining: 1,
			});
			expect((await create(manager, projectId, [third])).status).toBe(201);
		});

		it("gives back the places of every unit of a removed floor and tower", async () => {
			const projectId = await newProject(100);
			const { a, byName } = await twoTowers(projectId);
			expect((await balanceOf(projectId)).used).toBe(8);

			await remove(
				manager,
				projectId,
				byName("1º andar", "floor", a.tower.id).id,
			);
			expect((await balanceOf(projectId)).used).toBe(6);

			await remove(manager, projectId, a.tower.id);
			expect((await balanceOf(projectId)).used).toBe(4);
		});
	});

	describe("undoing a removal", () => {
		it("brings a unit back as it was, with its id, place, unit type, rooms and changes", async () => {
			const projectId = await newProject(100);
			const tower = entry(null, "tower", "Torre A");
			const floor = entry(tower.id, "floor", "9º andar");
			const neighbour = entry(floor.id, "unit", "903", 0);
			const unit = {
				...entry(floor.id, "unit", "904", 1),
				unitTypeId: randomUUID(),
			};
			const typeRooms = ["Sala", "Cozinha", "Sacada"].map((name) => ({
				id: randomUUID(),
				name,
			}));
			const unitTypes = [
				{ id: unit.unitTypeId, name: "Tipologia A", rooms: typeRooms },
			];
			const created = await manager.agent
				.post(structurePath(projectId))
				.send({ unitTypes, locations: [tower, floor, neighbour, unit] });
			expect(created.status).toBe(201);
			const base = `${locationPath(projectId, unit.id)}`;
			const roomsOf = async () =>
				locationDetailSchema.parse((await manager.agent.get(base)).body);
			const sala = (await roomsOf()).rooms.find(
				(each) => each.name === "Sala",
			)!;
			const sacada = typeRooms[2]!;
			await manager.agent
				.patch(`/api/projects/${projectId}/rooms/${sala.id}`)
				.send({ name: "Estar" });
			await manager.agent.delete(
				`/api/projects/${projectId}/rooms/${(await roomsOf()).rooms.find((each) => each.name === "Sacada")!.id}`,
			);
			await manager.agent
				.post(`${base}/rooms`)
				.send({ id: randomUUID(), name: "Lavanderia" });
			const before = await roomsOf();
			expect(before.changes).toBe(3);

			expect((await remove(manager, projectId, unit.id)).status).toBe(200);
			const undone = await create(manager, projectId, [
				{
					id: unit.id,
					parentId: floor.id,
					type: "unit",
					name: unit.name,
					position: before.position,
					unitTypeId: unit.unitTypeId,
					rooms: before.rooms.map(({ id, name, unitTypeRoomId, renamed }) => ({
						id,
						name,
						...(unitTypeRoomId ? { unitTypeRoomId } : {}),
						...(renamed ? { renamed } : {}),
					})),
					droppedRooms: before.droppedRooms.map(
						({ unitTypeRoomId }) => unitTypeRoomId,
					),
				},
			]);

			expect(undone.status).toBe(201);
			expect(await roomsOf()).toEqual(before);
			expect(before.droppedRooms).toEqual([
				{ unitTypeRoomId: sacada.id, name: "Sacada" },
			]);
			expect(unitNames(await readStructure(projectId))).toEqual(["903", "904"]);
		});
	});

	describe("who may remove", () => {
		it.each([
			["the admin of the organization", () => admin],
			["a manager of the project", () => manager],
			["an assistant of the project", () => assistant],
		])("lets %s remove", async (_label, who) => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const res = await remove(who(), projectId, a.tower.id);

			expect(res.status).toBe(200);
			expect(await exists(a.tower.id)).toBe(false);
		});

		it("answers 404 PROJECT_NOT_FOUND to someone without a membership, to another organization and to a project that does not exist", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const results = [
				await remove(unlinked, projectId, a.tower.id),
				await remove(outsider, projectId, a.tower.id),
				await remove(admin, randomUUID(), a.tower.id),
			];

			for (const res of results) {
				expect(res.status).toBe(404);
				expect(problemOf(res.body).code).toBe(PROJECT_NOT_FOUND);
			}
			expect(await exists(a.tower.id)).toBe(true);
		});

		it("answers 401 without a session", async () => {
			const projectId = await newProject(100);
			const { a } = await twoTowers(projectId);

			const res = await request(server).delete(
				locationPath(projectId, a.tower.id),
			);

			expect(res.status).toBe(401);
			expect(await exists(a.tower.id)).toBe(true);
		});
	});

	it("answers 404 LOCATION_NOT_FOUND for a location of another project, for one that does not exist and for one already removed", async () => {
		const mine = await newProject(100);
		const other = await newProject(100);
		const { a } = await twoTowers(other);
		const own = await twoTowers(mine);
		await remove(manager, mine, own.a.tower.id);

		for (const id of [a.tower.id, randomUUID(), own.a.tower.id]) {
			const res = await remove(manager, mine, id);

			expect(res.status).toBe(404);
			expect(problemOf(res.body).code).toBe(LOCATION_NOT_FOUND);
		}
		expect(await exists(a.tower.id)).toBe(true);
	});

	it("answers 409 PROJECT_DELIVERED to everyone and removes nothing", async () => {
		const projectId = await newProject(100);
		const { a } = await twoTowers(projectId);
		await db
			.update(project)
			.set({ status: "delivered" })
			.where(eq(project.id, projectId));

		for (const who of [admin, manager, assistant]) {
			const res = await remove(who, projectId, a.tower.id);
			expect(res.status).toBe(409);
			expect(problemOf(res.body).code).toBe(PROJECT_DELIVERED);
		}
		expect(await exists(a.tower.id)).toBe(true);
	});

	it("never deletes a subtree that holds content", async () => {
		const projectId = await newProject(100);
		const { a } = await twoTowers(projectId);
		const hasContent = jest
			.spyOn(app.get(LocationContent), "hasContent")
			.mockResolvedValueOnce(true);
		const logged = jest.spyOn(console, "error").mockImplementation(() => {});

		const res = await remove(manager, projectId, a.tower.id);

		hasContent.mockRestore();
		logged.mockRestore();
		expect(res.status).toBe(500);
		expect(await exists(a.tower.id)).toBe(true);
		expect((await readStructure(projectId)).counts.units).toBe(8);
	});

	it("moves the project's last activity", async () => {
		const projectId = await newProject(100);
		const { a } = await twoTowers(projectId);
		const before = new Date("2026-01-01T00:00:00Z");
		await db
			.update(project)
			.set({ lastActivityAt: before })
			.where(eq(project.id, projectId));

		await remove(manager, projectId, a.tower.id);

		const [row] = await db
			.select({ at: project.lastActivityAt })
			.from(project)
			.where(eq(project.id, projectId));
		expect(row!.at.getTime()).toBeGreaterThan(before.getTime());
	});
});
