import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	type LocationDetail,
	locationDetailSchema,
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	ROOM_NAME_TAKEN,
	UNIT_TYPE_ID_TAKEN,
	UNIT_TYPE_IN_USE,
	UNIT_TYPE_NAME_TAKEN,
	UNIT_TYPE_NOT_FOUND,
	type UnitType,
	unitTypeListSchema,
	unitTypeSchema,
	updateUnitTypeResultSchema,
} from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { and, eq } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "../db/database.module";
import { member, organization, project, projectMember } from "../db/schema";
import { location } from "./location.entity";
import { droppedRoom, room } from "./room.entity";
import { unitType, unitTypeRoom } from "./unit-type.entity";

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

async function joinOrganization(person: Person, role: "manager" | "assistant") {
	await db
		.delete(organization)
		.where(eq(organization.id, await organizationOf(person.userId)));
	await db
		.insert(member)
		.values({ organizationId, userId: person.userId, role });
}

interface World {
	projectId: string;
	typeA: string;
	typeB: string;
	spare: string;
	rooms: { sala: string; cozinha: string; sacada: string; suite: string };
	plain: string;
	renamer: string;
	owner: string;
	typeBUnit: string;
}

async function world(
	status: "active" | "delivered" = "active",
): Promise<World> {
	const [created] = await db
		.insert(project)
		.values({ organizationId, name: "Casa Moinhos", reservedUnits: 50, status })
		.returning({ id: project.id });
	const projectId = created!.id;
	await db.insert(projectMember).values([
		{ projectId, userId: manager.userId, role: "manager" },
		{ projectId, userId: assistant.userId, role: "assistant" },
	]);

	const [tower] = await db
		.insert(location)
		.values({ projectId, type: "tower", name: "Torre A", position: 0 })
		.returning({ id: location.id });
	const [floor] = await db
		.insert(location)
		.values({
			projectId,
			parentId: tower!.id,
			type: "floor",
			name: "9º andar",
			position: 0,
		})
		.returning({ id: location.id });

	const types = await db
		.insert(unitType)
		.values([
			{ projectId, name: "Tipologia A" },
			{ projectId, name: "Tipologia B" },
			{ projectId, name: "Tipologia C" },
		])
		.returning({ id: unitType.id });
	const [typeA, typeB, spare] = types.map((type) => type.id) as [
		string,
		string,
		string,
	];
	const typeRooms = await db
		.insert(unitTypeRoom)
		.values([
			{ unitTypeId: typeA, name: "Sala", position: 0 },
			{ unitTypeId: typeA, name: "Cozinha", position: 1 },
			{ unitTypeId: typeA, name: "Sacada", position: 2 },
			{ unitTypeId: typeB, name: "Suíte", position: 0 },
		])
		.returning({ id: unitTypeRoom.id });
	const [sala, cozinha, sacada, suite] = typeRooms.map(({ id }) => id) as [
		string,
		string,
		string,
		string,
	];

	const units = await db
		.insert(location)
		.values(
			[
				["901", typeA],
				["902", typeA],
				["903", typeA],
				["904", typeB],
			].map(([name, unitTypeId], position) => ({
				projectId,
				parentId: floor!.id,
				type: "unit" as const,
				name: name!,
				position,
				unitTypeId: unitTypeId!,
			})),
		)
		.returning({ id: location.id });
	const [plain, renamer, owner, typeBUnit] = units.map(({ id }) => id) as [
		string,
		string,
		string,
		string,
	];

	for (const unit of [plain, renamer, owner]) {
		await db.insert(room).values(
			[
				["Sala", sala],
				["Cozinha", cozinha],
				["Sacada", sacada],
			].map(([name, id], position) => ({
				locationId: unit,
				name: name!,
				position,
				unitTypeRoomId: id!,
			})),
		);
	}
	await db
		.update(room)
		.set({ name: "Estar", renamed: true })
		.where(and(eq(room.locationId, renamer), eq(room.unitTypeRoomId, sala)));
	await db.insert(room).values({
		locationId: owner,
		name: "Lavanderia",
		position: 3,
	});
	await db.insert(room).values({
		locationId: typeBUnit,
		name: "Suíte",
		position: 0,
		unitTypeRoomId: suite,
	});

	return {
		projectId,
		typeA,
		typeB,
		spare,
		rooms: { sala, cozinha, sacada, suite },
		plain,
		renamer,
		owner,
		typeBUnit,
	};
}

const path = (w: World, rest: string) => `/api/projects/${w.projectId}/${rest}`;

const roomNames = (detail: LocationDetail) =>
	detail.rooms.map(({ name }) => name);

async function detailOf(w: World, locationId: string): Promise<LocationDetail> {
	const res = await admin.agent.get(path(w, `locations/${locationId}`));
	return locationDetailSchema.parse(res.body);
}

async function typeOf(w: World, unitTypeId: string): Promise<UnitType> {
	const res = await admin.agent.get(path(w, "unit-types"));
	return unitTypeListSchema
		.parse(res.body)
		.unitTypes.find(({ id }) => id === unitTypeId)!;
}

const roomsOf = (type: UnitType) =>
	type.rooms.map(({ id, name }) => ({ id, name }));

function problemOf(res: request.Response) {
	return problemDetailsSchema.parse(res.body);
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
	await joinOrganization(manager, "manager");
	await joinOrganization(assistant, "assistant");
	await joinOrganization(unlinked, "manager");
});

afterAll(async () => {
	await app.close();
});

describe("POST /api/projects/:id/unit-types", () => {
	it("creates a unit type with its rooms in the order sent", async () => {
		const w = await world();
		const rooms = [
			{ id: randomUUID(), name: "Quarto" },
			{ id: randomUUID(), name: " Banheiro " },
		];

		const res = await manager.agent
			.post(path(w, "unit-types"))
			.send({ id: randomUUID(), name: "  Tipologia D ", rooms });

		expect(res.status).toBe(201);
		const created = unitTypeSchema.parse(res.body);
		expect(created).toMatchObject({
			name: "Tipologia D",
			unitCount: 0,
			changedUnitCount: 0,
		});
		expect(created.rooms.map(({ name }) => name)).toEqual([
			"Quarto",
			"Banheiro",
		]);
		expect((await typeOf(w, created.id)).rooms).toEqual(created.rooms);
	});

	it("starts without rooms when none are sent", async () => {
		const w = await world();

		const res = await manager.agent
			.post(path(w, "unit-types"))
			.send({ id: randomUUID(), name: "Tipologia D" });

		expect(res.status).toBe(201);
		expect(unitTypeSchema.parse(res.body).rooms).toEqual([]);
	});

	it("answers the same 201 for the same id and creates nothing the second time", async () => {
		const w = await world();
		const body = {
			id: randomUUID(),
			name: "Tipologia D",
			rooms: [{ id: randomUUID(), name: "Quarto" }],
		};

		const first = await manager.agent.post(path(w, "unit-types")).send(body);
		const again = await manager.agent.post(path(w, "unit-types")).send(body);

		expect(again.status).toBe(201);
		expect(again.body).toEqual(first.body);
		expect(await db.$count(unitType, eq(unitType.projectId, w.projectId))).toBe(
			4,
		);
	});

	it("answers 409 UNIT_TYPE_ID_TAKEN for an id or a room id that belongs elsewhere", async () => {
		const w = await world();
		const other = await world();

		const type = await manager.agent
			.post(path(w, "unit-types"))
			.send({ id: other.typeA, name: "Tipologia D" });
		const roomId = await manager.agent.post(path(w, "unit-types")).send({
			id: randomUUID(),
			name: "Tipologia D",
			rooms: [{ id: other.rooms.sala, name: "Quarto" }],
		});

		expect(type.status).toBe(409);
		expect(problemOf(type).code).toBe(UNIT_TYPE_ID_TAKEN);
		expect(roomId.status).toBe(409);
		expect(problemOf(roomId).code).toBe(UNIT_TYPE_ID_TAKEN);
	});

	it("answers 409 UNIT_TYPE_NAME_TAKEN for a name in use, ignoring case and spacing", async () => {
		const w = await world();

		const res = await manager.agent
			.post(path(w, "unit-types"))
			.send({ id: randomUUID(), name: "  tipologia   a " });

		expect(res.status).toBe(409);
		expect(problemOf(res)).toMatchObject({
			code: UNIT_TYPE_NAME_TAKEN,
			names: ["tipologia   a"],
		});
	});

	it("answers 400 for a repeated room name or id, an empty name and too many rooms", async () => {
		const w = await world();
		const same = randomUUID();
		const send = (body: object) =>
			manager.agent.post(path(w, "unit-types")).send(body);

		const names = await send({
			id: randomUUID(),
			name: "D",
			rooms: [
				{ id: randomUUID(), name: "Quarto" },
				{ id: randomUUID(), name: " quarto" },
			],
		});
		const ids = await send({
			id: randomUUID(),
			name: "D",
			rooms: [
				{ id: same, name: "Quarto" },
				{ id: same, name: "Sala" },
			],
		});
		const empty = await send({ id: randomUUID(), name: "  " });
		const many = await send({
			id: randomUUID(),
			name: "D",
			rooms: Array.from({ length: 51 }, (_, index) => ({
				id: randomUUID(),
				name: `Cômodo ${index}`,
			})),
		});

		expect([names.status, ids.status, empty.status, many.status]).toEqual([
			400, 400, 400, 400,
		]);
	});

	it("lets the assistant and the admin create, and hides the project from who cannot see it", async () => {
		const w = await world();

		for (const person of [assistant, admin]) {
			const res = await person.agent
				.post(path(w, "unit-types"))
				.send({ id: randomUUID(), name: `Tipologia de ${person.userId}` });
			expect(res.status).toBe(201);
		}
		for (const person of [unlinked, outsider]) {
			const res = await person.agent
				.post(path(w, "unit-types"))
				.send({ id: randomUUID(), name: "Tipologia D" });
			expect(res.status).toBe(404);
			expect(problemOf(res).code).toBe(PROJECT_NOT_FOUND);
		}
	});

	it("answers 409 PROJECT_DELIVERED for a delivered project", async () => {
		const w = await world("delivered");

		const res = await manager.agent
			.post(path(w, "unit-types"))
			.send({ id: randomUUID(), name: "Tipologia D" });

		expect(res.status).toBe(409);
		expect(problemOf(res).code).toBe(PROJECT_DELIVERED);
	});

	it("moves the project's last activity", async () => {
		const w = await world();
		const before = new Date("2026-01-01T00:00:00Z");
		await db
			.update(project)
			.set({ lastActivityAt: before })
			.where(eq(project.id, w.projectId));

		await manager.agent
			.post(path(w, "unit-types"))
			.send({ id: randomUUID(), name: "Tipologia D" });

		const [after] = await db
			.select({ lastActivityAt: project.lastActivityAt })
			.from(project)
			.where(eq(project.id, w.projectId));
		expect(after!.lastActivityAt.getTime()).toBeGreaterThan(before.getTime());
	});
});

describe("PATCH /api/projects/:id/unit-types/:unitTypeId", () => {
	const patch = (w: World, unitTypeId: string, body: object, as = manager) =>
		as.agent.patch(path(w, `unit-types/${unitTypeId}`)).send(body);

	async function listOf(w: World, unitTypeId: string) {
		return roomsOf(await typeOf(w, unitTypeId));
	}

	it("renames the unit type without touching any unit", async () => {
		const w = await world();

		const res = await patch(w, w.typeA, { name: "  Tipologia Z " });

		expect(res.status).toBe(200);
		const result = updateUnitTypeResultSchema.parse(res.body);
		expect(result.unitType).toMatchObject({
			name: "Tipologia Z",
			unitCount: 3,
		});
		expect(result.updatedUnitCount).toBe(0);
		expect(roomNames(await detailOf(w, w.plain))).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
		]);
	});

	it("accepts its own name again, even with another case, and refuses another unit type's", async () => {
		const w = await world();

		const same = await patch(w, w.typeA, { name: "tipologia a" });
		const taken = await patch(w, w.typeA, { name: " tipologia  b " });

		expect(same.status).toBe(200);
		expect(taken.status).toBe(409);
		expect(problemOf(taken)).toMatchObject({
			code: UNIT_TYPE_NAME_TAKEN,
			names: ["tipologia  b"],
		});
	});

	it("enters a new room in every unit and counts them", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const res = await patch(w, w.typeA, {
			rooms: [...current, { id: randomUUID(), name: "Varanda" }],
		});

		expect(res.status).toBe(200);
		expect(updateUnitTypeResultSchema.parse(res.body).updatedUnitCount).toBe(3);
		for (const unit of [w.plain, w.renamer]) {
			expect(roomNames(await detailOf(w, unit))).toEqual([
				expect.any(String),
				"Cozinha",
				"Sacada",
				"Varanda",
			]);
		}
		const bType = await detailOf(w, w.typeBUnit);
		expect(roomNames(bType)).toEqual(["Suíte"]);
	});

	it("lets a unit adopt the room it already has on its own when the unit type adds one of that name", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const res = await patch(w, w.typeA, {
			rooms: [...current, { id: randomUUID(), name: " lavanderia" }],
		});

		expect(res.status).toBe(200);
		expect(updateUnitTypeResultSchema.parse(res.body).updatedUnitCount).toBe(3);
		const owner = await detailOf(w, w.owner);
		expect(roomNames(owner)).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
			"lavanderia",
		]);
		expect(owner.rooms[3]?.unitTypeRoomId).not.toBeNull();
		expect(owner.changes).toBe(0);
	});

	it("renames a room where the unit did not rename it", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const res = await patch(w, w.typeA, {
			rooms: current.map((entry) =>
				entry.id === w.rooms.cozinha ? { ...entry, name: "Copa" } : entry,
			),
		});

		expect(res.status).toBe(200);
		expect(updateUnitTypeResultSchema.parse(res.body).updatedUnitCount).toBe(3);
		expect(roomNames(await detailOf(w, w.plain))).toContain("Copa");
		expect(roomNames(await detailOf(w, w.owner))).toContain("Copa");
	});

	it("keeps the name a unit gave a room of the unit type", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const res = await patch(w, w.typeA, {
			rooms: current.map((entry) =>
				entry.id === w.rooms.sala ? { ...entry, name: "Living" } : entry,
			),
		});

		expect(res.status).toBe(200);
		expect(updateUnitTypeResultSchema.parse(res.body).updatedUnitCount).toBe(2);
		const renamer = await detailOf(w, w.renamer);
		expect(roomNames(renamer)[0]).toBe("Estar");
		expect(renamer.rooms[0]).toMatchObject({ renamed: true });
		expect(roomNames(await detailOf(w, w.plain))[0]).toBe("Living");
	});

	it("takes a room out of every unit but the ones that renamed it, where it stays as theirs", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const res = await patch(w, w.typeA, {
			rooms: current.filter(({ id }) => id !== w.rooms.sala),
		});

		expect(res.status).toBe(200);
		expect(updateUnitTypeResultSchema.parse(res.body).updatedUnitCount).toBe(2);
		expect(roomNames(await detailOf(w, w.plain))).toEqual([
			"Cozinha",
			"Sacada",
		]);
		const renamer = await detailOf(w, w.renamer);
		expect(roomNames(renamer)).toEqual(["Cozinha", "Sacada", "Estar"]);
		expect(renamer.rooms[2]).toMatchObject({
			unitTypeRoomId: null,
			renamed: false,
		});
		expect(renamer.changes).toBe(1);
	});

	it("forgets the units that had already taken out a room that leaves", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);
		await db.insert(droppedRoom).values({
			locationId: w.plain,
			unitTypeRoomId: w.rooms.sacada,
		});
		await db
			.delete(room)
			.where(
				and(
					eq(room.locationId, w.plain),
					eq(room.unitTypeRoomId, w.rooms.sacada),
				),
			);

		await patch(w, w.typeA, {
			rooms: current.filter(({ id }) => id !== w.rooms.sacada),
		});

		expect(
			await db.$count(droppedRoom, eq(droppedRoom.locationId, w.plain)),
		).toBe(0);
	});

	it("keeps the rooms only a unit has and the rooms it took out", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);
		await db.insert(droppedRoom).values({
			locationId: w.plain,
			unitTypeRoomId: w.rooms.cozinha,
		});
		await db
			.delete(room)
			.where(
				and(
					eq(room.locationId, w.plain),
					eq(room.unitTypeRoomId, w.rooms.cozinha),
				),
			);

		await patch(w, w.typeA, {
			rooms: [...current, { id: randomUUID(), name: "Varanda" }],
		});

		expect(roomNames(await detailOf(w, w.owner))).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
			"Varanda",
			"Lavanderia",
		]);
		const plain = await detailOf(w, w.plain);
		expect(roomNames(plain)).toEqual(["Sala", "Sacada", "Varanda"]);
		expect(plain.droppedRooms.map(({ name }) => name)).toEqual(["Cozinha"]);
	});

	it("reorders the rooms for every unit", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const res = await patch(w, w.typeA, { rooms: [...current].reverse() });

		expect(res.status).toBe(200);
		expect(updateUnitTypeResultSchema.parse(res.body).updatedUnitCount).toBe(3);
		expect(roomNames(await detailOf(w, w.plain))).toEqual([
			"Sacada",
			"Cozinha",
			"Sala",
		]);
		expect(roomNames(await detailOf(w, w.owner))).toEqual([
			"Sacada",
			"Cozinha",
			"Sala",
			"Lavanderia",
		]);
	});

	it("lets two rooms swap names", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const res = await patch(w, w.typeA, {
			rooms: current.map((entry) => {
				if (entry.id === w.rooms.cozinha) return { ...entry, name: "Sacada" };
				if (entry.id === w.rooms.sacada) return { ...entry, name: "Cozinha" };
				return entry;
			}),
		});

		expect(res.status).toBe(200);
		expect(roomNames(await detailOf(w, w.plain))).toEqual([
			"Sala",
			"Sacada",
			"Cozinha",
		]);
	});

	it("answers 409 ROOM_NAME_TAKEN and changes nothing when a unit has a room of the new name that the unit type cannot take over", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const res = await patch(w, w.typeA, {
			rooms: [...current, { id: randomUUID(), name: "Estar" }],
		});

		expect(res.status).toBe(409);
		expect(problemOf(res)).toMatchObject({
			code: ROOM_NAME_TAKEN,
			names: ["Estar"],
		});
		expect(await listOf(w, w.typeA)).toEqual(current);
		expect(roomNames(await detailOf(w, w.plain))).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
		]);
	});

	it("answers 409 ROOM_NAME_TAKEN when a rename lands on a room a unit has on its own", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const res = await patch(w, w.typeA, {
			rooms: current.map((entry) =>
				entry.id === w.rooms.cozinha ? { ...entry, name: "Lavanderia" } : entry,
			),
		});

		expect(res.status).toBe(409);
		expect(problemOf(res)).toMatchObject({
			code: ROOM_NAME_TAKEN,
			names: ["Lavanderia"],
		});
		expect(roomNames(await detailOf(w, w.owner))).toContain("Cozinha");
	});

	it("answers 409 UNIT_TYPE_ID_TAKEN for a room id of another unit type", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const res = await patch(w, w.typeA, {
			rooms: [...current, { id: w.rooms.suite, name: "Suíte" }],
		});

		expect(res.status).toBe(409);
		expect(problemOf(res).code).toBe(UNIT_TYPE_ID_TAKEN);
	});

	it("answers 400 for a body with nothing to change or a repeated room name", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const empty = await patch(w, w.typeA, {});
		const repeated = await patch(w, w.typeA, {
			rooms: [...current, { id: randomUUID(), name: " sala" }],
		});

		expect(empty.status).toBe(400);
		expect(repeated.status).toBe(400);
	});

	it("answers 404 UNIT_TYPE_NOT_FOUND for a unit type of another project", async () => {
		const w = await world();
		const other = await world();

		const res = await patch(w, other.typeA, { name: "Outra" });

		expect(res.status).toBe(404);
		expect(problemOf(res).code).toBe(UNIT_TYPE_NOT_FOUND);
	});

	it("lets the assistant edit, and answers 404 PROJECT_NOT_FOUND to who cannot see the project and 409 PROJECT_DELIVERED for a delivered one", async () => {
		const w = await world();
		const closed = await world("delivered");

		const allowed = await patch(w, w.typeA, { name: "Z" }, assistant);
		const hidden = await patch(w, w.typeA, { name: "Y" }, outsider);
		const unseen = await patch(w, w.typeA, { name: "Y" }, unlinked);
		const shut = await patch(closed, closed.typeA, { name: "Y" }, admin);

		expect(allowed.status).toBe(200);
		expect(hidden.status).toBe(404);
		expect(problemOf(hidden).code).toBe(PROJECT_NOT_FOUND);
		expect(unseen.status).toBe(404);
		expect(shut.status).toBe(409);
		expect(problemOf(shut).code).toBe(PROJECT_DELIVERED);
	});

	it("never lets two edits at once leave a unit with the same room twice", async () => {
		const w = await world();
		const current = await listOf(w, w.typeA);

		const results = await Promise.all(
			[1, 2, 3].map((index) =>
				patch(w, w.typeA, {
					rooms: [...current, { id: randomUUID(), name: `Varanda ${index}` }],
				}),
			),
		);

		expect(results.map(({ status }) => status)).toEqual([200, 200, 200]);
		const names = roomNames(await detailOf(w, w.plain));
		expect(new Set(names).size).toBe(names.length);
	});
});

describe("DELETE /api/projects/:id/unit-types/:unitTypeId", () => {
	const remove = (w: World, unitTypeId: string, as = manager) =>
		as.agent.delete(path(w, `unit-types/${unitTypeId}`));

	it("deletes a unit type that no unit follows and answers the ones left", async () => {
		const w = await world();

		const res = await remove(w, w.spare);

		expect(res.status).toBe(200);
		expect(
			unitTypeListSchema.parse(res.body).unitTypes.map(({ name }) => name),
		).toEqual(["Tipologia A", "Tipologia B"]);
	});

	it("answers 409 UNIT_TYPE_IN_USE for a unit type with units and keeps it", async () => {
		const w = await world();

		const res = await remove(w, w.typeA);

		expect(res.status).toBe(409);
		expect(problemOf(res).code).toBe(UNIT_TYPE_IN_USE);
		expect((await typeOf(w, w.typeA)).unitCount).toBe(3);
	});

	it("answers 404 UNIT_TYPE_NOT_FOUND for a unit type that is gone or belongs to another project", async () => {
		const w = await world();
		const other = await world();
		await remove(w, w.spare);

		const gone = await remove(w, w.spare);
		const elsewhere = await remove(w, other.spare);

		expect(problemOf(gone).code).toBe(UNIT_TYPE_NOT_FOUND);
		expect(elsewhere.status).toBe(404);
		expect(problemOf(elsewhere).code).toBe(UNIT_TYPE_NOT_FOUND);
	});

	it("lets the assistant delete, and answers 404 PROJECT_NOT_FOUND to who cannot see the project and 409 PROJECT_DELIVERED for a delivered one", async () => {
		const w = await world();
		const closed = await world("delivered");

		const hidden = await remove(w, w.spare, outsider);
		const shut = await remove(closed, closed.spare, admin);
		const allowed = await remove(w, w.spare, assistant);

		expect(hidden.status).toBe(404);
		expect(problemOf(hidden).code).toBe(PROJECT_NOT_FOUND);
		expect(shut.status).toBe(409);
		expect(problemOf(shut).code).toBe(PROJECT_DELIVERED);
		expect(allowed.status).toBe(200);
	});
});
