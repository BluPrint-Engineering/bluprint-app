import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	NO_UNITS_LEFT,
	PROJECT_NOT_FOUND,
	organizationUnitsSchema,
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
	member,
	organization,
	project,
	projectMember,
	user,
} from "../db/schema";
import { location } from "../structure/location.entity";
import { UnitsService } from "./units.service";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";

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
let projectId: string;
let otherProjectId: string;
let deliveredProjectId: string;
let emptyProjectId: string;
let outsiderProjectId: string;
let floorId: string;

const unitsPath = (id: string) => `/api/projects/${id}/units`;

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

async function seedUnits(
	forProject: string,
	parentId: string,
	names: string[],
) {
	return db
		.insert(location)
		.values(
			names.map((name, position) => ({
				projectId: forProject,
				parentId,
				type: "unit" as const,
				name,
				position,
			})),
		)
		.returning({ id: location.id });
}

async function seedFloor(forProject: string) {
	const [tower] = await db
		.insert(location)
		.values({
			projectId: forProject,
			type: "tower",
			name: "Torre A",
			position: 0,
		})
		.returning({ id: location.id });
	const [floor] = await db
		.insert(location)
		.values({
			projectId: forProject,
			parentId: tower!.id,
			type: "floor",
			name: "1º andar",
			position: 0,
		})
		.returning({ id: location.id });
	return floor!.id;
}

function createUnits(forProject: string, parentId: string, names: string[]) {
	return txHost.withTransaction(async () => {
		await units.assertAvailable(forProject, names.length);
		await txHost.tx.insert(location).values(
			names.map((name, position) => ({
				projectId: forProject,
				parentId,
				type: "unit" as const,
				name,
				position,
			})),
		);
	});
}

const countUnitsOf = async (forProject: string) =>
	(
		await db
			.select({ id: location.id })
			.from(location)
			.where(and(eq(location.projectId, forProject), eq(location.type, "unit")))
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
	txHost = app.get<TransactionHost<DatabaseAdapter>>(TransactionHost);
	units = app.get(UnitsService);

	admin = await signUp("Admin da Construtora");
	manager = await signUp("Gerente Vinculada");
	assistant = await signUp("Assistente Vinculado");
	unlinked = await signUp("Gerente Sem Vínculo");
	outsider = await signUp("Pessoa de Outra Construtora");

	organizationId = await organizationOf(admin.userId);
	await joinOrganization(manager, organizationId, "manager");
	await joinOrganization(assistant, organizationId, "assistant");
	await joinOrganization(unlinked, organizationId, "manager");

	const projects = await db
		.insert(project)
		.values([
			{ organizationId, name: "Casa Moinhos", reservedUnits: 10 },
			{ organizationId, name: "Torre Ipê", reservedUnits: 5 },
			{
				organizationId,
				name: "Entregue",
				reservedUnits: 2,
				status: "delivered",
			},
			{ organizationId, name: "Galpão Sul", reservedUnits: 7 },
		])
		.returning({ id: project.id });
	projectId = projects[0]!.id;
	otherProjectId = projects[1]!.id;
	deliveredProjectId = projects[2]!.id;
	emptyProjectId = projects[3]!.id;

	await db.insert(projectMember).values([
		{ projectId, userId: manager.userId, role: "manager" },
		{ projectId, userId: assistant.userId, role: "assistant" },
		{ projectId: otherProjectId, userId: manager.userId, role: "manager" },
	]);

	const [outsiderProject] = await db
		.insert(project)
		.values({
			organizationId: await organizationOf(outsider.userId),
			name: "Casa Moinhos",
			reservedUnits: 3,
		})
		.returning({ id: project.id });
	outsiderProjectId = outsiderProject!.id;

	floorId = await seedFloor(projectId);
	await seedUnits(projectId, floorId, ["101", "102", "103"]);

	const otherFloor = await seedFloor(otherProjectId);
	await seedUnits(otherProjectId, otherFloor, ["201", "202"]);

	const deliveredFloor = await seedFloor(deliveredProjectId);
	await seedUnits(deliveredProjectId, deliveredFloor, ["301", "302"]);
});

afterAll(async () => {
	for (const { userId } of [admin, manager, assistant, unlinked, outsider]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await app.close();
});

describe("GET /api/projects/:id/units", () => {
	test.each([
		["the admin", () => admin],
		["the manager", () => manager],
		["the assistant", () => assistant],
	] as const)("%s reads reserved, used and remaining", async (_who, caller) => {
		const res = await caller().agent.get(unitsPath(projectId));

		expect(res.status).toBe(200);
		expect(projectUnitsBalanceSchema.parse(res.body)).toEqual({
			reserved: 10,
			used: 3,
			remaining: 7,
		});
	});

	test("a project without structure uses nothing", async () => {
		const res = await admin.agent.get(unitsPath(emptyProjectId));

		expect(projectUnitsBalanceSchema.parse(res.body)).toEqual({
			reserved: 7,
			used: 0,
			remaining: 7,
		});
	});

	test("counts only the units of that project, not its floors, towers or other projects", async () => {
		const res = await admin.agent.get(unitsPath(otherProjectId));

		expect(projectUnitsBalanceSchema.parse(res.body)).toEqual({
			reserved: 5,
			used: 2,
			remaining: 3,
		});
	});

	test("a delivered project reads like any other", async () => {
		const res = await admin.agent.get(unitsPath(deliveredProjectId));

		expect(projectUnitsBalanceSchema.parse(res.body)).toEqual({
			reserved: 2,
			used: 2,
			remaining: 0,
		});
	});

	test.each([
		["a manager without a link to the project", () => unlinked],
		["a caller from another organization", () => outsider],
	] as const)("answers 404 PROJECT_NOT_FOUND to %s", async (_who, caller) => {
		const res = await caller().agent.get(unitsPath(projectId));

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
	});

	test("answers the same 404 for another organization's project and one that does not exist", async () => {
		const foreign = await admin.agent.get(unitsPath(outsiderProjectId));
		const missing = await admin.agent.get(unitsPath(randomUUID()));

		expect(foreign.status).toBe(404);
		expect(missing.status).toBe(404);
		expect(problemDetailsSchema.parse(foreign.body).code).toBe(
			PROJECT_NOT_FOUND,
		);
		expect(problemDetailsSchema.parse(missing.body).code).toBe(
			PROJECT_NOT_FOUND,
		);
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server).get(unitsPath(projectId));

		expect(res.status).toBe(401);
	});
});

describe("the project summary", () => {
	test("reports the units the project uses", async () => {
		const res = await manager.agent.get(`/api/projects/${projectId}`);

		expect(projectSummarySchema.parse(res.body).units).toEqual({
			reserved: 10,
			used: 3,
		});
	});

	test("reports each listed project's own units", async () => {
		const res = await admin.agent.get("/api/projects?status=all");

		const byName = Object.fromEntries(
			projectListSchema
				.parse(res.body)
				.items.map((item) => [item.name, item.units]),
		);
		expect(byName["Casa Moinhos"]).toEqual({ reserved: 10, used: 3 });
		expect(byName["Torre Ipê"]).toEqual({ reserved: 5, used: 2 });
		expect(byName["Galpão Sul"]).toEqual({ reserved: 7, used: 0 });
	});
});

describe("GET /api/organization/units", () => {
	test("reclaimable discounts the units projects in progress already use", async () => {
		const res = await admin.agent.get("/api/organization/units");

		expect(organizationUnitsSchema.parse(res.body)).toMatchObject({
			reserved: 24,
			reclaimable: 10 - 3 + (5 - 2) + 7,
		});
	});
});

describe("UnitsService.assertAvailable", () => {
	let sandbox: string;
	let sandboxFloor: string;

	beforeEach(async () => {
		const [created] = await db
			.insert(project)
			.values({ organizationId, name: randomUUID(), reservedUnits: 3 })
			.returning({ id: project.id });
		sandbox = created!.id;
		sandboxFloor = await seedFloor(sandbox);
	});

	afterEach(async () => {
		await db.delete(project).where(eq(project.id, sandbox));
	});

	const refusal = async (promise: Promise<unknown>) => {
		const error = await promise.then(
			() => undefined,
			(caught: unknown) => caught,
		);
		expect(error).toBeInstanceOf(ProblemException);
		return (error as ProblemException).problem;
	};

	test("lets a request that fits create its units", async () => {
		await createUnits(sandbox, sandboxFloor, ["101", "102", "103"]);

		expect(await countUnitsOf(sandbox)).toBe(3);
	});

	test("refuses the whole request when its new units pass what is left, creating nothing", async () => {
		await createUnits(sandbox, sandboxFloor, ["101"]);

		const problem = await refusal(
			createUnits(sandbox, sandboxFloor, ["102", "103", "104"]),
		);

		expect(problem).toMatchObject({
			status: 409,
			code: NO_UNITS_LEFT,
			requested: 3,
			available: 2,
		});
		expect(await countUnitsOf(sandbox)).toBe(1);
	});

	test("a request with no new units still passes after the last one is spent", async () => {
		await createUnits(sandbox, sandboxFloor, ["101", "102", "103"]);

		await expect(
			txHost.withTransaction(() => units.assertAvailable(sandbox, 0)),
		).resolves.toBeUndefined();
	});

	test("removing an empty unit gives its place back to the reservation", async () => {
		const spent = await seedUnits(sandbox, sandboxFloor, ["101", "102", "103"]);
		await expect(
			refusal(createUnits(sandbox, sandboxFloor, ["104"])),
		).resolves.toMatchObject({ code: NO_UNITS_LEFT, available: 0 });

		await db.delete(location).where(eq(location.id, spent[0]!.id));

		const res = await admin.agent.get(unitsPath(sandbox));
		expect(projectUnitsBalanceSchema.parse(res.body).remaining).toBe(1);
		await createUnits(sandbox, sandboxFloor, ["104"]);
		expect(await countUnitsOf(sandbox)).toBe(3);
	});

	test("simultaneous requests on one project never pass the reservation", async () => {
		const attempts = await Promise.allSettled(
			Array.from({ length: 8 }, (_, i) =>
				createUnits(sandbox, sandboxFloor, [`10${i}`]),
			),
		);

		expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(3);
		const refused = attempts.filter(
			(a): a is PromiseRejectedResult => a.status === "rejected",
		);
		expect(refused).toHaveLength(5);
		for (const { reason } of refused) {
			expect((reason as ProblemException).problem.code).toBe(NO_UNITS_LEFT);
		}
		expect(await countUnitsOf(sandbox)).toBe(3);
	});

	test("another project of the same organization is not affected", async () => {
		await createUnits(sandbox, sandboxFloor, ["101", "102", "103"]);

		const res = await admin.agent.get(unitsPath(otherProjectId));

		expect(projectUnitsBalanceSchema.parse(res.body).remaining).toBe(3);
		await expect(
			txHost.withTransaction(() => units.assertAvailable(otherProjectId, 3)),
		).resolves.toBeUndefined();
	});

	test("refuses to run outside the transaction that inserts", async () => {
		await expect(async () => units.assertAvailable(sandbox, 1)).rejects.toThrow(
			"no existing transaction is active",
		);
	});

	test("answers PROJECT_NOT_FOUND for a project that does not exist", async () => {
		const problem = await refusal(
			txHost.withTransaction(() => units.assertAvailable(randomUUID(), 1)),
		);

		expect(problem).toMatchObject({ status: 404, code: PROJECT_NOT_FOUND });
	});
});
