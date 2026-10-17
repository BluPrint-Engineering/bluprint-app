import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	type LocationDetail,
	LOCATION_KIND_INVALID,
	LOCATION_NOT_FOUND,
	locationDetailSchema,
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	ROOM_ID_TAKEN,
	ROOM_NAME_TAKEN,
	ROOM_NOT_FOUND,
	UNIT_TYPE_NOT_FOUND,
} from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
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
	tower: string;
	floor: string;
	unitA1: string;
	unitA2: string;
	unitBare: string;
	area: string;
	typeA: string;
	typeB: string;
	typeARooms: { sala: string; cozinha: string; sacada: string };
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
		])
		.returning({ id: unitType.id });
	const [typeA, typeB] = types.map((type) => type.id) as [string, string];
	const typeRooms = await db
		.insert(unitTypeRoom)
		.values([
			{ unitTypeId: typeA, name: "Sala", position: 0 },
			{ unitTypeId: typeA, name: "Cozinha", position: 1 },
			{ unitTypeId: typeA, name: "Sacada", position: 2 },
			{ unitTypeId: typeB, name: "Sala", position: 0 },
			{ unitTypeId: typeB, name: "Suíte", position: 1 },
		])
		.returning({ id: unitTypeRoom.id });
	const [sala, cozinha, sacada] = typeRooms.map((typeRoom) => typeRoom.id) as [
		string,
		string,
		string,
	];

	const units = await db
		.insert(location)
		.values([
			{
				projectId,
				parentId: floor!.id,
				type: "unit",
				name: "901",
				position: 0,
				unitTypeId: typeA,
			},
			{
				projectId,
				parentId: floor!.id,
				type: "unit",
				name: "902",
				position: 1,
				unitTypeId: typeA,
			},
			{
				projectId,
				parentId: floor!.id,
				type: "unit",
				name: "903",
				position: 2,
			},
			{
				projectId,
				parentId: tower!.id,
				type: "common_area",
				name: "Salão de festas",
				position: 1,
			},
		])
		.returning({ id: location.id });
	const [unitA1, unitA2, unitBare, area] = units.map((unit) => unit.id) as [
		string,
		string,
		string,
		string,
	];

	for (const unit of [unitA1, unitA2]) {
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
	await db.insert(room).values([
		{ locationId: unitBare, name: "Quarto", position: 0 },
		{ locationId: unitBare, name: "Banheiro", position: 1 },
		{ locationId: area, name: "Cozinha", position: 0 },
	]);

	return {
		projectId,
		tower: tower!.id,
		floor: floor!.id,
		unitA1,
		unitA2,
		unitBare,
		area,
		typeA,
		typeB,
		typeARooms: { sala, cozinha, sacada },
	};
}

const path = (w: World, rest: string) => `/api/projects/${w.projectId}/${rest}`;

const roomNames = (detail: LocationDetail) =>
	detail.rooms.map(({ name }) => name);

async function detailOf(w: World, locationId: string): Promise<LocationDetail> {
	const res = await admin.agent.get(path(w, `locations/${locationId}`));
	return locationDetailSchema.parse(res.body);
}

async function roomIdOf(w: World, locationId: string, name: string) {
	const found = (await detailOf(w, locationId)).rooms.find(
		(candidate) => candidate.name === name,
	);
	return found!.id;
}

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

describe("POST /api/projects/:id/locations/:locationId/rooms", () => {
	it("adds a room only the unit has, after its others, and counts it as a change", async () => {
		const w = await world();

		const res = await manager.agent
			.post(path(w, `locations/${w.unitA1}/rooms`))
			.send({ id: randomUUID(), name: "  Lavanderia " });

		expect(res.status).toBe(201);
		const detail = locationDetailSchema.parse(res.body);
		expect(roomNames(detail)).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
			"Lavanderia",
		]);
		expect(detail.rooms[3]).toMatchObject({
			unitTypeRoomId: null,
			renamed: false,
		});
		expect(detail.changes).toBe(1);
		expect(roomNames(await detailOf(w, w.unitA2))).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
		]);
	});

	it("adds a room to a unit without a unit type and to a common area", async () => {
		const w = await world();

		const bare = await assistant.agent
			.post(path(w, `locations/${w.unitBare}/rooms`))
			.send({ id: randomUUID(), name: "Varanda" });
		const area = await admin.agent
			.post(path(w, `locations/${w.area}/rooms`))
			.send({ id: randomUUID(), name: "Banheiro" });

		expect(bare.status).toBe(201);
		expect(roomNames(locationDetailSchema.parse(bare.body))).toEqual([
			"Quarto",
			"Banheiro",
			"Varanda",
		]);
		expect(locationDetailSchema.parse(bare.body).changes).toBe(0);
		expect(area.status).toBe(201);
		expect(roomNames(locationDetailSchema.parse(area.body))).toEqual([
			"Cozinha",
			"Banheiro",
		]);
	});

	it("answers the same 201 for the same id and adds nothing the second time", async () => {
		const w = await world();
		const body = { id: randomUUID(), name: "Lavanderia" };

		const first = await manager.agent
			.post(path(w, `locations/${w.unitA1}/rooms`))
			.send(body);
		const again = await manager.agent
			.post(path(w, `locations/${w.unitA1}/rooms`))
			.send(body);

		expect(again.status).toBe(201);
		expect(again.body).toEqual(first.body);
		expect(await db.$count(room, eq(room.locationId, w.unitA1))).toBe(4);
	});

	it("answers 409 ROOM_ID_TAKEN for an id that belongs to a room elsewhere", async () => {
		const w = await world();
		const taken = await roomIdOf(w, w.unitA2, "Sala");

		const res = await manager.agent
			.post(path(w, `locations/${w.unitA1}/rooms`))
			.send({ id: taken, name: "Lavanderia" });

		expect(res.status).toBe(409);
		expect(problemOf(res).code).toBe(ROOM_ID_TAKEN);
		expect(roomNames(await detailOf(w, w.unitA1))).not.toContain("Lavanderia");
	});

	it.each(["sala", "  SALA  ", "Sacada"])(
		"answers 409 ROOM_NAME_TAKEN for %j, ignoring case and spaces",
		async (name) => {
			const w = await world();

			const res = await manager.agent
				.post(path(w, `locations/${w.unitA1}/rooms`))
				.send({ id: randomUUID(), name });

			expect(res.status).toBe(409);
			expect(problemOf(res)).toMatchObject({
				code: ROOM_NAME_TAKEN,
				names: [name.trim()],
			});
		},
	);

	it("lets two units have a room of the same name", async () => {
		const w = await world();

		const res = await manager.agent
			.post(path(w, `locations/${w.unitBare}/rooms`))
			.send({ id: randomUUID(), name: "Sala" });

		expect(res.status).toBe(201);
	});

	it("answers 400 LOCATION_KIND_INVALID for a tower and a floor", async () => {
		const w = await world();

		for (const id of [w.tower, w.floor]) {
			const res = await manager.agent
				.post(path(w, `locations/${id}/rooms`))
				.send({ id: randomUUID(), name: "Sala" });
			expect(res.status).toBe(400);
			expect(problemOf(res).code).toBe(LOCATION_KIND_INVALID);
		}
	});

	it("answers 400 for an empty or oversized name", async () => {
		const w = await world();

		for (const name of ["   ", "x".repeat(61)]) {
			const res = await manager.agent
				.post(path(w, `locations/${w.unitA1}/rooms`))
				.send({ id: randomUUID(), name });
			expect(res.status).toBe(400);
		}
	});

	it("answers 404 LOCATION_NOT_FOUND for a location of another project", async () => {
		const w = await world();
		const other = await world();

		const res = await manager.agent
			.post(path(w, `locations/${other.unitA1}/rooms`))
			.send({ id: randomUUID(), name: "Lavanderia" });

		expect(res.status).toBe(404);
		expect(problemOf(res).code).toBe(LOCATION_NOT_FOUND);
	});

	it("answers 404 PROJECT_NOT_FOUND to whoever cannot see the project", async () => {
		const w = await world();

		for (const person of [unlinked, outsider]) {
			const res = await person.agent
				.post(path(w, `locations/${w.unitA1}/rooms`))
				.send({ id: randomUUID(), name: "Lavanderia" });
			expect(res.status).toBe(404);
			expect(problemOf(res).code).toBe(PROJECT_NOT_FOUND);
		}
		expect(await db.$count(room, eq(room.locationId, w.unitA1))).toBe(3);
	});

	it("answers 409 PROJECT_DELIVERED for a delivered project, whoever asks", async () => {
		const w = await world("delivered");

		for (const person of [admin, manager, assistant]) {
			const res = await person.agent
				.post(path(w, `locations/${w.unitA1}/rooms`))
				.send({ id: randomUUID(), name: "Lavanderia" });
			expect(res.status).toBe(409);
			expect(problemOf(res).code).toBe(PROJECT_DELIVERED);
		}
		expect(await db.$count(room, eq(room.locationId, w.unitA1))).toBe(3);
	});

	it("moves the project's last activity", async () => {
		const w = await world();
		const before = new Date("2020-01-01T00:00:00Z");
		await db
			.update(project)
			.set({ lastActivityAt: before })
			.where(eq(project.id, w.projectId));

		await manager.agent
			.post(path(w, `locations/${w.unitA1}/rooms`))
			.send({ id: randomUUID(), name: "Lavanderia" });

		const [after] = await db
			.select({ lastActivityAt: project.lastActivityAt })
			.from(project)
			.where(eq(project.id, w.projectId));
		expect(after!.lastActivityAt.getTime()).toBeGreaterThan(before.getTime());
	});

	it("never lets two requests at once leave the same name twice", async () => {
		const w = await world();

		const results = await Promise.all(
			[1, 2, 3].map(() =>
				manager.agent
					.post(path(w, `locations/${w.unitBare}/rooms`))
					.send({ id: randomUUID(), name: "Lavanderia" }),
			),
		);

		expect(results.map(({ status }) => status).sort()).toEqual([201, 409, 409]);
		expect(await db.$count(room, eq(room.locationId, w.unitBare))).toBe(3);
	});
});

describe("PATCH /api/projects/:id/rooms/:roomId", () => {
	it("renames a room of the unit type in this unit only, and counts it as a change", async () => {
		const w = await world();
		const sala = await roomIdOf(w, w.unitA1, "Sala");

		const res = await manager.agent
			.patch(path(w, `rooms/${sala}`))
			.send({ name: "Sala de estar" });

		expect(res.status).toBe(200);
		const detail = locationDetailSchema.parse(res.body);
		expect(roomNames(detail)).toEqual(["Sala de estar", "Cozinha", "Sacada"]);
		expect(detail.rooms[0]).toMatchObject({ renamed: true });
		expect(detail.changes).toBe(1);
		expect(roomNames(await detailOf(w, w.unitA2))[0]).toBe("Sala");
		const [typeRoom] = await db
			.select({ name: unitTypeRoom.name })
			.from(unitTypeRoom)
			.where(eq(unitTypeRoom.id, w.typeARooms.sala));
		expect(typeRoom!.name).toBe("Sala");
	});

	it("renames a room only the unit has and a room of a common area without a change", async () => {
		const w = await world();
		const quarto = await roomIdOf(w, w.unitBare, "Quarto");
		const cozinha = await roomIdOf(w, w.area, "Cozinha");

		const own = await assistant.agent
			.patch(path(w, `rooms/${quarto}`))
			.send({ name: "Suíte" });
		const common = await admin.agent
			.patch(path(w, `rooms/${cozinha}`))
			.send({ name: "Copa" });

		expect(own.status).toBe(200);
		expect(roomNames(locationDetailSchema.parse(own.body))[0]).toBe("Suíte");
		expect(locationDetailSchema.parse(own.body).rooms[0]).toMatchObject({
			renamed: false,
		});
		expect(roomNames(locationDetailSchema.parse(common.body))).toEqual([
			"Copa",
		]);
	});

	it("accepts a change of case or spacing on the room itself", async () => {
		const w = await world();
		const sala = await roomIdOf(w, w.unitA1, "Sala");

		const res = await manager.agent
			.patch(path(w, `rooms/${sala}`))
			.send({ name: "SALA" });

		expect(res.status).toBe(200);
		expect(roomNames(locationDetailSchema.parse(res.body))[0]).toBe("SALA");
	});

	it("answers 409 ROOM_NAME_TAKEN for the name of another room of the unit", async () => {
		const w = await world();
		const sala = await roomIdOf(w, w.unitA1, "Sala");

		const res = await manager.agent
			.patch(path(w, `rooms/${sala}`))
			.send({ name: " cozinha " });

		expect(res.status).toBe(409);
		expect(problemOf(res).code).toBe(ROOM_NAME_TAKEN);
		expect(roomNames(await detailOf(w, w.unitA1))[0]).toBe("Sala");
	});

	it("answers 404 ROOM_NOT_FOUND for a room that does not exist or is in another project", async () => {
		const w = await world();
		const other = await world();
		const foreign = await roomIdOf(other, other.unitA1, "Sala");

		for (const id of [randomUUID(), foreign]) {
			const res = await manager.agent
				.patch(path(w, `rooms/${id}`))
				.send({ name: "Lavanderia" });
			expect(res.status).toBe(404);
			expect(problemOf(res).code).toBe(ROOM_NOT_FOUND);
		}
		expect(roomNames(await detailOf(other, other.unitA1))[0]).toBe("Sala");
	});

	it("answers 404 PROJECT_NOT_FOUND to whoever cannot see the project", async () => {
		const w = await world();
		const sala = await roomIdOf(w, w.unitA1, "Sala");

		for (const person of [unlinked, outsider]) {
			const res = await person.agent
				.patch(path(w, `rooms/${sala}`))
				.send({ name: "Lavanderia" });
			expect(res.status).toBe(404);
			expect(problemOf(res).code).toBe(PROJECT_NOT_FOUND);
		}
	});

	it("answers 409 PROJECT_DELIVERED for a delivered project", async () => {
		const w = await world("delivered");
		const sala = await roomIdOf(w, w.unitA1, "Sala");

		const res = await manager.agent
			.patch(path(w, `rooms/${sala}`))
			.send({ name: "Lavanderia" });

		expect(res.status).toBe(409);
		expect(problemOf(res).code).toBe(PROJECT_DELIVERED);
	});
});

describe("DELETE /api/projects/:id/rooms/:roomId", () => {
	it("deletes a room only the unit has", async () => {
		const w = await world();
		const quarto = await roomIdOf(w, w.unitBare, "Quarto");

		const res = await manager.agent.delete(path(w, `rooms/${quarto}`));

		expect(res.status).toBe(200);
		expect(roomNames(locationDetailSchema.parse(res.body))).toEqual([
			"Banheiro",
		]);
		expect(
			await db.$count(droppedRoom, eq(droppedRoom.locationId, w.unitBare)),
		).toBe(0);
	});

	it("records a room of the unit type as taken out of this unit only", async () => {
		const w = await world();
		const sacada = await roomIdOf(w, w.unitA1, "Sacada");

		const res = await manager.agent.delete(path(w, `rooms/${sacada}`));

		expect(res.status).toBe(200);
		const detail = locationDetailSchema.parse(res.body);
		expect(roomNames(detail)).toEqual(["Sala", "Cozinha"]);
		expect(detail.droppedRooms).toEqual([
			{ unitTypeRoomId: w.typeARooms.sacada, name: "Sacada" },
		]);
		expect(detail.changes).toBe(1);
		expect(roomNames(await detailOf(w, w.unitA2))).toContain("Sacada");
	});

	it("deletes a room of a common area", async () => {
		const w = await world();
		const cozinha = await roomIdOf(w, w.area, "Cozinha");

		const res = await assistant.agent.delete(path(w, `rooms/${cozinha}`));

		expect(res.status).toBe(200);
		expect(locationDetailSchema.parse(res.body).rooms).toEqual([]);
	});

	it("answers 404 ROOM_NOT_FOUND the second time", async () => {
		const w = await world();
		const sala = await roomIdOf(w, w.unitA1, "Sala");
		await manager.agent.delete(path(w, `rooms/${sala}`));

		const again = await manager.agent.delete(path(w, `rooms/${sala}`));

		expect(again.status).toBe(404);
		expect(problemOf(again).code).toBe(ROOM_NOT_FOUND);
	});

	it("answers 409 PROJECT_DELIVERED for a delivered project and 404 for who cannot see it", async () => {
		const delivered = await world("delivered");
		const hidden = await world();
		const sala = await roomIdOf(delivered, delivered.unitA1, "Sala");
		const hiddenSala = await roomIdOf(hidden, hidden.unitA1, "Sala");

		const closed = await manager.agent.delete(path(delivered, `rooms/${sala}`));
		const unseen = await outsider.agent.delete(
			path(hidden, `rooms/${hiddenSala}`),
		);

		expect(closed.status).toBe(409);
		expect(problemOf(closed).code).toBe(PROJECT_DELIVERED);
		expect(unseen.status).toBe(404);
		expect(problemOf(unseen).code).toBe(PROJECT_NOT_FOUND);
		expect(roomNames(await detailOf(delivered, delivered.unitA1))).toContain(
			"Sala",
		);
	});
});

describe("DELETE /api/projects/:id/locations/:unitId/dropped-rooms/:unitTypeRoomId", () => {
	async function dropSacada(w: World) {
		const sacada = await roomIdOf(w, w.unitA1, "Sacada");
		await manager.agent.delete(path(w, `rooms/${sacada}`));
	}

	it("gives the room back with its name and place in the unit type", async () => {
		const w = await world();
		await dropSacada(w);

		const res = await manager.agent.delete(
			path(w, `locations/${w.unitA1}/dropped-rooms/${w.typeARooms.sacada}`),
		);

		expect(res.status).toBe(200);
		const detail = locationDetailSchema.parse(res.body);
		expect(roomNames(detail)).toEqual(["Sala", "Cozinha", "Sacada"]);
		expect(detail.rooms[2]?.unitTypeRoomId).toBe(w.typeARooms.sacada);
		expect(detail.droppedRooms).toEqual([]);
		expect(detail.changes).toBe(0);
	});

	it("answers 404 ROOM_NOT_FOUND for a room the unit did not take out", async () => {
		const w = await world();

		const res = await manager.agent.delete(
			path(w, `locations/${w.unitA1}/dropped-rooms/${w.typeARooms.sacada}`),
		);

		expect(res.status).toBe(404);
		expect(problemOf(res).code).toBe(ROOM_NOT_FOUND);
	});

	it("answers 409 ROOM_NAME_TAKEN when the unit has a room of that name by now", async () => {
		const w = await world();
		await dropSacada(w);
		await manager.agent
			.post(path(w, `locations/${w.unitA1}/rooms`))
			.send({ id: randomUUID(), name: "sacada" });

		const res = await manager.agent.delete(
			path(w, `locations/${w.unitA1}/dropped-rooms/${w.typeARooms.sacada}`),
		);

		expect(res.status).toBe(409);
		expect(problemOf(res).code).toBe(ROOM_NAME_TAKEN);
		expect((await detailOf(w, w.unitA1)).droppedRooms).toHaveLength(1);
	});

	it("answers 400 LOCATION_KIND_INVALID for a location that is not a unit", async () => {
		const w = await world();

		const res = await manager.agent.delete(
			path(w, `locations/${w.area}/dropped-rooms/${w.typeARooms.sacada}`),
		);

		expect(res.status).toBe(400);
		expect(problemOf(res).code).toBe(LOCATION_KIND_INVALID);
	});

	it("answers 409 PROJECT_DELIVERED for a delivered project", async () => {
		const w = await world("delivered");

		const res = await manager.agent.delete(
			path(w, `locations/${w.unitA1}/dropped-rooms/${w.typeARooms.sacada}`),
		);

		expect(res.status).toBe(409);
		expect(problemOf(res).code).toBe(PROJECT_DELIVERED);
	});
});

describe("PUT /api/projects/:id/locations/:unitId/unit-type", () => {
	async function changeUnitA1(w: World) {
		await manager.agent
			.post(path(w, `locations/${w.unitA1}/rooms`))
			.send({ id: randomUUID(), name: "Lavanderia" });
		await manager.agent.delete(
			path(w, `rooms/${await roomIdOf(w, w.unitA1, "Sacada")}`),
		);
		await manager.agent
			.patch(path(w, `rooms/${await roomIdOf(w, w.unitA1, "Sala")}`))
			.send({ name: "Sala de estar" });
	}

	it("starts the unit over on the rooms of the new unit type", async () => {
		const w = await world();
		await changeUnitA1(w);

		const res = await manager.agent
			.put(path(w, `locations/${w.unitA1}/unit-type`))
			.send({ unitTypeId: w.typeB });

		expect(res.status).toBe(200);
		const detail = locationDetailSchema.parse(res.body);
		expect(detail.unitType).toEqual({ id: w.typeB, name: "Tipologia B" });
		expect(roomNames(detail)).toEqual(["Sala", "Suíte"]);
		expect(detail.droppedRooms).toEqual([]);
		expect(detail.changes).toBe(0);
		expect(roomNames(await detailOf(w, w.unitA2))).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
		]);
	});

	it("gives a unit without a unit type the rooms of the one it takes", async () => {
		const w = await world();

		const res = await manager.agent
			.put(path(w, `locations/${w.unitBare}/unit-type`))
			.send({ unitTypeId: w.typeA });

		const detail = locationDetailSchema.parse(res.body);
		expect(roomNames(detail)).toEqual(["Sala", "Cozinha", "Sacada"]);
		expect(detail.unitType?.id).toBe(w.typeA);
	});

	it("keeps the current rooms, in order, as rooms only the unit has when it ends up without a unit type", async () => {
		const w = await world();
		await changeUnitA1(w);

		const res = await manager.agent
			.put(path(w, `locations/${w.unitA1}/unit-type`))
			.send({ unitTypeId: null });

		expect(res.status).toBe(200);
		const detail = locationDetailSchema.parse(res.body);
		expect(detail.unitType).toBeNull();
		expect(roomNames(detail)).toEqual([
			"Sala de estar",
			"Cozinha",
			"Lavanderia",
		]);
		expect(
			detail.rooms.every(({ unitTypeRoomId }) => unitTypeRoomId === null),
		).toBe(true);
		expect(detail.rooms.every(({ renamed }) => !renamed)).toBe(true);
		expect(detail.droppedRooms).toEqual([]);
		expect(detail.changes).toBe(0);
		expect(
			await db.$count(droppedRoom, eq(droppedRoom.locationId, w.unitA1)),
		).toBe(0);
	});

	it("changes nothing when the unit already follows that unit type", async () => {
		const w = await world();
		await changeUnitA1(w);

		const res = await manager.agent
			.put(path(w, `locations/${w.unitA1}/unit-type`))
			.send({ unitTypeId: w.typeA });

		expect(res.status).toBe(200);
		expect(locationDetailSchema.parse(res.body).changes).toBe(3);
	});

	it("answers 400 UNIT_TYPE_NOT_FOUND for a unit type of another project", async () => {
		const w = await world();
		const other = await world();

		for (const unitTypeId of [other.typeA, randomUUID()]) {
			const res = await manager.agent
				.put(path(w, `locations/${w.unitA1}/unit-type`))
				.send({ unitTypeId });
			expect(res.status).toBe(400);
			expect(problemOf(res).code).toBe(UNIT_TYPE_NOT_FOUND);
		}
		expect(roomNames(await detailOf(w, w.unitA1))).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
		]);
	});

	it("answers 400 LOCATION_KIND_INVALID for a location that is not a unit", async () => {
		const w = await world();

		const res = await manager.agent
			.put(path(w, `locations/${w.area}/unit-type`))
			.send({ unitTypeId: w.typeA });

		expect(res.status).toBe(400);
		expect(problemOf(res).code).toBe(LOCATION_KIND_INVALID);
	});

	it("answers 404 PROJECT_NOT_FOUND to who cannot see the project and 409 PROJECT_DELIVERED for a delivered one", async () => {
		const w = await world();
		const delivered = await world("delivered");

		const unseen = await outsider.agent
			.put(path(w, `locations/${w.unitA1}/unit-type`))
			.send({ unitTypeId: null });
		const closed = await manager.agent
			.put(path(delivered, `locations/${delivered.unitA1}/unit-type`))
			.send({ unitTypeId: null });

		expect(problemOf(unseen).code).toBe(PROJECT_NOT_FOUND);
		expect(problemOf(closed).code).toBe(PROJECT_DELIVERED);
		expect(
			(await detailOf(delivered, delivered.unitA1)).unitType,
		).not.toBeNull();
	});
});

describe("POST /api/projects/:id/locations/:unitId/unit-type/reset", () => {
	it("undoes the three kinds of change", async () => {
		const w = await world();
		await manager.agent
			.post(path(w, `locations/${w.unitA1}/rooms`))
			.send({ id: randomUUID(), name: "Lavanderia" });
		const sacada = await roomIdOf(w, w.unitA1, "Sacada");
		await manager.agent.delete(path(w, `rooms/${sacada}`));
		const sala = await roomIdOf(w, w.unitA1, "Sala");
		await manager.agent
			.patch(path(w, `rooms/${sala}`))
			.send({ name: "Sala de estar" });

		const res = await manager.agent.post(
			path(w, `locations/${w.unitA1}/unit-type/reset`),
		);

		expect(res.status).toBe(200);
		const detail = locationDetailSchema.parse(res.body);
		expect(roomNames(detail)).toEqual(["Sala", "Cozinha", "Sacada"]);
		expect(detail.rooms.every(({ renamed }) => !renamed)).toBe(true);
		expect(detail.droppedRooms).toEqual([]);
		expect(detail.changes).toBe(0);
		expect(detail.rooms[0]?.id).toBe(sala);
	});

	it("restores two rooms that swapped names", async () => {
		const w = await world();
		const sala = await roomIdOf(w, w.unitA1, "Sala");
		const cozinha = await roomIdOf(w, w.unitA1, "Cozinha");
		await manager.agent.patch(path(w, `rooms/${sala}`)).send({ name: "Tmp" });
		await manager.agent
			.patch(path(w, `rooms/${cozinha}`))
			.send({ name: "Sala" });
		await manager.agent
			.patch(path(w, `rooms/${sala}`))
			.send({ name: "Cozinha" });

		const res = await manager.agent.post(
			path(w, `locations/${w.unitA1}/unit-type/reset`),
		);

		expect(res.status).toBe(200);
		expect(roomNames(locationDetailSchema.parse(res.body))).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
		]);
	});

	it("leaves a unit without a unit type as it is", async () => {
		const w = await world();

		const res = await manager.agent.post(
			path(w, `locations/${w.unitBare}/unit-type/reset`),
		);

		expect(res.status).toBe(200);
		expect(roomNames(locationDetailSchema.parse(res.body))).toEqual([
			"Quarto",
			"Banheiro",
		]);
	});

	it("answers 400 LOCATION_KIND_INVALID for a location that is not a unit", async () => {
		const w = await world();

		const res = await manager.agent.post(
			path(w, `locations/${w.area}/unit-type/reset`),
		);

		expect(res.status).toBe(400);
		expect(problemOf(res).code).toBe(LOCATION_KIND_INVALID);
	});

	it("answers 409 PROJECT_DELIVERED for a delivered project", async () => {
		const w = await world("delivered");

		const res = await manager.agent.post(
			path(w, `locations/${w.unitA1}/unit-type/reset`),
		);

		expect(res.status).toBe(409);
		expect(problemOf(res).code).toBe(PROJECT_DELIVERED);
	});
});
