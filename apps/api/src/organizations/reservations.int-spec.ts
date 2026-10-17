import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	NO_UNITS_LEFT,
	organizationReservationsSchema,
	organizationUnitsSchema,
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	RESERVATION_BELOW_USED,
} from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq, inArray } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "../db/database.module";
import {
	license,
	member,
	organization,
	project,
	projectMember,
	user,
} from "../db/schema";
import { location } from "../structure/location.entity";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";
const RESERVATIONS = "/api/organization/units/reservations";

type Person = { userId: string; agent: ReturnType<typeof request.agent> };

let app: INestApplication;
let server: Server;
let db: Database;

let admin: Person;
let manager: Person;
let assistant: Person;
let outsider: Person;

let organizationId: string;
let otherOrganizationId: string;
let aurora: string;
let jardins: string;
let atlantica: string;
let entregue: string;
let foreign: string;

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

async function joinAs(
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

async function reservedOf(projectId: string): Promise<number> {
	const found = await db.query.project.findFirst({
		where: eq(project.id, projectId),
	});
	return found!.reservedUnits;
}

async function resetReservations() {
	await db
		.update(project)
		.set({ reservedUnits: 300, status: "active" })
		.where(eq(project.id, aurora));
	await db
		.update(project)
		.set({ reservedUnits: 400, status: "active" })
		.where(eq(project.id, jardins));
	await db
		.update(project)
		.set({ reservedUnits: 500, status: "active" })
		.where(eq(project.id, atlantica));
	await db
		.update(project)
		.set({ reservedUnits: 450, status: "delivered" })
		.where(eq(project.id, entregue));
}

async function seedUnits(projectId: string, count: number) {
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
			name: "1º andar",
			position: 0,
		})
		.returning({ id: location.id });
	await db.insert(location).values(
		Array.from({ length: count }, (_, position) => ({
			projectId,
			parentId: floor!.id,
			type: "unit" as const,
			name: `10${position + 1}`,
			position,
		})),
	);
}

function change(person: Person, items: unknown) {
	return person.agent.patch(RESERVATIONS).send({ items });
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
	manager = await signUp("Gerente de Obra");
	assistant = await signUp("Assistente de Obra");
	outsider = await signUp("Admin de Outra Construtora");

	organizationId = await organizationOf(admin.userId);
	otherOrganizationId = await organizationOf(outsider.userId);
	await joinAs(manager, organizationId, "manager");
	await joinAs(assistant, organizationId, "assistant");

	await db.delete(license).where(eq(license.organizationId, organizationId));
	await db.insert(license).values({ organizationId, units: 2000 });

	const created = await db
		.insert(project)
		.values([
			{ organizationId, name: "Edifício Aurora", reservedUnits: 300 },
			{ organizationId, name: "Residencial Jardins", reservedUnits: 400 },
			{ organizationId, name: "Torre Atlântica", reservedUnits: 500 },
			{
				organizationId,
				name: "Torre Entregue",
				status: "delivered",
				reservedUnits: 450,
			},
			{
				organizationId: otherOrganizationId,
				name: "Obra de Outra Construtora",
				reservedUnits: 90,
			},
		])
		.returning({ id: project.id });
	[aurora, jardins, atlantica, entregue, foreign] = created.map(
		({ id }) => id,
	) as [string, string, string, string, string];

	await db
		.insert(projectMember)
		.values({ projectId: aurora, userId: manager.userId, role: "manager" });
	await seedUnits(aurora, 180);
	await seedUnits(jardins, 250);
	await seedUnits(atlantica, 482);
});

afterAll(async () => {
	for (const { userId } of [admin, manager, assistant, outsider]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await db
		.delete(project)
		.where(
			inArray(project.id, [aurora, jardins, atlantica, entregue, foreign]),
		);
	await app.close();
});

beforeEach(resetReservations);

describe("GET /api/organization/units/reservations", () => {
	test("lists every project in progress by name with what it reserves and uses, and what the delivered hold", async () => {
		const res = await admin.agent.get(RESERVATIONS);

		expect(res.status).toBe(200);
		expect(organizationReservationsSchema.parse(res.body)).toEqual({
			items: [
				{
					projectId: aurora,
					name: "Edifício Aurora",
					reserved: 300,
					used: 180,
				},
				{
					projectId: jardins,
					name: "Residencial Jardins",
					reserved: 400,
					used: 250,
				},
				{
					projectId: atlantica,
					name: "Torre Atlântica",
					reserved: 500,
					used: 482,
				},
			],
			delivered: { projects: 1, used: 450 },
		});
	});

	test("rows and delivered add up to the reserved units of the organization", async () => {
		const reservations = organizationReservationsSchema.parse(
			(await admin.agent.get(RESERVATIONS)).body,
		);
		const units = organizationUnitsSchema.parse(
			(await admin.agent.get("/api/organization/units")).body,
		);

		const rows = reservations.items.reduce((sum, row) => sum + row.reserved, 0);
		expect(rows + reservations.delivered.used).toBe(units.reserved);
	});

	test("lists only the caller's organization's projects", async () => {
		const res = await outsider.agent.get(RESERVATIONS);

		expect(res.status).toBe(200);
		expect(organizationReservationsSchema.parse(res.body).items).toEqual([
			{
				projectId: foreign,
				name: "Obra de Outra Construtora",
				reserved: 90,
				used: 0,
			},
		]);
		expect(organizationReservationsSchema.parse(res.body).delivered).toEqual({
			projects: 0,
			used: 0,
		});
	});

	test.each([
		["a manager", () => manager],
		["an assistant", () => assistant],
	])("refuses %s with 403", async (_who, person) => {
		const res = await person().agent.get(RESERVATIONS);

		expect(res.status).toBe(403);
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server).get(RESERVATIONS);

		expect(res.status).toBe(401);
	});
});

describe("PATCH /api/organization/units/reservations", () => {
	test("moves units from one project to another in one request and answers the new reservations", async () => {
		const res = await change(admin, [
			{ projectId: jardins, reserved: 300 },
			{ projectId: atlantica, reserved: 650 },
		]);

		expect(res.status).toBe(200);
		const body = organizationReservationsSchema.parse(res.body);
		expect(body.items.map(({ reserved }) => reserved)).toEqual([300, 300, 650]);
		expect(await reservedOf(jardins)).toBe(300);
		expect(await reservedOf(atlantica)).toBe(650);
	});

	test("accepts a growth of exactly the free units", async () => {
		const res = await change(admin, [{ projectId: aurora, reserved: 650 }]);

		expect(res.status).toBe(200);
		expect(await reservedOf(aurora)).toBe(650);
	});

	test("a growth one unit past the free units answers 409 with the net growth and what is free, and changes nothing", async () => {
		const res = await change(admin, [
			{ projectId: aurora, reserved: 651 },
			{ projectId: jardins, reserved: 400 },
		]);

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body)).toMatchObject({
			code: NO_UNITS_LEFT,
			requested: 351,
			available: 350,
		});
		expect(await reservedOf(aurora)).toBe(300);
	});

	test("a lowered reservation pays for a raised one in the same request", async () => {
		const res = await change(admin, [
			{ projectId: jardins, reserved: 260 },
			{ projectId: aurora, reserved: 790 },
		]);

		expect(res.status).toBe(200);
		expect(await reservedOf(jardins)).toBe(260);
		expect(await reservedOf(aurora)).toBe(790);
	});

	test("one refused item refuses the whole request: nothing changes", async () => {
		const res = await change(admin, [
			{ projectId: jardins, reserved: 300 },
			{ projectId: atlantica, reserved: 481 },
		]);

		expect(res.status).toBe(409);
		expect(await reservedOf(jardins)).toBe(400);
		expect(await reservedOf(atlantica)).toBe(500);
	});

	test("a reservation below the units used answers 409 naming every refused project with its used units", async () => {
		const res = await change(admin, [
			{ projectId: aurora, reserved: 150 },
			{ projectId: jardins, reserved: 300 },
			{ projectId: atlantica, reserved: 481 },
		]);

		expect(res.status).toBe(409);
		const problem = problemDetailsSchema.parse(res.body);
		expect(problem.code).toBe(RESERVATION_BELOW_USED);
		expect(problem.items).toEqual(
			expect.arrayContaining([
				{ projectId: aurora, used: 180 },
				{ projectId: atlantica, used: 482 },
			]),
		);
		expect(problem.items).toHaveLength(2);
		expect(await reservedOf(aurora)).toBe(300);
		expect(await reservedOf(jardins)).toBe(400);
	});

	test("lowers a reservation down to the units used", async () => {
		const res = await change(admin, [{ projectId: aurora, reserved: 180 }]);

		expect(res.status).toBe(200);
		expect(await reservedOf(aurora)).toBe(180);
	});

	test("a project delivered meanwhile answers 409 PROJECT_DELIVERED with its id and changes nothing", async () => {
		await db
			.update(project)
			.set({ status: "delivered" })
			.where(eq(project.id, atlantica));

		const res = await change(admin, [
			{ projectId: jardins, reserved: 300 },
			{ projectId: atlantica, reserved: 650 },
		]);

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body)).toMatchObject({
			code: PROJECT_DELIVERED,
			projectId: atlantica,
		});
		expect(await reservedOf(jardins)).toBe(400);
		expect(await reservedOf(atlantica)).toBe(500);
	});

	test("a delivered project answers 409 PROJECT_DELIVERED", async () => {
		const res = await change(admin, [{ projectId: entregue, reserved: 460 }]);

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body)).toMatchObject({
			code: PROJECT_DELIVERED,
			projectId: entregue,
		});
		expect(await reservedOf(entregue)).toBe(450);
	});

	test.each([
		["a project that does not exist", () => randomUUID()],
		["a project of another organization", () => foreign],
	])(
		"answers 404 with the id for %s and changes nothing",
		async (_case, id) => {
			const missing = id();

			const res = await change(admin, [
				{ projectId: jardins, reserved: 300 },
				{ projectId: missing, reserved: 10 },
			]);

			expect(res.status).toBe(404);
			expect(problemDetailsSchema.parse(res.body)).toMatchObject({
				code: PROJECT_NOT_FOUND,
				projectId: missing,
			});
			expect(await reservedOf(jardins)).toBe(400);
			expect(await reservedOf(foreign)).toBe(90);
		},
	);

	test("never reveals a project of another organization to its admin", async () => {
		const res = await change(outsider, [{ projectId: aurora, reserved: 200 }]);

		expect(res.status).toBe(404);
		expect(await reservedOf(aurora)).toBe(300);
	});

	test.each([
		["a manager", () => manager],
		["an assistant", () => assistant],
	])("refuses %s with 403 and changes nothing", async (_who, person) => {
		const res = await change(person(), [{ projectId: aurora, reserved: 200 }]);

		expect(res.status).toBe(403);
		expect(await reservedOf(aurora)).toBe(300);
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server)
			.patch(RESERVATIONS)
			.send({ items: [{ projectId: aurora, reserved: 200 }] });

		expect(res.status).toBe(401);
	});

	test.each([
		["no body", undefined],
		["no items", { items: [] }],
		["items that are not a list", { items: "x" }],
		["an item with no reservation", { items: [{ projectId: randomUUID() }] }],
		[
			"a negative reservation",
			{ items: [{ projectId: randomUUID(), reserved: -1 }] },
		],
		[
			"a fractional reservation",
			{ items: [{ projectId: randomUUID(), reserved: 1.5 }] },
		],
		[
			"a project id that is not a uuid",
			{ items: [{ projectId: "x", reserved: 1 }] },
		],
	])("rejects %s", async (_case, body) => {
		const res = await admin.agent.patch(RESERVATIONS).send(body);

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("VALIDATION_FAILED");
	});

	test("rejects the same project twice", async () => {
		const res = await change(admin, [
			{ projectId: aurora, reserved: 200 },
			{ projectId: aurora, reserved: 250 },
		]);

		expect(res.status).toBe(400);
		expect(await reservedOf(aurora)).toBe(300);
	});

	test("simultaneous batches and project creations never reserve more than the contracted units", async () => {
		await db
			.update(project)
			.set({ reservedUnits: 0 })
			.where(eq(project.id, entregue));
		await db
			.update(project)
			.set({ reservedUnits: 1000 })
			.where(eq(project.id, atlantica));

		const attempts = await Promise.all([
			...Array.from({ length: 3 }, () =>
				admin.agent
					.post("/api/projects")
					.send({ id: randomUUID(), name: "Galpão Sul", units: 150 }),
			),
			change(admin, [
				{ projectId: aurora, reserved: 400 },
				{ projectId: jardins, reserved: 500 },
			]),
			change(admin, [
				{ projectId: jardins, reserved: 450 },
				{ projectId: aurora, reserved: 450 },
			]),
		]);

		const reserved = (
			await db.query.project.findMany({
				where: eq(project.organizationId, organizationId),
			})
		).reduce((sum, row) => sum + row.reservedUnits, 0);
		expect(reserved).toBeLessThanOrEqual(2000);
		for (const res of attempts.filter(({ status }) => status === 409)) {
			expect(problemDetailsSchema.parse(res.body).code).toBe(NO_UNITS_LEFT);
		}
		await db.delete(project).where(eq(project.name, "Galpão Sul"));
	});
});
