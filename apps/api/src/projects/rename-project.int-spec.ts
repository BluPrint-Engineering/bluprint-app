import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	projectSummarySchema,
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

let active: string;
let delivered: string;

const LAST_ACTIVITY = new Date(Date.UTC(2026, 0, 2));

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

async function nameOf(projectId: string): Promise<string> {
	const found = await db.query.project.findFirst({
		where: eq(project.id, projectId),
	});
	return found!.name;
}

function rename(person: Person, id: string, body: unknown) {
	return person.agent.patch(`${PROJECTS}/${id}`).send(body as object);
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

	const organizationId = await organizationOf(admin.userId);
	const created = await db
		.insert(project)
		.values([
			{
				organizationId,
				name: "Casa Moinhos",
				lastActivityAt: LAST_ACTIVITY,
			},
			{
				organizationId,
				name: "Torre Entregue",
				status: "delivered",
				lastActivityAt: LAST_ACTIVITY,
			},
		])
		.returning({ id: project.id });
	active = created[0]!.id;
	delivered = created[1]!.id;

	await joinAs(manager, organizationId, "manager");
	await joinAs(assistant, organizationId, "assistant");
	await joinAs(unlinked, organizationId, "manager");
	await db.insert(projectMember).values([
		{ projectId: active, userId: manager.userId, role: "manager" },
		{ projectId: delivered, userId: manager.userId, role: "manager" },
		{ projectId: active, userId: assistant.userId, role: "assistant" },
		{ projectId: delivered, userId: assistant.userId, role: "assistant" },
	]);
});

afterAll(async () => {
	for (const { userId } of [admin, manager, assistant, unlinked, outsider]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await app.close();
});

describe("PATCH /api/projects/:id", () => {
	test("the organization admin renames any project and gets the updated summary", async () => {
		const res = await rename(admin, active, { name: "  Casa Moinhos II  " });

		expect(res.status).toBe(200);
		expect(projectSummarySchema.parse(res.body)).toMatchObject({
			id: active,
			name: "Casa Moinhos II",
			role: "admin",
			status: "active",
		});
		expect(await nameOf(active)).toBe("Casa Moinhos II");
	});

	test("a manager renames their project", async () => {
		const res = await rename(manager, active, { name: "Casa Moinhos III" });

		expect(res.status).toBe(200);
		expect(projectSummarySchema.parse(res.body)).toMatchObject({
			name: "Casa Moinhos III",
			role: "manager",
		});
		expect(await nameOf(active)).toBe("Casa Moinhos III");
	});

	test("an assistant is refused and the name stays", async () => {
		const res = await rename(assistant, active, { name: "Sem Permissão" });

		expect(res.status).toBe(403);
		expect(await nameOf(active)).toBe("Casa Moinhos III");
	});

	test("the answer reads back in the list and in the single read", async () => {
		const res = await rename(admin, active, { name: "Casa Moinhos" });
		const read = await admin.agent.get(`${PROJECTS}/${active}`);

		expect(projectSummarySchema.parse(read.body)).toEqual(
			projectSummarySchema.parse(res.body),
		);
	});

	test("does not move the last activity", async () => {
		const res = await rename(admin, active, { name: "Casa Moinhos Norte" });

		expect(projectSummarySchema.parse(res.body).lastActivityAt).toBe(
			LAST_ACTIVITY.toISOString(),
		);
		const stored = await db.query.project.findFirst({
			where: eq(project.id, active),
		});
		expect(stored!.lastActivityAt).toEqual(LAST_ACTIVITY);
	});

	test.each([
		["admin", () => admin],
		["manager", () => manager],
	])(
		"a delivered project answers 409 PROJECT_DELIVERED to the %s and keeps its name",
		async (_role, person) => {
			const res = await rename(person(), delivered, { name: "Outro Nome" });

			expect(res.status).toBe(409);
			expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_DELIVERED);
			expect(await nameOf(delivered)).toBe("Torre Entregue");
		},
	);

	test("an assistant on a delivered project is still refused with 403", async () => {
		const res = await rename(assistant, delivered, { name: "Outro Nome" });

		expect(res.status).toBe(403);
	});

	test("a project the caller is not linked to answers 404 PROJECT_NOT_FOUND", async () => {
		const res = await rename(unlinked, active, { name: "Intruso" });

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
		expect(await nameOf(active)).toBe("Casa Moinhos Norte");
	});

	test("another organization's project answers the same 404 as one that does not exist", async () => {
		const foreign = await rename(outsider, active, { name: "Intruso" });
		const missing = await rename(admin, randomUUID(), { name: "Intruso" });

		expect(foreign.status).toBe(404);
		expect(missing.status).toBe(404);
		const { instance: _foreign, ...foreignProblem } =
			problemDetailsSchema.parse(foreign.body);
		const { instance: _missing, ...missingProblem } =
			problemDetailsSchema.parse(missing.body);
		expect(foreignProblem).toEqual(missingProblem);
		expect(await nameOf(active)).toBe("Casa Moinhos Norte");
	});

	test.each([
		["an empty name", { name: "" }],
		["a blank name", { name: "   " }],
		["a name over 120 characters", { name: "a".repeat(121) }],
		["a missing name", {}],
		["a name that is not text", { name: 7 }],
	])("rejects %s with a validation failure", async (_case, body) => {
		const res = await rename(admin, active, body);

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("VALIDATION_FAILED");
		expect(await nameOf(active)).toBe("Casa Moinhos Norte");
	});

	test("accepts a name of exactly 120 characters", async () => {
		const name = "a".repeat(120);

		const res = await rename(admin, active, { name });

		expect(res.status).toBe(200);
		expect(await nameOf(active)).toBe(name);
	});

	test("rejects an id that is not a UUID with a validation failure", async () => {
		const res = await rename(admin, "not-a-uuid", { name: "Casa" });

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("VALIDATION_FAILED");
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server)
			.patch(`${PROJECTS}/${active}`)
			.send({ name: "Anônimo" });

		expect(res.status).toBe(401);
		expect(problemDetailsSchema.parse(res.body).code).toBe("UNAUTHORIZED");
	});
});
