import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { and, eq } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "../db/database.module";
import {
	locationDiscipline,
	member,
	organization,
	project,
	projectMember,
	projectUse,
} from "../db/schema";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";

type Person = { userId: string; agent: ReturnType<typeof request.agent> };

interface Listed {
	id: string;
	name: string;
	applies: boolean;
}

interface Site {
	projectId: string;
	tower: string;
	floor: string;
	u201: string;
	u202: string;
	hall: string;
}

type Place = "Torre A" | "2º andar" | "201" | "202" | "Hall" | "203";
type Table = Record<Place, Record<string, boolean>>;

let app: INestApplication;
let server: Server;
let db: Database;

let admin: Person;
let manager: Person;
let assistant: Person;
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

async function createProject(): Promise<string> {
	const id = randomUUID();
	const res = await admin.agent
		.post("/api/projects")
		.send({ id, name: "Casa Moinhos", units: 10 });
	expect(res.status).toBe(201);
	await db.insert(projectMember).values([
		{ projectId: id, userId: manager.userId, role: "manager" },
		{ projectId: id, userId: assistant.userId, role: "assistant" },
	]);
	return id;
}

const structurePath = (projectId: string) =>
	`/api/projects/${projectId}/structure`;
const locationPath = (projectId: string, locationId: string) =>
	`/api/projects/${projectId}/locations/${locationId}`;
const togglePath = (
	projectId: string,
	locationId: string,
	disciplineId: string,
) => `${locationPath(projectId, locationId)}/disciplines/${disciplineId}`;

type NewLocation = {
	id: string;
	parentId: string | null;
	type: "tower" | "floor" | "unit" | "common_area";
	name: string;
	position: number;
};

const entry = (
	parentId: string | null,
	type: NewLocation["type"],
	name: string,
	position: number,
): NewLocation => ({ id: randomUUID(), parentId, type, name, position });

async function createSite(): Promise<Site> {
	const projectId = await createProject();
	const tower = entry(null, "tower", "Torre A", 0);
	const floor = entry(tower.id, "floor", "2º andar", 0);
	const u201 = entry(floor.id, "unit", "201", 0);
	const u202 = entry(floor.id, "unit", "202", 1);
	const hall = entry(floor.id, "common_area", "Hall", 2);
	const res = await admin.agent
		.post(structurePath(projectId))
		.send({ locations: [tower, floor, u201, u202, hall] });
	expect(res.status).toBe(201);
	return {
		projectId,
		tower: tower.id,
		floor: floor.id,
		u201: u201.id,
		u202: u202.id,
		hall: hall.id,
	};
}

async function addUnit(site: Site, name: string): Promise<string> {
	const unit = entry(site.floor, "unit", name, 3);
	const res = await admin.agent
		.post(structurePath(site.projectId))
		.send({ locations: [unit] });
	expect(res.status).toBe(201);
	return unit.id;
}

async function createDiscipline(
	site: Site,
	name: string,
	appliesEverywhere: boolean,
): Promise<string> {
	const id = randomUUID();
	const res = await admin.agent
		.post(`/api/projects/${site.projectId}/disciplines`)
		.send({ id, name, appliesEverywhere });
	expect(res.status).toBe(201);
	return id;
}

async function disciplineIdOf(
	projectId: string,
	name: string,
): Promise<string> {
	const res = await admin.agent.get(`/api/projects/${projectId}/disciplines`);
	const items = (res.body as { items: { id: string; name: string }[] }).items;
	return items.find((item) => item.name === name)!.id;
}

async function readDisciplines(
	projectId: string,
	locationId: string,
	who: Person = admin,
): Promise<Listed[]> {
	const res = await who.agent.get(locationPath(projectId, locationId));
	expect(res.status).toBe(200);
	return (res.body as { disciplines: Listed[] }).disciplines;
}

async function readTable(
	site: Site,
	extra: Partial<Record<Place, string>> = {},
): Promise<Partial<Table>> {
	const places: Record<string, string> = {
		"Torre A": site.tower,
		"2º andar": site.floor,
		"201": site.u201,
		"202": site.u202,
		Hall: site.hall,
		...extra,
	};
	const table: Record<string, Record<string, boolean>> = {};
	for (const [place, id] of Object.entries(places)) {
		table[place] = Object.fromEntries(
			(await readDisciplines(site.projectId, id)).map(({ name, applies }) => [
				name,
				applies,
			]),
		);
	}
	return table;
}

const toggle = (
	person: Person,
	site: Site,
	locationId: string,
	disciplineId: string,
	applies: unknown,
) =>
	person.agent
		.put(togglePath(site.projectId, locationId, disciplineId))
		.send({ applies });

const BASE_ONLY = { Hidráulica: true, Elétrica: true };

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
	outsider = await signUp("Pessoa de Outra Construtora");

	organizationId = await organizationOf(admin.userId);
	await joinOrganization(manager, "manager");
	await joinOrganization(assistant, "assistant");
});

afterAll(async () => {
	await app.close();
});

describe("what each location reads", () => {
	test("a fresh project reads Hidráulica and Elétrica on in all five locations and never General", async () => {
		const site = await createSite();

		expect(await readTable(site)).toEqual({
			"Torre A": BASE_ONLY,
			"2º andar": BASE_ONLY,
			"201": BASE_ONLY,
			"202": BASE_ONLY,
			Hall: BASE_ONLY,
		});
	});

	test("lists the disciplines in the order of the catalog, General left out", async () => {
		const site = await createSite();
		await createDiscipline(site, "Pintura", true);
		await createDiscipline(site, "Gesso", true);

		const listed = await readDisciplines(site.projectId, site.u201);

		expect(listed).toEqual([
			{
				id: await disciplineIdOf(site.projectId, "Hidráulica"),
				name: "Hidráulica",
				applies: true,
			},
			{
				id: await disciplineIdOf(site.projectId, "Elétrica"),
				name: "Elétrica",
				applies: true,
			},
			{
				id: await disciplineIdOf(site.projectId, "Pintura"),
				name: "Pintura",
				applies: true,
			},
			{
				id: await disciplineIdOf(site.projectId, "Gesso"),
				name: "Gesso",
				applies: true,
			},
		]);
	});

	test("walks the hostile sequence, checking every location after every step", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");

		expect(await readTable(site)).toEqual({
			"Torre A": BASE_ONLY,
			"2º andar": BASE_ONLY,
			"201": BASE_ONLY,
			"202": BASE_ONLY,
			Hall: BASE_ONLY,
		});

		const pintura = await createDiscipline(site, "Pintura", true);
		expect(await readTable(site)).toEqual({
			"Torre A": { ...BASE_ONLY, Pintura: false },
			"2º andar": { ...BASE_ONLY, Pintura: false },
			"201": { ...BASE_ONLY, Pintura: true },
			"202": { ...BASE_ONLY, Pintura: true },
			Hall: { ...BASE_ONLY, Pintura: true },
		});

		const piscina = await createDiscipline(site, "Piscina", false);
		expect(await readTable(site)).toEqual({
			"Torre A": { ...BASE_ONLY, Pintura: false, Piscina: false },
			"2º andar": { ...BASE_ONLY, Pintura: false, Piscina: false },
			"201": { ...BASE_ONLY, Pintura: true, Piscina: false },
			"202": { ...BASE_ONLY, Pintura: true, Piscina: false },
			Hall: { ...BASE_ONLY, Pintura: true, Piscina: false },
		});

		expect((await toggle(admin, site, site.hall, piscina, true)).status).toBe(
			200,
		);
		expect(await readTable(site)).toEqual({
			"Torre A": { ...BASE_ONLY, Pintura: false, Piscina: false },
			"2º andar": { ...BASE_ONLY, Pintura: false, Piscina: false },
			"201": { ...BASE_ONLY, Pintura: true, Piscina: false },
			"202": { ...BASE_ONLY, Pintura: true, Piscina: false },
			Hall: { ...BASE_ONLY, Pintura: true, Piscina: true },
		});

		expect(
			(await toggle(admin, site, site.floor, hidraulica, false)).status,
		).toBe(200);
		expect(await readTable(site)).toEqual({
			"Torre A": { ...BASE_ONLY, Pintura: false, Piscina: false },
			"2º andar": {
				Hidráulica: false,
				Elétrica: true,
				Pintura: false,
				Piscina: false,
			},
			"201": { ...BASE_ONLY, Pintura: true, Piscina: false },
			"202": { ...BASE_ONLY, Pintura: true, Piscina: false },
			Hall: { ...BASE_ONLY, Pintura: true, Piscina: true },
		});

		expect((await toggle(admin, site, site.u201, pintura, false)).status).toBe(
			200,
		);
		expect((await readTable(site))["201"]).toEqual({
			...BASE_ONLY,
			Pintura: false,
			Piscina: false,
		});
		expect((await readTable(site))["202"]).toEqual({
			...BASE_ONLY,
			Pintura: true,
			Piscina: false,
		});
		expect((await toggle(admin, site, site.u201, pintura, true)).status).toBe(
			200,
		);
		expect(await readTable(site)).toEqual({
			"Torre A": { ...BASE_ONLY, Pintura: false, Piscina: false },
			"2º andar": {
				Hidráulica: false,
				Elétrica: true,
				Pintura: false,
				Piscina: false,
			},
			"201": { ...BASE_ONLY, Pintura: true, Piscina: false },
			"202": { ...BASE_ONLY, Pintura: true, Piscina: false },
			Hall: { ...BASE_ONLY, Pintura: true, Piscina: true },
		});

		const u203 = await addUnit(site, "203");
		const fresh = await readTable(site, { "203": u203 });
		expect(fresh["203"]).toEqual({
			...BASE_ONLY,
			Pintura: true,
			Piscina: false,
		});
		expect(fresh["201"]).toEqual(fresh["202"]);
	});

	test("stores an exception only where the request differs from the default", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const stored = () =>
			db
				.select()
				.from(locationDiscipline)
				.where(eq(locationDiscipline.projectId, site.projectId));

		await toggle(admin, site, site.u201, hidraulica, true);
		expect(await stored()).toEqual([]);

		await toggle(admin, site, site.u201, hidraulica, false);
		expect(await stored()).toEqual([
			{
				locationId: site.u201,
				disciplineId: hidraulica,
				projectId: site.projectId,
				applies: false,
			},
		]);

		await toggle(admin, site, site.u201, hidraulica, true);
		expect(await stored()).toEqual([]);
	});

	test("turning on a discipline off by default and off again leaves no exception", async () => {
		const site = await createSite();
		const piscina = await createDiscipline(site, "Piscina", false);

		await toggle(admin, site, site.u201, piscina, true);
		await toggle(admin, site, site.u201, piscina, false);

		expect(
			await db
				.select()
				.from(locationDiscipline)
				.where(
					and(
						eq(locationDiscipline.locationId, site.u201),
						eq(locationDiscipline.disciplineId, piscina),
					),
				),
		).toEqual([]);
	});
});

describe("PUT /api/projects/:id/locations/:locationId/disciplines/:disciplineId", () => {
	test("answers the location's list after the change", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const eletrica = await disciplineIdOf(site.projectId, "Elétrica");

		const res = await toggle(admin, site, site.u201, hidraulica, false);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			disciplines: [
				{ id: hidraulica, name: "Hidráulica", applies: false },
				{ id: eletrica, name: "Elétrica", applies: true },
			],
		});
	});

	test("answers the same when the request is repeated", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");

		const first = await toggle(admin, site, site.u201, hidraulica, false);
		const second = await toggle(admin, site, site.u201, hidraulica, false);

		expect(second.status).toBe(200);
		expect(second.body).toEqual(first.body);
		expect(
			await db
				.select()
				.from(locationDiscipline)
				.where(eq(locationDiscipline.locationId, site.u201)),
		).toHaveLength(1);
	});

	test("refuses General with DISCIPLINE_IS_GENERAL and writes nothing", async () => {
		const site = await createSite();
		const geral = await disciplineIdOf(site.projectId, "Geral");

		for (const applies of [false, true]) {
			const res = await toggle(admin, site, site.u201, geral, applies);
			expect(res.status).toBe(409);
			expect(res.body).toMatchObject({ code: "DISCIPLINE_IS_GENERAL" });
		}
		expect(
			await db
				.select()
				.from(locationDiscipline)
				.where(eq(locationDiscipline.projectId, site.projectId)),
		).toEqual([]);
	});

	test("answers 404 DISCIPLINE_NOT_FOUND for a discipline that does not exist", async () => {
		const site = await createSite();

		const res = await toggle(admin, site, site.u201, randomUUID(), false);

		expect(res.status).toBe(404);
		expect(res.body).toMatchObject({ code: "DISCIPLINE_NOT_FOUND" });
	});

	test("answers 404 DISCIPLINE_NOT_FOUND for a discipline of another project", async () => {
		const site = await createSite();
		const other = await createSite();
		const foreign = await disciplineIdOf(other.projectId, "Hidráulica");

		const res = await toggle(admin, site, site.u201, foreign, false);

		expect(res.status).toBe(404);
		expect(res.body).toMatchObject({ code: "DISCIPLINE_NOT_FOUND" });
		expect(
			await db
				.select()
				.from(locationDiscipline)
				.where(eq(locationDiscipline.disciplineId, foreign)),
		).toEqual([]);
	});

	test("answers 404 LOCATION_NOT_FOUND for a location that does not exist or sits in another project", async () => {
		const site = await createSite();
		const other = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");

		for (const locationId of [randomUUID(), other.u201]) {
			const res = await toggle(admin, site, locationId, hidraulica, false);
			expect(res.status).toBe(404);
			expect(res.body).toMatchObject({ code: "LOCATION_NOT_FOUND" });
		}
	});

	test("answers 404 PROJECT_NOT_FOUND to someone who cannot see the project", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");

		const res = await toggle(outsider, site, site.u201, hidraulica, false);

		expect(res.status).toBe(404);
		expect(res.body).toMatchObject({ code: "PROJECT_NOT_FOUND" });
	});

	test.each([[undefined], ["false"], [null], [0]])(
		"answers 400 for applies %j",
		async (applies) => {
			const site = await createSite();
			const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");

			const res = await toggle(admin, site, site.u201, hidraulica, applies);

			expect(res.status).toBe(400);
		},
	);

	test("lets a manager and an assistant turn a discipline off and on", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");

		for (const who of [manager, assistant]) {
			const off = await toggle(who, site, site.u201, hidraulica, false);
			expect(off.status).toBe(200);
			expect(
				(await readDisciplines(site.projectId, site.u201, who))[0]!.applies,
			).toBe(false);
			expect(
				(await toggle(who, site, site.u201, hidraulica, true)).status,
			).toBe(200);
		}
	});

	test("refuses every change on a delivered project with PROJECT_DELIVERED", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		await db
			.update(project)
			.set({ status: "delivered" })
			.where(eq(project.id, site.projectId));

		for (const who of [admin, manager, assistant]) {
			const res = await toggle(who, site, site.u201, hidraulica, false);
			expect(res.status).toBe(409);
			expect(res.body).toMatchObject({ code: "PROJECT_DELIVERED" });
		}
		expect((await readDisciplines(site.projectId, site.u201))[0]!.applies).toBe(
			true,
		);
	});

	test("moves the project's last activity and my recent use, and stays still when refused", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const geral = await disciplineIdOf(site.projectId, "Geral");
		const before = new Date("2026-01-01T00:00:00Z");
		const reset = async () => {
			await db
				.update(project)
				.set({ lastActivityAt: before })
				.where(eq(project.id, site.projectId));
			await db
				.update(projectUse)
				.set({ lastUsedAt: before })
				.where(eq(projectUse.projectId, site.projectId));
		};
		const activity = async () =>
			(
				await db
					.select({ at: project.lastActivityAt })
					.from(project)
					.where(eq(project.id, site.projectId))
			)[0]!.at.getTime();
		const used = async () =>
			(
				await db
					.select({ at: projectUse.lastUsedAt })
					.from(projectUse)
					.where(
						and(
							eq(projectUse.projectId, site.projectId),
							eq(projectUse.userId, admin.userId),
						),
					)
			)[0]!.at.getTime();

		await reset();
		await toggle(admin, site, site.u201, hidraulica, false);
		expect(await activity()).toBeGreaterThan(before.getTime());
		expect(await used()).toBeGreaterThan(before.getTime());

		await reset();
		await toggle(admin, site, site.u201, geral, false);
		expect(await used()).toBe(before.getTime());
	});
});

describe("a location in a project that has no such discipline", () => {
	test("never leaks another project's catalog into a location read", async () => {
		const site = await createSite();
		await createDiscipline(site, "Pintura", true);
		const other = await createSite();

		expect(
			(await readDisciplines(other.projectId, other.u201)).map(
				({ name }) => name,
			),
		).toEqual(["Hidráulica", "Elétrica"]);
	});
});
