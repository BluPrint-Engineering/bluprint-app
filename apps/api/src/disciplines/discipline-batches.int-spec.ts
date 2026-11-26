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
	location,
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
type Kind = "tower" | "floor" | "unit" | "common_area";
type Entry = {
	id: string;
	parentId: string | null;
	type: Kind;
	name: string;
	position: number;
};
type Row = Record<string, boolean>;
type Table = Record<string, Row>;

interface Site {
	projectId: string;
	ids: Record<string, string>;
}

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
		.send({ id, name: "Casa Moinhos", units: 20 });
	expect(res.status).toBe(201);
	await db.insert(projectMember).values([
		{ projectId: id, userId: manager.userId, role: "manager" },
		{ projectId: id, userId: assistant.userId, role: "assistant" },
	]);
	return id;
}

const structurePath = (projectId: string) =>
	`/api/projects/${projectId}/structure`;
const batchPath = (projectId: string) =>
	`/api/projects/${projectId}/discipline-batches`;

async function createSite(): Promise<Site> {
	const projectId = await createProject();
	const ids: Record<string, string> = {};
	const locations: Entry[] = [];
	const add = (
		key: string,
		parent: string | null,
		type: Kind,
		name: string,
		position: number,
	) => {
		ids[key] = randomUUID();
		locations.push({
			id: ids[key],
			parentId: parent === null ? null : ids[parent]!,
			type,
			name,
			position,
		});
	};
	add("Torre A", null, "tower", "Torre A", 0);
	add("2º andar", "Torre A", "floor", "2º andar", 0);
	add("201", "2º andar", "unit", "201", 0);
	add("202", "2º andar", "unit", "202", 1);
	add("203", "2º andar", "unit", "203", 2);
	add("Hall", "2º andar", "common_area", "Hall do 2º andar", 3);
	add("3º andar", "Torre A", "floor", "3º andar", 1);
	add("301", "3º andar", "unit", "301", 0);
	add("Salão", "Torre A", "common_area", "Salão", 2);
	add("Garagem", null, "common_area", "Garagem", 0);
	add("Torre B", null, "tower", "Torre B", 1);
	add("1º andar B", "Torre B", "floor", "1º andar", 0);
	add("Vazio", "Torre B", "floor", "Térreo", 1);
	add("101 B", "1º andar B", "unit", "101", 0);
	add("Torre C", null, "tower", "Torre C", 2);
	const res = await admin.agent
		.post(structurePath(projectId))
		.send({ locations });
	expect(res.status).toBe(201);
	return { projectId, ids };
}

async function addUnit(site: Site, parent: string, name: string) {
	const entry: Entry = {
		id: randomUUID(),
		parentId: site.ids[parent]!,
		type: "unit",
		name,
		position: 9,
	};
	const res = await admin.agent
		.post(structurePath(site.projectId))
		.send({ locations: [entry] });
	expect(res.status).toBe(201);
	site.ids[name] = entry.id;
	return entry.id;
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

const LISTS = [
	"Torre A",
	"2º andar",
	"3º andar",
	"Torre B",
	"1º andar B",
	"Vazio",
	"Torre C",
];

function untouched(site: Site, extras: string[]): Table {
	return Object.fromEntries(
		Object.keys(site.ids).map((place) => {
			const onLists = LISTS.includes(place);
			return [
				place,
				{
					Hidráulica: true,
					Elétrica: true,
					...Object.fromEntries(extras.map((name) => [name, !onLists])),
				},
			];
		}),
	);
}

async function readTable(site: Site): Promise<Table> {
	const table: Table = {};
	for (const [place, id] of Object.entries(site.ids)) {
		const res = await admin.agent.get(
			`/api/projects/${site.projectId}/locations/${id}`,
		);
		expect(res.status).toBe(200);
		table[place] = Object.fromEntries(
			(
				res.body as { disciplines: { name: string; applies: boolean }[] }
			).disciplines.map(({ name, applies }) => [name, applies]),
		);
	}
	return table;
}

function changed(table: Table, places: string[], row: Row): Table {
	return {
		...table,
		...Object.fromEntries(
			places.map((place) => [place, { ...table[place], ...row }]),
		),
	};
}

const apply = (
	person: Person,
	projectId: string,
	body: Record<string, unknown>,
) => person.agent.post(batchPath(projectId)).send(body);

const exceptionCount = async (projectId: string) =>
	(
		await db
			.select()
			.from(locationDiscipline)
			.where(eq(locationDiscipline.projectId, projectId))
	).length;

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

const FLOOR_UNITS = ["201", "202", "203", "Hall"];
const TOWER_A_PLACES = [...FLOOR_UNITS, "301", "Salão"];

describe("POST /api/projects/:id/discipline-batches", () => {
	test("walks the hostile sequence, reading every location before and after each step", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const eletrica = await disciplineIdOf(site.projectId, "Elétrica");
		const pintura = await createDiscipline(site, "Pintura", true);
		const start = untouched(site, ["Pintura"]);
		expect(await readTable(site)).toEqual(start);

		await createDiscipline(site, "Gesso", true);
		const withGesso = untouched(site, ["Pintura", "Gesso"]);
		expect(await readTable(site)).toEqual(withGesso);

		const floorBatch = await apply(admin, site.projectId, {
			target: { type: "floor", locationId: site.ids["2º andar"] },
			on: [eletrica],
			off: [hidraulica, pintura],
		});
		expect(floorBatch.status).toBe(200);
		expect(floorBatch.body).toEqual({ locations: 4 });
		const afterFloor = changed(withGesso, FLOOR_UNITS, {
			Hidráulica: false,
			Elétrica: true,
			Pintura: false,
		});
		expect(await readTable(site)).toEqual(afterFloor);
		expect(afterFloor["2º andar"]).toEqual({
			Hidráulica: true,
			Elétrica: true,
			Pintura: false,
			Gesso: false,
		});

		await addUnit(site, "2º andar", "204");
		const secondFloorBatch = await apply(admin, site.projectId, {
			target: { type: "floor", locationId: site.ids["2º andar"] },
			on: [eletrica],
			off: [hidraulica, pintura],
		});
		expect(secondFloorBatch.body).toEqual({ locations: 5 });
		const afterNewUnit: Table = {
			...afterFloor,
			"204": {
				Hidráulica: false,
				Elétrica: true,
				Pintura: false,
				Gesso: true,
			},
		};
		expect(await readTable(site)).toEqual(afterNewUnit);

		const towerBatch = await apply(admin, site.projectId, {
			target: { type: "tower", locationId: site.ids["Torre A"] },
			on: [pintura],
			off: [eletrica],
		});
		expect(towerBatch.status).toBe(200);
		expect(towerBatch.body).toEqual({ locations: 7 });
		const afterTower = changed(afterNewUnit, [...TOWER_A_PLACES, "204"], {
			Elétrica: false,
			Pintura: true,
		});
		expect(await readTable(site)).toEqual(afterTower);
		expect(afterTower["Garagem"]).toEqual({
			Hidráulica: true,
			Elétrica: true,
			Pintura: true,
			Gesso: true,
		});
	});

	test("leaves a discipline the batch does not name as it was in every location", async () => {
		const site = await createSite();
		const pintura = await createDiscipline(site, "Pintura", true);
		const gesso = await createDiscipline(site, "Gesso", false);
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		await apply(admin, site.projectId, {
			target: { type: "locations", locationIds: [site.ids["201"]] },
			on: [gesso],
			off: [pintura],
		});
		const before = await readTable(site);
		expect(before["201"]).toEqual({
			Hidráulica: true,
			Elétrica: true,
			Pintura: false,
			Gesso: true,
		});

		const res = await apply(admin, site.projectId, {
			target: { type: "tower", locationId: site.ids["Torre A"] },
			on: [],
			off: [hidraulica],
		});

		expect(res.status).toBe(200);
		expect(await readTable(site)).toEqual(
			changed(before, TOWER_A_PLACES, { Hidráulica: false }),
		);
	});

	test("changes exactly the chosen locations, a common area of the project included", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const before = untouched(site, []);

		const res = await apply(admin, site.projectId, {
			target: {
				type: "locations",
				locationIds: [site.ids["201"], site.ids["Hall"], site.ids["Garagem"]],
			},
			off: [hidraulica],
			on: [],
		});

		expect(res.body).toEqual({ locations: 3 });
		expect(await readTable(site)).toEqual(
			changed(before, ["201", "Hall", "Garagem"], { Hidráulica: false }),
		);
	});

	test("stores an exception only when it differs from the default and deletes it when it matches", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const pintura = await createDiscipline(site, "Pintura", false);
		const target = { type: "floor", locationId: site.ids["2º andar"] };

		await apply(admin, site.projectId, {
			target,
			off: [hidraulica],
			on: [pintura],
		});
		expect(await exceptionCount(site.projectId)).toBe(8);

		await apply(admin, site.projectId, {
			target,
			on: [hidraulica],
			off: [pintura],
		});
		expect(await exceptionCount(site.projectId)).toBe(0);
	});

	test("answers the same and changes nothing when the batch is sent again", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const body = {
			target: { type: "tower", locationId: site.ids["Torre A"] },
			off: [hidraulica],
			on: [],
		};
		const first = await apply(admin, site.projectId, body);
		const table = await readTable(site);
		const count = await exceptionCount(site.projectId);

		const second = await apply(admin, site.projectId, body);

		expect(second.status).toBe(200);
		expect(second.body).toEqual(first.body);
		expect(await readTable(site)).toEqual(table);
		expect(await exceptionCount(site.projectId)).toBe(count);
	});

	test("answers 0 and changes nothing for a floor or a tower with nothing under it", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const before = await readTable(site);

		for (const target of [
			{ type: "floor", locationId: site.ids["Vazio"] },
			{ type: "tower", locationId: site.ids["Torre C"] },
		]) {
			const res = await apply(admin, site.projectId, {
				target,
				off: [hidraulica],
				on: [],
			});
			expect(res.status).toBe(200);
			expect(res.body).toEqual({ locations: 0 });
		}
		expect(await readTable(site)).toEqual(before);
	});

	test("refuses the whole batch with LOCATION_NOT_FOUND and the missing ids when a chosen location is gone", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const gone = randomUUID();
		const before = await readTable(site);

		const res = await apply(admin, site.projectId, {
			target: {
				type: "locations",
				locationIds: [site.ids["201"], site.ids["202"], gone],
			},
			off: [hidraulica],
			on: [],
		});

		expect(res.status).toBe(404);
		expect(res.body).toMatchObject({ code: "LOCATION_NOT_FOUND", ids: [gone] });
		expect(await readTable(site)).toEqual(before);
	});

	test("answers LOCATION_NOT_FOUND for a location of another project", async () => {
		const site = await createSite();
		const other = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");

		const res = await apply(admin, site.projectId, {
			target: { type: "floor", locationId: other.ids["2º andar"] },
			off: [hidraulica],
			on: [],
		});

		expect(res.status).toBe(404);
		expect(res.body).toMatchObject({
			code: "LOCATION_NOT_FOUND",
			ids: [other.ids["2º andar"]],
		});
	});

	test.each([
		["a floor in the chosen locations", "locations", ["201", "2º andar"]],
		["a tower in the chosen locations", "locations", ["201", "Torre A"]],
		["a floor target that is a unit", "floor", ["201"]],
		["a floor target that is a tower", "floor", ["Torre A"]],
		["a tower target that is a floor", "tower", ["2º andar"]],
		["a tower target that is a common area", "tower", ["Salão"]],
	])(
		"refuses %s with LOCATION_KIND_INVALID and changes nothing",
		async (_label, type, places) => {
			const site = await createSite();
			const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
			const before = await readTable(site);
			const ids = places.map((place) => site.ids[place]!);

			const res = await apply(admin, site.projectId, {
				target:
					type === "locations"
						? { type, locationIds: ids }
						: { type, locationId: ids[0] },
				off: [hidraulica],
				on: [],
			});

			expect(res.status).toBe(409);
			expect(res.body).toMatchObject({ code: "LOCATION_KIND_INVALID" });
			expect(await readTable(site)).toEqual(before);
		},
	);

	test("refuses General with DISCIPLINE_IS_GENERAL and a foreign or unknown discipline with DISCIPLINE_NOT_FOUND", async () => {
		const site = await createSite();
		const other = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const geral = await disciplineIdOf(site.projectId, "Geral");
		const foreign = await disciplineIdOf(other.projectId, "Hidráulica");
		const before = await readTable(site);
		const target = { type: "floor", locationId: site.ids["2º andar"] };

		const general = await apply(admin, site.projectId, {
			target,
			off: [hidraulica, geral],
			on: [],
		});
		const foreigner = await apply(admin, site.projectId, {
			target,
			off: [hidraulica, foreign],
			on: [],
		});
		const unknown = await apply(admin, site.projectId, {
			target,
			off: [],
			on: [randomUUID()],
		});

		expect(general.status).toBe(409);
		expect(general.body).toMatchObject({ code: "DISCIPLINE_IS_GENERAL" });
		expect(foreigner.status).toBe(404);
		expect(foreigner.body).toMatchObject({ code: "DISCIPLINE_NOT_FOUND" });
		expect(unknown.status).toBe(404);
		expect(unknown.body).toMatchObject({ code: "DISCIPLINE_NOT_FOUND" });
		expect(await readTable(site)).toEqual(before);
	});

	test("refuses a discipline in both lists, an empty batch and repeated ids with 400", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const eletrica = await disciplineIdOf(site.projectId, "Elétrica");
		const target = { type: "floor", locationId: site.ids["2º andar"] };
		const unit = site.ids["201"]!;
		const before = await readTable(site);

		const bodies = [
			{ target, on: [hidraulica], off: [hidraulica] },
			{ target, on: [], off: [] },
			{ target, on: [hidraulica, hidraulica], off: [] },
			{ target, on: [], off: [eletrica, eletrica] },
			{
				target: { type: "locations", locationIds: [] },
				on: [],
				off: [eletrica],
			},
			{
				target: { type: "locations", locationIds: [unit, unit] },
				on: [],
				off: [eletrica],
			},
			{
				target: {
					type: "locations",
					locationIds: Array.from({ length: 5001 }, () => randomUUID()),
				},
				on: [],
				off: [eletrica],
			},
			{ target: { type: "floor" }, on: [], off: [eletrica] },
			{ target: { type: "garden", locationId: unit }, on: [], off: [eletrica] },
			{ target, on: ["nope"], off: [] },
		];
		for (const body of bodies) {
			const res = await apply(admin, site.projectId, body);
			expect(res.status).toBe(400);
			expect(res.body).toMatchObject({ code: "VALIDATION_FAILED" });
		}
		expect(await readTable(site)).toEqual(before);
	});

	test("refuses every batch on a delivered project with PROJECT_DELIVERED", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const before = await readTable(site);
		await db
			.update(project)
			.set({ status: "delivered" })
			.where(eq(project.id, site.projectId));

		for (const who of [admin, manager, assistant]) {
			const res = await apply(who, site.projectId, {
				target: { type: "floor", locationId: site.ids["2º andar"] },
				off: [hidraulica],
				on: [],
			});
			expect(res.status).toBe(409);
			expect(res.body).toMatchObject({ code: "PROJECT_DELIVERED" });
		}
		expect(await readTable(site)).toEqual(before);
	});

	test("lets a manager and an assistant apply a batch and hides the project from an outsider", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const body = {
			target: { type: "floor", locationId: site.ids["2º andar"] },
			off: [hidraulica],
			on: [],
		};

		for (const who of [manager, assistant]) {
			const res = await apply(who, site.projectId, body);
			expect(res.status).toBe(200);
			expect(res.body).toEqual({ locations: 4 });
		}
		const outsiderRes = await apply(outsider, site.projectId, body);
		expect(outsiderRes.status).toBe(404);
		expect(outsiderRes.body).toMatchObject({ code: "PROJECT_NOT_FOUND" });
	});

	test("moves the project's last activity and my recent use, and stays still when refused", async () => {
		const site = await createSite();
		const hidraulica = await disciplineIdOf(site.projectId, "Hidráulica");
		const geral = await disciplineIdOf(site.projectId, "Geral");
		const target = { type: "floor", locationId: site.ids["2º andar"] };
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
		await apply(admin, site.projectId, { target, off: [hidraulica], on: [] });
		expect(await activity()).toBeGreaterThan(before.getTime());
		expect(await used()).toBeGreaterThan(before.getTime());

		await reset();
		await apply(admin, site.projectId, { target, off: [geral], on: [] });
		expect(await activity()).toBe(before.getTime());
		expect(await used()).toBe(before.getTime());
	});

	test("applies a tower of 5,000 units and common areas naming every discipline within 2 seconds", async () => {
		const projectId = await createProject();
		const towerId = randomUUID();
		const floors = Array.from({ length: 167 }, (_, index) => ({
			id: randomUUID(),
			name: `Andar ${index + 1}`,
		}));
		const rows = [
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
			const res = await admin.agent
				.post(`/api/projects/${projectId}/disciplines`)
				.send({ id, name: `Extra ${index}`, appliesEverywhere: true });
			expect(res.status).toBe(201);
			extras.push(id);
		}
		const hidraulica = await disciplineIdOf(projectId, "Hidráulica");
		const eletrica = await disciplineIdOf(projectId, "Elétrica");

		const startedAt = performance.now();
		const res = await apply(admin, projectId, {
			target: { type: "tower", locationId: towerId },
			off: [hidraulica, eletrica, ...extras],
			on: [],
		});
		const elapsedMs = performance.now() - startedAt;

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ locations: leaves });
		expect(await exceptionCount(projectId)).toBe(leaves * 12);
		expect(elapsedMs).toBeLessThan(2000);
	}, 60_000);
});
