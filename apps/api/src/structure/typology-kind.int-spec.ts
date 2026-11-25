import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	LOCATION_KIND_INVALID,
	type LocationDetail,
	locationDetailSchema,
	problemDetailsSchema,
	structureSchema,
	subtreeRoomsSchema,
	TYPOLOGY_IN_USE,
	TYPOLOGY_KIND_MISMATCH,
	type Typology,
	typologyListSchema,
	typologySchema,
	updateTypologyResultSchema,
} from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "../db/database.module";
import { member, project } from "../db/schema";
import { location } from "./location.entity";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";

let app: INestApplication;
let server: Server;
let db: Database;
let admin: ReturnType<typeof request.agent>;
let organizationId: string;

async function newProject(): Promise<string> {
	const [created] = await db
		.insert(project)
		.values({ organizationId, name: "Casa Moinhos", reservedUnits: 50 })
		.returning({ id: project.id });
	return created!.id;
}

const roomNames = (detail: LocationDetail) =>
	detail.rooms.map(({ name }) => name);

beforeAll(async () => {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	server = app.getHttpServer() as Server;
	db = app.get<Database>(DATABASE);

	admin = request.agent(server);
	const res = await admin.post(SIGN_UP).send({
		email: `${randomUUID()}@example.com`,
		password: PASSWORD,
		name: "Admin da Construtora",
	});
	const userId = (res.body as { user: { id: string } }).user.id;
	const found = await db.query.member.findFirst({
		where: eq(member.userId, userId),
	});
	organizationId = found!.organizationId;
});

afterAll(async () => {
	await app.close();
});

describe("a typology of the right kind, step by step", () => {
	let projectId: string;
	const ids = {
		tower: randomUUID(),
		floor2: randomUUID(),
		hallType: randomUUID(),
		circulacao: randomUUID(),
		elevadores: randomUUID(),
		hall: randomUUID(),
		unitType: randomUUID(),
		sala: randomUUID(),
		unit201: randomUUID(),
		lixeira: randomUUID(),
		escada: randomUUID(),
	};

	const path = (rest: string) => `/api/projects/${projectId}/${rest}`;

	async function detailOf(locationId: string): Promise<LocationDetail> {
		const res = await admin.get(path(`locations/${locationId}`));
		return locationDetailSchema.parse(res.body);
	}

	async function typeOf(typologyId: string): Promise<Typology> {
		const res = await admin.get(path("typologies"));
		return typologyListSchema
			.parse(res.body)
			.typologies.find(({ id }) => id === typologyId)!;
	}

	beforeAll(async () => {
		projectId = await newProject();
		const res = await admin.post(path("structure")).send({
			locations: [
				{ id: ids.tower, parentId: null, type: "tower", name: "Torre A" },
				{
					id: ids.floor2,
					parentId: ids.tower,
					type: "floor",
					name: "2º andar",
				},
			],
		});
		expect(res.status).toBe(201);
	});

	it("1. creates Hall padrão as a common-area typology", async () => {
		const res = await admin.post(path("typologies")).send({
			id: ids.hallType,
			name: "Hall padrão",
			locationType: "common_area",
			rooms: [
				{ id: ids.circulacao, name: "Circulação" },
				{ id: ids.elevadores, name: "Elevadores" },
			],
		});

		expect(res.status).toBe(201);
		expect(typologySchema.parse(res.body)).toEqual({
			id: ids.hallType,
			name: "Hall padrão",
			locationType: "common_area",
			version: 1,
			rooms: [
				{ id: ids.circulacao, name: "Circulação" },
				{ id: ids.elevadores, name: "Elevadores" },
			],
			locationCount: 0,
			changedLocationCount: 0,
		});
	});

	it("2. creates a Hall on the 2nd floor that is born with the rooms of Hall padrão", async () => {
		const res = await admin.post(path("structure")).send({
			locations: [
				{
					id: ids.hall,
					parentId: ids.floor2,
					type: "common_area",
					name: "Hall",
					typologyId: ids.hallType,
				},
			],
		});

		expect(res.status).toBe(201);
		const hall = await detailOf(ids.hall);
		expect(hall.typology).toEqual({ id: ids.hallType, name: "Hall padrão" });
		expect(roomNames(hall)).toEqual(["Circulação", "Elevadores"]);
		expect(hall.changes).toBe(0);
		expect(hall.droppedRooms).toEqual([]);
		expect(await typeOf(ids.hallType)).toMatchObject({
			locationCount: 1,
			changedLocationCount: 0,
		});
	});

	it("3. refuses unit 201 following Hall padrão", async () => {
		const res = await admin.post(path("structure")).send({
			locations: [
				{
					id: ids.unit201,
					parentId: ids.floor2,
					type: "unit",
					name: "201",
					typologyId: ids.hallType,
				},
			],
		});

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe(
			TYPOLOGY_KIND_MISMATCH,
		);
		expect((await admin.get(path(`locations/${ids.unit201}`))).status).toBe(
			404,
		);
	});

	it("4. refuses changing the Hall to Tipologia A, a unit typology", async () => {
		const created = await admin.post(path("typologies")).send({
			id: ids.unitType,
			name: "Tipologia A",
			locationType: "unit",
			rooms: [{ id: ids.sala, name: "Sala" }],
		});
		expect(created.status).toBe(201);

		const res = await admin
			.put(path(`locations/${ids.hall}/typology`))
			.send({ typologyId: ids.unitType });

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe(
			TYPOLOGY_KIND_MISMATCH,
		);
		const hall = await detailOf(ids.hall);
		expect(hall.typology).toEqual({ id: ids.hallType, name: "Hall padrão" });
		expect(roomNames(hall)).toEqual(["Circulação", "Elevadores"]);
	});

	it("5. renames Circulação to Corredor, adds Lixeira and removes Elevadores in the Hall", async () => {
		const before = await detailOf(ids.hall);
		const roomId = (name: string) =>
			before.rooms.find((room) => room.name === name)!.id;

		const renamed = await admin
			.patch(path(`rooms/${roomId("Circulação")}`))
			.send({ name: "Corredor" });
		const added = await admin
			.post(path(`locations/${ids.hall}/rooms`))
			.send({ id: ids.lixeira, name: "Lixeira" });
		const removed = await admin.delete(path(`rooms/${roomId("Elevadores")}`));

		expect([renamed.status, added.status, removed.status]).toEqual([
			200, 201, 200,
		]);
		const hall = await detailOf(ids.hall);
		expect(roomNames(hall)).toEqual(["Corredor", "Lixeira"]);
		expect(hall.droppedRooms).toEqual([
			{ typologyRoomId: ids.elevadores, name: "Elevadores" },
		]);
		expect(hall.changes).toBe(3);
		expect(await typeOf(ids.hallType)).toMatchObject({
			locationCount: 1,
			changedLocationCount: 1,
		});
	});

	it("6. renames Circulação to Passagem and adds Escada in the typology, and the Hall keeps its changes", async () => {
		const res = await admin.patch(path(`typologies/${ids.hallType}`)).send({
			version: (await typeOf(ids.hallType)).version,
			rooms: [
				{ id: ids.circulacao, name: "Passagem" },
				{ id: ids.elevadores, name: "Elevadores" },
				{ id: ids.escada, name: "Escada" },
			],
		});

		expect(res.status).toBe(200);
		expect(
			updateTypologyResultSchema.parse(res.body).updatedLocationCount,
		).toBe(1);
		const hall = await detailOf(ids.hall);
		expect(roomNames(hall)).toEqual(["Corredor", "Escada", "Lixeira"]);
		expect(hall.droppedRooms).toEqual([
			{ typologyRoomId: ids.elevadores, name: "Elevadores" },
		]);
	});

	it("7. returns the Hall to Hall padrão: Passagem, Elevadores, Escada", async () => {
		const res = await admin.post(path(`locations/${ids.hall}/typology/reset`));

		expect(res.status).toBe(200);
		const hall = locationDetailSchema.parse(res.body);
		expect(roomNames(hall)).toEqual(["Passagem", "Elevadores", "Escada"]);
		expect(hall.droppedRooms).toEqual([]);
		expect(hall.changes).toBe(0);
	});

	it("8. refuses deleting Hall padrão while the Hall follows it", async () => {
		const res = await admin.delete(path(`typologies/${ids.hallType}`));

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body).code).toBe(TYPOLOGY_IN_USE);
		expect((await typeOf(ids.hallType)).name).toBe("Hall padrão");
	});

	it("9. keeps Hall padrão a common-area typology when a PATCH tries to change its kind", async () => {
		const alone = await admin.patch(path(`typologies/${ids.hallType}`)).send({
			version: (await typeOf(ids.hallType)).version,
			locationType: "unit",
		});
		const withName = await admin
			.patch(path(`typologies/${ids.hallType}`))
			.send({
				version: (await typeOf(ids.hallType)).version,
				name: "Hall padrão",
				locationType: "unit",
			});

		expect(alone.status).toBe(400);
		expect(problemDetailsSchema.parse(alone.body).code).toBe(
			"VALIDATION_FAILED",
		);
		expect(withName.status).toBe(200);
		expect((await typeOf(ids.hallType)).locationType).toBe("common_area");
	});

	it("10. the database refuses a unit pointing at Hall padrão", async () => {
		const write = db.insert(location).values({
			projectId,
			parentId: ids.floor2,
			type: "unit",
			name: "202",
			position: 9,
			typologyId: ids.hallType,
		});

		await expect(write).rejects.toMatchObject({
			cause: { constraint: "location_typology_fk" },
		});
	});

	it("11. removes the Hall as it was before step 7 and puts it back following Hall padrão with its changes", async () => {
		const before = await detailOf(ids.hall);
		const roomId = (name: string) =>
			before.rooms.find((room) => room.name === name)!.id;
		await admin
			.patch(path(`rooms/${roomId("Passagem")}`))
			.send({ name: "Corredor" });
		await admin
			.post(path(`locations/${ids.hall}/rooms`))
			.send({ id: ids.lixeira, name: "Lixeira" });
		await admin.delete(path(`rooms/${roomId("Elevadores")}`));
		const removed = await detailOf(ids.hall);

		const deleted = await admin.delete(path(`locations/${ids.hall}`));
		const undone = await admin.post(path("structure")).send({
			locations: [
				{
					id: removed.id,
					parentId: ids.floor2,
					type: "common_area",
					name: removed.name,
					position: removed.position,
					typologyId: ids.hallType,
					rooms: [
						{
							id: roomId("Passagem"),
							name: "Corredor",
							typologyRoomId: ids.circulacao,
							renamed: true,
						},
						{
							id: roomId("Escada"),
							name: "Escada",
							typologyRoomId: ids.escada,
						},
						{ id: ids.lixeira, name: "Lixeira" },
					],
					droppedRooms: [ids.elevadores],
				},
			],
		});

		expect([deleted.status, undone.status]).toEqual([200, 201]);
		const hall = await detailOf(ids.hall);
		expect(hall.typology).toEqual({ id: ids.hallType, name: "Hall padrão" });
		expect(roomNames(hall)).toEqual(["Corredor", "Escada", "Lixeira"]);
		expect(hall.droppedRooms).toEqual([
			{ typologyRoomId: ids.elevadores, name: "Elevadores" },
		]);
		expect(hall.changes).toBe(3);
	});
});

describe("common areas of the project, of a tower and of a floor", () => {
	let projectId: string;
	const ids = {
		tower: randomUUID(),
		floor: randomUUID(),
		salaoType: randomUUID(),
		pista: randomUUID(),
		copa: randomUUID(),
		corredorType: randomUUID(),
		circulacao: randomUUID(),
		ofProject: randomUUID(),
		ofTower: randomUUID(),
		ofFloor: randomUUID(),
		palco: randomUUID(),
	};

	const path = (rest: string) => `/api/projects/${projectId}/${rest}`;

	async function detailOf(locationId: string): Promise<LocationDetail> {
		const res = await admin.get(path(`locations/${locationId}`));
		return locationDetailSchema.parse(res.body);
	}

	async function typeOf(typologyId: string): Promise<Typology> {
		const res = await admin.get(path("typologies"));
		return typologyListSchema
			.parse(res.body)
			.typologies.find(({ id }) => id === typologyId)!;
	}

	beforeAll(async () => {
		projectId = await newProject();
		const area = (id: string, parentId: string | null, name: string) => ({
			id,
			parentId,
			type: "common_area",
			name,
			typologyId: ids.salaoType,
		});
		const res = await admin.post(path("structure")).send({
			typologies: [
				{
					id: ids.salaoType,
					name: "Salão de festas",
					locationType: "common_area",
					rooms: [
						{ id: ids.pista, name: "Pista" },
						{ id: ids.copa, name: "Copa" },
					],
				},
				{
					id: ids.corredorType,
					name: "Corredor",
					locationType: "common_area",
					rooms: [{ id: ids.circulacao, name: "Circulação" }],
				},
			],
			locations: [
				{ id: ids.tower, parentId: null, type: "tower", name: "Torre A" },
				{ id: ids.floor, parentId: ids.tower, type: "floor", name: "1º andar" },
				area(ids.ofProject, null, "Salão da obra"),
				area(ids.ofTower, ids.tower, "Salão da torre"),
				area(ids.ofFloor, ids.floor, "Salão do andar"),
			],
		});
		expect(res.status).toBe(201);
	});

	it("counts the common areas of the three levels as the typology's use", async () => {
		expect(await typeOf(ids.salaoType)).toMatchObject({
			locationType: "common_area",
			locationCount: 3,
			changedLocationCount: 0,
		});
		expect(await typeOf(ids.corredorType)).toMatchObject({
			locationCount: 0,
		});
	});

	it("lists each common area with its typology in the structure", async () => {
		const res = await admin.get(path("structure"));

		const structure = structureSchema.parse(res.body);
		const salao = { id: ids.salaoType, name: "Salão de festas" };
		expect(structure.commonAreas).toEqual([
			{ id: ids.ofProject, name: "Salão da obra", typology: salao },
		]);
		expect(structure.towers[0]!.commonAreas).toEqual([
			{ id: ids.ofTower, name: "Salão da torre", typology: salao },
		]);
		expect(structure.towers[0]!.floors[0]!.commonAreas).toEqual([
			{ id: ids.ofFloor, name: "Salão do andar", typology: salao },
		]);
	});

	it("reads what a copy of the tower needs from its common area: renamed, own and taken-out rooms", async () => {
		const before = await detailOf(ids.ofTower);
		const roomId = (name: string) =>
			before.rooms.find((room) => room.name === name)!.id;
		await admin.patch(path(`rooms/${roomId("Pista")}`)).send({ name: "Dança" });
		await admin
			.post(path(`locations/${ids.ofTower}/rooms`))
			.send({ id: ids.palco, name: "Palco" });
		await admin.delete(path(`rooms/${roomId("Copa")}`));

		const res = await admin.get(path(`locations/${ids.tower}/subtree-rooms`));

		const ofTower = subtreeRoomsSchema
			.parse(res.body)
			.locations.find(({ id }) => id === ids.ofTower)!;
		expect(ofTower.rooms).toEqual([
			{
				id: roomId("Pista"),
				name: "Dança",
				typologyRoomId: ids.pista,
				renamed: true,
			},
			{ id: ids.palco, name: "Palco", typologyRoomId: null, renamed: false },
		]);
		expect(ofTower.droppedRooms).toEqual([
			{ typologyRoomId: ids.copa, name: "Copa" },
		]);
		expect(await typeOf(ids.salaoType)).toMatchObject({
			locationCount: 3,
			changedLocationCount: 1,
		});
	});

	it("gives a taken-out room back to a common area", async () => {
		const res = await admin.delete(
			path(`locations/${ids.ofTower}/dropped-rooms/${ids.copa}`),
		);

		expect(res.status).toBe(200);
		const area = locationDetailSchema.parse(res.body);
		expect(roomNames(area)).toEqual(["Dança", "Copa", "Palco"]);
		expect(area.droppedRooms).toEqual([]);
	});

	it("starts a common area over on the rooms of another common-area typology", async () => {
		const res = await admin
			.put(path(`locations/${ids.ofTower}/typology`))
			.send({ typologyId: ids.corredorType });

		expect(res.status).toBe(200);
		const area = locationDetailSchema.parse(res.body);
		expect(area.typology).toEqual({ id: ids.corredorType, name: "Corredor" });
		expect(roomNames(area)).toEqual(["Circulação"]);
		expect(area.changes).toBe(0);
	});

	it("keeps the current rooms as the common area's own when it ends up without a typology", async () => {
		const res = await admin
			.put(path(`locations/${ids.ofFloor}/typology`))
			.send({ typologyId: null });

		expect(res.status).toBe(200);
		const area = locationDetailSchema.parse(res.body);
		expect(area.typology).toBeNull();
		expect(
			area.rooms.map(({ name, typologyRoomId }) => [name, typologyRoomId]),
		).toEqual([
			["Pista", null],
			["Copa", null],
		]);
		expect(await typeOf(ids.salaoType)).toMatchObject({ locationCount: 1 });
	});

	it("answers 400 validation for a location following a typology of another kind listed in the same request", async () => {
		const typologyId = randomUUID();
		const res = await admin.post(path("structure")).send({
			typologies: [
				{
					id: typologyId,
					name: "Tipologia A",
					locationType: "unit",
					rooms: [],
				},
			],
			locations: [
				{
					id: randomUUID(),
					parentId: ids.floor,
					type: "common_area",
					name: "Hall",
					typologyId,
				},
			],
		});

		expect(res.status).toBe(400);
		const problem = problemDetailsSchema.parse(res.body);
		expect(problem.code).toBe("VALIDATION_FAILED");
		expect(problem.errors?.map(({ pointer }) => pointer)).toEqual([
			"/body/locations/0/typologyId",
		]);
		expect((await typeOf(typologyId)) === undefined).toBe(true);
	});

	it("answers 400 TYPOLOGY_KIND_MISMATCH by the stored kind when a resent typology claims another", async () => {
		const res = await admin.post(path("structure")).send({
			typologies: [
				{
					id: ids.corredorType,
					name: "Corredor",
					locationType: "unit",
					rooms: [{ id: ids.circulacao, name: "Circulação" }],
				},
			],
			locations: [
				{
					id: randomUUID(),
					parentId: ids.floor,
					type: "unit",
					name: "101",
					typologyId: ids.corredorType,
				},
			],
		});

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe(
			TYPOLOGY_KIND_MISMATCH,
		);
		expect((await typeOf(ids.corredorType)).locationType).toBe("common_area");
	});

	it("refuses a tower or a floor following any typology", async () => {
		const res = await admin.post(path("structure")).send({
			locations: [
				{
					id: randomUUID(),
					parentId: ids.tower,
					type: "floor",
					name: "2º andar",
					typologyId: ids.corredorType,
				},
			],
		});
		const change = await admin
			.put(path(`locations/${ids.floor}/typology`))
			.send({ typologyId: ids.corredorType });

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("VALIDATION_FAILED");
		expect(change.status).toBe(400);
		expect(problemDetailsSchema.parse(change.body).code).toBe(
			LOCATION_KIND_INVALID,
		);
	});
});
