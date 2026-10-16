import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	type DefaultRole,
	organizationSchema,
	organizationUnitsSchema,
	problemDetailsSchema,
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

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";
const ORGANIZATION = "/api/organization";
const UNITS = "/api/organization/units";

let app: INestApplication;
let server: Server;
let db: Database;

type Caller = { userId: string; agent: ReturnType<typeof request.agent> };

let admin: Caller;
let manager: Caller;
let assistant: Caller;
let orphan: Caller;

let organizationId: string;

async function signUp(name: string): Promise<Caller> {
	const agent = request.agent(server);
	const res = await agent
		.post(SIGN_UP)
		.send({ email: `${randomUUID()}@example.com`, password: PASSWORD, name });
	const userId = (res.body as { user: { id: string } }).user.id;
	return { userId, agent };
}

async function organizationOf(userId: string): Promise<string> {
	const found = await db.query.member.findFirst({
		where: eq(member.userId, userId),
	});
	return found!.organizationId;
}

// TODO(#11): sign-up gives everyone an organization of their own; drop it to leave one membership (ADR 0012)
async function dropScaffoldOrganization(userId: string): Promise<void> {
	await db
		.delete(organization)
		.where(eq(organization.id, await organizationOf(userId)));
}

async function joinAs(userId: string, role: DefaultRole): Promise<void> {
	await dropScaffoldOrganization(userId);
	await db.insert(member).values({ organizationId, userId, role });
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
	orphan = await signUp("Suporte Sem Construtora");

	organizationId = await organizationOf(admin.userId);
	await db
		.update(organization)
		.set({ name: "Construtora Horizonte" })
		.where(eq(organization.id, organizationId));
	await joinAs(manager.userId, "manager");
	await joinAs(assistant.userId, "assistant");
	await dropScaffoldOrganization(orphan.userId);
});

afterAll(async () => {
	await db.delete(organization).where(eq(organization.id, organizationId));
	for (const { userId } of [admin, manager, assistant, orphan]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await app.close();
});

describe("GET /api/organization", () => {
	test.each([
		["admin", () => admin],
		["manager", () => manager],
		["assistant", () => assistant],
	] as const)(
		"answers the caller's organization with the default role %s",
		async (role, caller) => {
			const res = await caller().agent.get(ORGANIZATION);

			expect(res.status).toBe(200);
			expect(organizationSchema.parse(res.body)).toEqual({
				id: organizationId,
				name: "Construtora Horizonte",
				role,
			});
		},
	);

	test("reports the default role, not the effective role in a project", async () => {
		const [created] = await db
			.insert(project)
			.values({ organizationId, name: "Casa Moinhos" })
			.returning({ id: project.id });
		await db.insert(projectMember).values({
			projectId: created!.id,
			userId: manager.userId,
			role: "assistant",
		});

		const res = await manager.agent.get(ORGANIZATION);

		expect(organizationSchema.parse(res.body).role).toBe("manager");
	});

	test("answers 404 to a caller with no organization", async () => {
		const res = await orphan.agent.get(ORGANIZATION);

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(
			"ORGANIZATION_NOT_FOUND",
		);
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server).get(ORGANIZATION);

		expect(res.status).toBe(401);
		expect(problemDetailsSchema.parse(res.body).code).toBe("UNAUTHORIZED");
	});

	test("never leaks a field outside the shared response schema", async () => {
		const res = await admin.agent.get(ORGANIZATION);

		expect(Object.keys(res.body as object).sort()).toEqual(
			["id", "name", "role"].sort(),
		);
	});
});

describe("GET /api/organization/units", () => {
	test("tells the admin what is contracted, reserved, free and reclaimable", async () => {
		await db.delete(license).where(eq(license.organizationId, organizationId));
		await db.insert(license).values([
			{ organizationId, units: 400 },
			{ organizationId, units: 100 },
		]);
		await db.insert(project).values([
			{ organizationId, name: "Em Obra A", reservedUnits: 120 },
			{ organizationId, name: "Em Obra B", reservedUnits: 80 },
			{
				organizationId,
				name: "Entregue",
				reservedUnits: 50,
				status: "delivered",
			},
		]);

		const res = await admin.agent.get(UNITS);

		expect(res.status).toBe(200);
		expect(organizationUnitsSchema.parse(res.body)).toEqual({
			contracted: 500,
			reserved: 250,
			free: 250,
			reclaimable: 200,
		});
	});

	test("counts only the caller's own organization", async () => {
		const other = await signUp("Admin de Outra Construtora");
		try {
			const res = await other.agent.get(UNITS);

			expect(organizationUnitsSchema.parse(res.body)).toEqual({
				contracted: 500,
				reserved: 0,
				free: 500,
				reclaimable: 0,
			});
		} finally {
			await db
				.delete(organization)
				.where(eq(organization.id, await organizationOf(other.userId)));
			await db.delete(user).where(eq(user.id, other.userId));
		}
	});

	test.each([
		["manager", () => manager],
		["assistant", () => assistant],
		["a caller with no organization", () => orphan],
	] as const)("refuses %s", async (_who, caller) => {
		const res = await caller().agent.get(UNITS);

		expect(res.status).toBe(403);
		expect(problemDetailsSchema.parse(res.body).code).toBe("FORBIDDEN");
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server).get(UNITS);

		expect(res.status).toBe(401);
		expect(problemDetailsSchema.parse(res.body).code).toBe("UNAUTHORIZED");
	});

	test("never leaks a field outside the shared response schema", async () => {
		const res = await admin.agent.get(UNITS);

		expect(Object.keys(res.body as object).sort()).toEqual(
			["contracted", "free", "reclaimable", "reserved"].sort(),
		);
	});
});
