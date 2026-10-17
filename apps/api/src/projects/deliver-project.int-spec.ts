import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	NO_UNITS_LEFT,
	organizationReservationsSchema,
	organizationUnitsSchema,
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	projectListSchema,
	projectSummarySchema,
	projectUnitsBalanceSchema,
} from "@bluprint/shared";
import { TransactionHost } from "@nestjs-cls/transactional";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { and, eq } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { ProblemException } from "../common/problems/problem.exception";
import { DATABASE, Database, DatabaseAdapter } from "../db/database.module";
import {
	license,
	member,
	organization,
	project,
	projectMember,
	user,
} from "../db/schema";
import { location } from "../structure/location.entity";
import { UnitsService } from "../units/units.service";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";
const PROJECTS = "/api/projects";
const ORGANIZATION_UNITS = "/api/organization/units";
const RESERVATIONS = "/api/organization/units/reservations";

type Person = { userId: string; agent: ReturnType<typeof request.agent> };

let app: INestApplication;
let server: Server;
let db: Database;
let txHost: TransactionHost<DatabaseAdapter>;
let units: UnitsService;

let admin: Person;
let manager: Person;
let assistant: Person;
let unlinked: Person;
let outsider: Person;

let organizationId: string;
let active: string;
let sibling: string;
let alreadyDelivered: string;
let floorId: string;

const deliveryPath = (id: string) => `${PROJECTS}/${id}/delivery`;

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

async function rowOf(projectId: string) {
	const found = await db.query.project.findFirst({
		where: eq(project.id, projectId),
	});
	return found!;
}

async function reset() {
	await db
		.update(project)
		.set({
			status: "active",
			deliveredBy: null,
			deliveredAt: null,
			reservedUnits: 400,
		})
		.where(eq(project.id, active));
	await db
		.update(project)
		.set({ reservedUnits: 100 })
		.where(eq(project.id, sibling));
	await db
		.delete(location)
		.where(and(eq(location.projectId, active), eq(location.type, "unit")));
	await seedUnits(active, 250);
}

async function seedUnits(projectId: string, count: number, from = 0) {
	await db.insert(location).values(
		Array.from({ length: count }, (_, position) => ({
			projectId,
			parentId: floorId,
			type: "unit" as const,
			name: `U${from + position}`,
			position: from + position,
		})),
	);
}

const countUnitsOf = async (projectId: string) =>
	(
		await db
			.select({ id: location.id })
			.from(location)
			.where(and(eq(location.projectId, projectId), eq(location.type, "unit")))
	).length;

function deliver(person: Person, projectId: string) {
	return person.agent.post(deliveryPath(projectId));
}

function createUnits(projectId: string, names: string[]) {
	return txHost.withTransaction(async () => {
		await units.assertAvailable(projectId, names.length);
		await txHost.tx.insert(location).values(
			names.map((name, position) => ({
				projectId,
				parentId: floorId,
				type: "unit" as const,
				name,
				position,
			})),
		);
	});
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
	txHost = app.get<TransactionHost<DatabaseAdapter>>(TransactionHost);
	units = app.get(UnitsService);

	admin = await signUp("Admin da Construtora");
	manager = await signUp("Rafael Souza");
	assistant = await signUp("Assistente de Obra");
	unlinked = await signUp("Gerente Sem Vínculo");
	outsider = await signUp("Admin de Outra Construtora");

	organizationId = await organizationOf(admin.userId);
	await joinAs(manager, organizationId, "manager");
	await joinAs(assistant, organizationId, "assistant");
	await joinAs(unlinked, organizationId, "manager");

	await db.delete(license).where(eq(license.organizationId, organizationId));
	await db.insert(license).values({ organizationId, units: 600 });

	const created = await db
		.insert(project)
		.values([
			{ organizationId, name: "Casa Moinhos", reservedUnits: 400 },
			{ organizationId, name: "Torre Vizinha", reservedUnits: 100 },
			{
				organizationId,
				name: "Torre Entregue",
				status: "delivered",
				reservedUnits: 30,
				deliveredBy: admin.userId,
				deliveredAt: new Date("2026-10-14T12:00:00Z"),
			},
		])
		.returning({ id: project.id });
	active = created[0]!.id;
	sibling = created[1]!.id;
	alreadyDelivered = created[2]!.id;

	await db.insert(projectMember).values([
		{ projectId: active, userId: manager.userId, role: "manager" },
		{ projectId: active, userId: assistant.userId, role: "assistant" },
	]);

	const [tower] = await db
		.insert(location)
		.values({ projectId: active, type: "tower", name: "Torre A", position: 0 })
		.returning({ id: location.id });
	const [floor] = await db
		.insert(location)
		.values({
			projectId: active,
			parentId: tower!.id,
			type: "floor",
			name: "1º andar",
			position: 0,
		})
		.returning({ id: location.id });
	floorId = floor!.id;
});

afterAll(async () => {
	for (const { userId } of [admin, manager, assistant, unlinked, outsider]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await app.close();
});

beforeEach(reset);

describe("POST /api/projects/:id/delivery", () => {
	test("the admin delivers: the summary reads delivered, with who and when", async () => {
		const res = await deliver(admin, active);

		expect(res.status).toBe(200);
		const summary = projectSummarySchema.parse(res.body);
		expect(summary).toMatchObject({
			id: active,
			status: "delivered",
			role: "admin",
			units: { reserved: 250, used: 250 },
			delivery: { by: "Admin da Construtora" },
		});
		expect(Date.now() - Date.parse(summary.delivery!.at)).toBeLessThan(10_000);
	});

	test("a manager of the project delivers and is the one recorded", async () => {
		const res = await deliver(manager, active);

		expect(res.status).toBe(200);
		expect(projectSummarySchema.parse(res.body)).toMatchObject({
			role: "manager",
			delivery: { by: "Rafael Souza" },
		});
		const row = await rowOf(active);
		expect(row.status).toBe("delivered");
		expect(row.deliveredBy).toBe(manager.userId);
		expect(row.deliveredAt).toBeInstanceOf(Date);
	});

	test("the reading of the project carries who delivered it and when", async () => {
		await deliver(manager, active);

		const read = await assistant.agent.get(`${PROJECTS}/${active}`);

		expect(projectSummarySchema.parse(read.body).delivery).toMatchObject({
			by: "Rafael Souza",
			at: (await rowOf(active)).deliveredAt!.toISOString(),
		});
	});

	test("a project in progress has no delivery", async () => {
		const read = await admin.agent.get(`${PROJECTS}/${active}`);

		expect(projectSummarySchema.parse(read.body).delivery).toBeNull();
	});

	test("the list carries the delivery of each delivered project", async () => {
		const res = await admin.agent.get(
			`${PROJECTS}?status=delivered&pageSize=50`,
		);

		const delivered = projectListSchema
			.parse(res.body)
			.items.find(({ id }) => id === alreadyDelivered);
		expect(delivered?.delivery).toMatchObject({ by: "Admin da Construtora" });
	});

	test("delivering does not move the last activity", async () => {
		const before = (await rowOf(active)).lastActivityAt;

		await deliver(admin, active);

		expect((await rowOf(active)).lastActivityAt).toEqual(before);
	});

	test("the reservation becomes the units the project used and the rest returns to the free ones", async () => {
		const before = organizationUnitsSchema.parse(
			(await admin.agent.get(ORGANIZATION_UNITS)).body,
		);

		await deliver(admin, active);

		expect((await rowOf(active)).reservedUnits).toBe(250);
		const after = organizationUnitsSchema.parse(
			(await admin.agent.get(ORGANIZATION_UNITS)).body,
		);
		expect(after.free).toBe(before.free + 150);
		expect(after.reserved).toBe(before.reserved - 150);
		expect(after.contracted).toBe(before.contracted);
	});

	test("reclaimable no longer counts the delivered project", async () => {
		const before = organizationUnitsSchema.parse(
			(await admin.agent.get(ORGANIZATION_UNITS)).body,
		);

		await deliver(admin, active);

		const after = organizationUnitsSchema.parse(
			(await admin.agent.get(ORGANIZATION_UNITS)).body,
		);
		expect(after.reclaimable).toBe(before.reclaimable - 150);
	});

	test("the project's own balance has nothing left to create", async () => {
		await deliver(admin, active);

		const res = await manager.agent.get(`${PROJECTS}/${active}/units`);

		expect(projectUnitsBalanceSchema.parse(res.body)).toEqual({
			reserved: 250,
			used: 250,
			remaining: 0,
		});
	});

	test("the reservations screen counts the project among the delivered", async () => {
		const before = organizationReservationsSchema.parse(
			(await admin.agent.get(RESERVATIONS)).body,
		);

		await deliver(admin, active);

		const after = organizationReservationsSchema.parse(
			(await admin.agent.get(RESERVATIONS)).body,
		);
		expect(after.items.map(({ projectId }) => projectId)).not.toContain(active);
		expect(after.delivered).toEqual({
			projects: before.delivered.projects + 1,
			used: before.delivered.used + 250,
		});
	});

	test("another project of the organization keeps its reservation and status", async () => {
		await deliver(admin, active);

		const other = await rowOf(sibling);
		expect(other.reservedUnits).toBe(100);
		expect(other.status).toBe("active");
		expect(other.deliveredAt).toBeNull();
	});

	test("a project that used nothing returns its whole reservation", async () => {
		await db
			.delete(location)
			.where(and(eq(location.projectId, active), eq(location.type, "unit")));

		const res = await deliver(admin, active);

		expect(projectSummarySchema.parse(res.body).units).toEqual({
			reserved: 0,
			used: 0,
		});
	});

	test("a project already delivered answers 409 PROJECT_DELIVERED and keeps who and when", async () => {
		const before = await rowOf(alreadyDelivered);

		const res = await deliver(admin, alreadyDelivered);

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_DELIVERED);
		expect(await rowOf(alreadyDelivered)).toEqual(before);
	});

	test("delivering twice keeps the first delivery", async () => {
		await deliver(manager, active);
		const first = await rowOf(active);

		const again = await deliver(admin, active);

		expect(again.status).toBe(409);
		expect(await rowOf(active)).toEqual(first);
	});

	test("an assistant of the project gets 403 and the project stays in progress", async () => {
		const res = await deliver(assistant, active);

		expect(res.status).toBe(403);
		expect((await rowOf(active)).status).toBe("active");
		expect((await rowOf(active)).reservedUnits).toBe(400);
	});

	test("answers 404 to someone with no membership on the project, revealing nothing", async () => {
		const res = await deliver(unlinked, active);

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
		expect((await rowOf(active)).status).toBe("active");
	});

	test("answers 404 to the admin of another organization", async () => {
		const res = await deliver(outsider, active);

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
		expect((await rowOf(active)).status).toBe("active");
	});

	test("answers 404 for a project that does not exist", async () => {
		const res = await deliver(admin, randomUUID());

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
	});

	test("rejects an id that is not a uuid", async () => {
		const res = await deliver(admin, "not-a-uuid");

		expect(res.status).toBe(400);
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server).post(deliveryPath(active));

		expect(res.status).toBe(401);
	});
});

describe("a delivered project refuses every write", () => {
	beforeEach(async () => {
		await deliver(admin, active);
	});

	test("renaming answers 409 PROJECT_DELIVERED", async () => {
		const res = await admin.agent
			.patch(`${PROJECTS}/${active}`)
			.send({ name: "Outro nome" });

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_DELIVERED);
		expect((await rowOf(active)).name).toBe("Casa Moinhos");
	});

	test("changing the reservation answers 409 PROJECT_DELIVERED", async () => {
		const res = await admin.agent
			.patch(`${PROJECTS}/${active}/units`)
			.send({ reserved: 260 });

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_DELIVERED);
		expect((await rowOf(active)).reservedUnits).toBe(250);
	});

	test("changing it from the reservations screen answers 409 PROJECT_DELIVERED", async () => {
		const res = await admin.agent
			.patch(RESERVATIONS)
			.send({ items: [{ projectId: active, reserved: 260 }] });

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_DELIVERED);
		expect((await rowOf(active)).reservedUnits).toBe(250);
	});

	test.each([
		["creates a unit", ["U-new"]],
		["creates no unit", []],
	])(
		"writing structure that %s answers 409 PROJECT_DELIVERED",
		async (_case, names) => {
			const error = await createUnits(active, names).then(
				() => undefined,
				(caught: unknown) => caught,
			);

			expect(error).toBeInstanceOf(ProblemException);
			expect((error as ProblemException).problem).toMatchObject({
				status: 409,
				code: PROJECT_DELIVERED,
			});
			expect(await countUnitsOf(active)).toBe(250);
		},
	);
});

describe("delivering while the project is being written", () => {
	test("a simultaneous unit creation never leaves the project using more units than it reserves", async () => {
		const attempts = await Promise.allSettled([
			deliver(admin, active),
			...Array.from({ length: 6 }, (_, i) =>
				createUnits(active, [`N${i}-a`, `N${i}-b`, `N${i}-c`]),
			),
		]);

		const row = await rowOf(active);
		expect(row.status).toBe("delivered");
		expect(row.reservedUnits).toBe(await countUnitsOf(active));
		for (const attempt of attempts) {
			if (attempt.status === "rejected") {
				expect((attempt.reason as ProblemException).problem.code).toBe(
					PROJECT_DELIVERED,
				);
			}
		}
	});

	test("a simultaneous reservation change never leaves the project using more units than it reserves", async () => {
		const attempts = await Promise.all([
			deliver(admin, active),
			admin.agent.patch(`${PROJECTS}/${active}/units`).send({ reserved: 260 }),
			admin.agent.patch(`${PROJECTS}/${active}/units`).send({ reserved: 251 }),
			admin.agent
				.patch(RESERVATIONS)
				.send({ items: [{ projectId: active, reserved: 255 }] }),
		]);

		const row = await rowOf(active);
		expect(row.status).toBe("delivered");
		expect(row.reservedUnits).toBe(250);
		for (const res of attempts.slice(1)) {
			if (res.status === 409) {
				expect(problemDetailsSchema.parse(res.body).code).toBe(
					PROJECT_DELIVERED,
				);
			}
		}
	});

	test("a simultaneous creation of another project cannot reserve the units a delivery has not returned yet", async () => {
		await db
			.update(project)
			.set({ reservedUnits: 400 })
			.where(eq(project.id, active));
		await db
			.update(project)
			.set({ reservedUnits: 200 })
			.where(eq(project.id, sibling));

		const [delivery, creation] = await Promise.all([
			deliver(admin, active),
			admin.agent
				.post(PROJECTS)
				.send({ id: randomUUID(), name: "Galpão Sul", units: 150 }),
		]);

		expect(delivery.status).toBe(200);
		const reserved = (
			await db.query.project.findMany({
				where: eq(project.organizationId, organizationId),
			})
		).reduce((sum, row) => sum + row.reservedUnits, 0);
		expect(reserved).toBeLessThanOrEqual(600);
		if (creation.status === 409) {
			expect(problemDetailsSchema.parse(creation.body).code).toBe(
				NO_UNITS_LEFT,
			);
		}
	});
});
