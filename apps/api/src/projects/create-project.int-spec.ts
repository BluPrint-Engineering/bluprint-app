import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	NO_UNITS_LEFT,
	problemDetailsSchema,
	projectListSchema,
	projectSummarySchema,
} from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "../db/database.module";
import { license, member, project, projectMember, user } from "../db/schema";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";
const PROJECTS = "/api/projects";

let app: INestApplication;
let server: Server;
let db: Database;

let creator: { userId: string; agent: ReturnType<typeof request.agent> };
let exhausted: { userId: string; agent: ReturnType<typeof request.agent> };
let contended: { userId: string; agent: ReturnType<typeof request.agent> };
let nonAdmin: { userId: string; agent: ReturnType<typeof request.agent> };

async function signUp(name: string) {
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

async function setLicenseUnits(
	organizationId: string,
	units: number,
): Promise<void> {
	await db.delete(license).where(eq(license.organizationId, organizationId));
	await db.insert(license).values({ organizationId, units });
}

async function reservedUnits(organizationId: string): Promise<number[]> {
	const rows = await db.query.project.findMany({
		where: eq(project.organizationId, organizationId),
	});
	return rows.map((row) => row.reservedUnits);
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

	creator = await signUp("Admin Criador");
	exhausted = await signUp("Admin Sem Unidades");
	contended = await signUp("Admin Disputado");
	nonAdmin = await signUp("Não Admin");

	await setLicenseUnits(await organizationOf(exhausted.userId), 50);
	await setLicenseUnits(await organizationOf(contended.userId), 100);

	await db
		.update(member)
		.set({ role: "manager" })
		.where(eq(member.userId, nonAdmin.userId));
});

afterAll(async () => {
	for (const { userId } of [creator, exhausted, contended, nonAdmin]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await app.close();
});

describe("POST /api/projects", () => {
	test("an admin with free units creates the project and sees it as admin", async () => {
		const res = await creator.agent
			.post(PROJECTS)
			.send({ name: "  Casa Moinhos  ", units: 80 });

		expect(res.status).toBe(201);
		const created = projectSummarySchema.parse(res.body);
		expect(created).toMatchObject({
			name: "Casa Moinhos",
			role: "admin",
			status: "active",
			units: { reserved: 80, used: 0 },
		});

		const listed = await creator.agent.get(PROJECTS);
		expect(projectListSchema.parse(listed.body).items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: created.id,
					role: "admin",
					units: { reserved: 80, used: 0 },
				}),
			]),
		);
	});

	test("reserves the units without consuming the license or creating a project membership", async () => {
		const organizationId = await organizationOf(creator.userId);

		expect(await reservedUnits(organizationId)).toEqual([80]);
		const licenses = await db.query.license.findMany({
			where: eq(license.organizationId, organizationId),
		});
		expect(licenses.map((row) => row.units)).toEqual([500]);

		const membership = await db.query.projectMember.findFirst({
			where: eq(projectMember.userId, creator.userId),
		});
		expect(membership).toBeUndefined();
	});

	test("counts the creation as the first activity", async () => {
		const res = await creator.agent
			.post(PROJECTS)
			.send({ name: "Bloco C", units: 1 });

		expect(res.status).toBe(201);
		const created = projectSummarySchema.parse(res.body);
		expect(created.lastActivityAt).toBe(created.createdAt);

		const listed = projectListSchema.parse(
			(await creator.agent.get(PROJECTS)).body,
		);
		expect(listed.items.find((p) => p.id === created.id)?.lastActivityAt).toBe(
			created.createdAt,
		);
	});

	test("with fewer free units than asked, answers 409 with what was asked and what is available, and creates nothing", async () => {
		const res = await exhausted.agent
			.post(PROJECTS)
			.send({ name: "Torre Ipê", units: 51 });

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body)).toMatchObject({
			code: NO_UNITS_LEFT,
			requested: 51,
			available: 50,
		});

		const listed = await exhausted.agent.get(PROJECTS);
		expect(projectListSchema.parse(listed.body)).toEqual({
			items: [],
			total: 0,
			counts: { active: 0, delivered: 0 },
		});
	});

	test("reserves exactly the free units, then refuses the next unit with none available", async () => {
		const all = await exhausted.agent
			.post(PROJECTS)
			.send({ name: "Torre Ipê", units: 50 });
		expect(all.status).toBe(201);

		const one = await exhausted.agent
			.post(PROJECTS)
			.send({ name: "Torre Ipê 2", units: 1 });
		expect(one.status).toBe(409);
		expect(problemDetailsSchema.parse(one.body)).toMatchObject({
			code: NO_UNITS_LEFT,
			requested: 1,
			available: 0,
		});
	});

	test("simultaneous creations never reserve more than the free units", async () => {
		const attempts = await Promise.all(
			Array.from({ length: 5 }, () =>
				contended.agent.post(PROJECTS).send({ name: "Galpão Sul", units: 40 }),
			),
		);

		const succeeded = attempts.filter((res) => res.status === 201);
		const conflicted = attempts.filter((res) => res.status === 409);

		expect(succeeded).toHaveLength(2);
		expect(conflicted).toHaveLength(3);
		for (const res of conflicted) {
			expect(problemDetailsSchema.parse(res.body).code).toBe(NO_UNITS_LEFT);
		}

		expect(await reservedUnits(await organizationOf(contended.userId))).toEqual(
			[40, 40],
		);
	});

	test("refuses a caller who is not the organization's admin", async () => {
		const res = await nonAdmin.agent
			.post(PROJECTS)
			.send({ name: "Casa Nova", units: 10 });

		expect(res.status).toBe(403);
		expect(problemDetailsSchema.parse(res.body).code).toBe("FORBIDDEN");
		expect(await reservedUnits(await organizationOf(nonAdmin.userId))).toEqual(
			[],
		);
	});

	test("rejects a blank name", async () => {
		const res = await creator.agent
			.post(PROJECTS)
			.send({ name: "   ", units: 10 });

		expect(res.status).toBe(400);
		const problem = problemDetailsSchema.parse(res.body);
		expect(problem.code).toBe("VALIDATION_FAILED");
		expect(problem.errors?.[0]?.pointer).toBe("/body/name");
	});

	test("rejects a name over 120 characters", async () => {
		const res = await creator.agent
			.post(PROJECTS)
			.send({ name: "a".repeat(121), units: 10 });

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("VALIDATION_FAILED");
	});

	test.each([
		["missing", undefined],
		["zero", 0],
		["negative", -5],
		["fractional", 1.5],
		["a string", "10"],
	])("rejects units that are %s", async (_label, units) => {
		const res = await creator.agent
			.post(PROJECTS)
			.send({ name: "Casa Nova", units });

		expect(res.status).toBe(400);
		const problem = problemDetailsSchema.parse(res.body);
		expect(problem.code).toBe("VALIDATION_FAILED");
		expect(problem.errors?.[0]?.pointer).toBe("/body/units");
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server)
			.post(PROJECTS)
			.send({ name: "Casa Nova", units: 10 });

		expect(res.status).toBe(401);
		expect(problemDetailsSchema.parse(res.body).code).toBe("UNAUTHORIZED");
	});
});
