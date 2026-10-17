import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	NO_UNITS_LEFT,
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	projectSummarySchema,
	RESERVATION_BELOW_USED,
} from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
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
const PROJECTS = "/api/projects";

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
let active: string;
let delivered: string;

const unitsPath = (id: string) => `${PROJECTS}/${id}/units`;

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

async function setReserved(projectId: string, reservedUnits: number) {
	await db
		.update(project)
		.set({ reservedUnits })
		.where(eq(project.id, projectId));
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

function change(person: Person, projectId: string, body: unknown) {
	return person.agent.patch(unitsPath(projectId)).send(body as object);
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
	unlinked = await signUp("Gerente Sem Vínculo");
	outsider = await signUp("Admin de Outra Construtora");

	organizationId = await organizationOf(admin.userId);
	await joinAs(manager, organizationId, "manager");
	await joinAs(assistant, organizationId, "assistant");
	await joinAs(unlinked, organizationId, "manager");

	await db.delete(license).where(eq(license.organizationId, organizationId));
	await db.insert(license).values({ organizationId, units: 500 });

	const created = await db
		.insert(project)
		.values([
			{ organizationId, name: "Casa Moinhos", reservedUnits: 400 },
			{
				organizationId,
				name: "Torre Entregue",
				status: "delivered",
				reservedUnits: 380,
			},
		])
		.returning({ id: project.id });
	active = created[0]!.id;
	delivered = created[1]!.id;

	await db.insert(projectMember).values([
		{ projectId: active, userId: manager.userId, role: "manager" },
		{ projectId: active, userId: assistant.userId, role: "assistant" },
	]);
	await seedUnits(active, 250);
});

afterAll(async () => {
	for (const { userId } of [admin, manager, assistant, unlinked, outsider]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await app.close();
});

describe("PATCH /api/projects/:id/units", () => {
	beforeEach(async () => {
		await setReserved(active, 400);
		await setReserved(delivered, 50);
	});

	test("the admin raises the reservation within the free units and gets the updated summary", async () => {
		const res = await change(admin, active, { reserved: 430 });

		expect(res.status).toBe(200);
		expect(projectSummarySchema.parse(res.body)).toMatchObject({
			id: active,
			role: "admin",
			units: { reserved: 430, used: 250 },
		});
		expect(await reservedOf(active)).toBe(430);
	});

	test("accepts the reservation plus exactly the free units", async () => {
		const res = await change(admin, active, { reserved: 450 });

		expect(res.status).toBe(200);
		expect(await reservedOf(active)).toBe(450);
	});

	test("one unit above the free units answers 409 with how much it grows by and what is free, and changes nothing", async () => {
		const res = await change(admin, active, { reserved: 451 });

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body)).toMatchObject({
			code: NO_UNITS_LEFT,
			requested: 51,
			available: 50,
		});
		expect(await reservedOf(active)).toBe(400);
	});

	test("the admin lowers the reservation down to the units the project uses", async () => {
		const res = await change(admin, active, { reserved: 250 });

		expect(res.status).toBe(200);
		expect(projectSummarySchema.parse(res.body).units).toEqual({
			reserved: 250,
			used: 250,
		});
		expect(await reservedOf(active)).toBe(250);
	});

	test("lowering a reservation returns its units to the free ones", async () => {
		await change(admin, active, { reserved: 250 });

		const res = await change(admin, active, { reserved: 400 });

		expect(res.status).toBe(200);
		expect(await reservedOf(active)).toBe(400);
	});

	test("answering the current reservation again changes nothing", async () => {
		const res = await change(admin, active, { reserved: 400 });

		expect(res.status).toBe(200);
		expect(await reservedOf(active)).toBe(400);
	});

	test("below the units the project uses answers 409 with them and changes nothing", async () => {
		const res = await change(admin, active, { reserved: 249 });

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body)).toMatchObject({
			code: RESERVATION_BELOW_USED,
			used: 250,
		});
		expect(await reservedOf(active)).toBe(400);
	});

	test("a delivered project answers 409 PROJECT_DELIVERED and keeps its reservation", async () => {
		const res = await change(admin, delivered, { reserved: 60 });

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_DELIVERED);
		expect(await reservedOf(delivered)).toBe(50);
	});

	test.each([
		["a manager", () => manager],
		["an assistant", () => assistant],
	])("refuses %s of the project with 403", async (_who, person) => {
		const res = await change(person(), active, { reserved: 300 });

		expect(res.status).toBe(403);
		expect(await reservedOf(active)).toBe(400);
	});

	test("answers 404 to someone with no membership on the project, revealing nothing", async () => {
		const res = await change(unlinked, active, { reserved: 300 });

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
	});

	test("answers 404 to the admin of another organization", async () => {
		const res = await change(outsider, active, { reserved: 300 });

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
		expect(await reservedOf(active)).toBe(400);
	});

	test("answers 404 for a project that does not exist", async () => {
		const res = await change(admin, randomUUID(), { reserved: 300 });

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
	});

	test.each([
		["a missing reservation", {}],
		["a negative reservation", { reserved: -1 }],
		["a fractional reservation", { reserved: 300.5 }],
		["a reservation that is not a number", { reserved: "300" }],
	])("rejects %s", async (_case, body) => {
		const res = await change(admin, active, body);

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("VALIDATION_FAILED");
		expect(await reservedOf(active)).toBe(400);
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server)
			.patch(unitsPath(active))
			.send({ reserved: 300 });

		expect(res.status).toBe(401);
	});

	test("simultaneous reservation changes and project creations never reserve more than the contracted units", async () => {
		await setReserved(active, 250);

		const attempts = await Promise.all([
			...Array.from({ length: 4 }, () =>
				admin.agent
					.post(PROJECTS)
					.send({ id: randomUUID(), name: "Galpão Sul", units: 100 }),
			),
			change(admin, active, { reserved: 450 }),
			change(admin, active, { reserved: 500 }),
		]);

		const projects = await db.query.project.findMany({
			where: eq(project.organizationId, organizationId),
		});
		const reserved = projects.reduce((sum, row) => sum + row.reservedUnits, 0);
		expect(reserved).toBeLessThanOrEqual(500);
		expect(attempts.filter((res) => res.status === 409).length).toBeGreaterThan(
			0,
		);
		for (const res of attempts.filter((res) => res.status === 409)) {
			expect(problemDetailsSchema.parse(res.body).code).toBe(NO_UNITS_LEFT);
		}
	});
});
