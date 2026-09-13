import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	problemDetailsSchema,
	projectListSchema,
	projectSummarySchema,
} from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "../db/database.module";
import { license, member, projectMember, user } from "../db/schema";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";
const PROJECTS = "/api/projects";

let app: INestApplication;
let server: Server;
let db: Database;

/** One account per case, in its own organization (sign-up seeds one). Shared
 * across tests because sign-up is rate limited at 5/min. */
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

async function freeLicenseCount(organizationId: string): Promise<number> {
	const licenses = await db.query.license.findMany({
		where: eq(license.organizationId, organizationId),
	});
	return licenses.filter((row) => row.projectId === null).length;
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
	exhausted = await signUp("Admin Sem Licença");
	contended = await signUp("Admin Disputado");
	nonAdmin = await signUp("Não Admin");

	// `exhausted` starts with the sign-up's three free licenses; none survive.
	const exhaustedOrg = await organizationOf(exhausted.userId);
	await db.delete(license).where(eq(license.organizationId, exhaustedOrg));

	// `contended` keeps exactly one of its three free licenses.
	const contendedOrg = await organizationOf(contended.userId);
	const contendedLicenses = await db.query.license.findMany({
		where: eq(license.organizationId, contendedOrg),
	});
	await db
		.delete(license)
		.where(
			inArray(license.id, [contendedLicenses[0]!.id, contendedLicenses[1]!.id]),
		);

	// `nonAdmin` is downgraded from the admin sign-up gives everyone.
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
	test("an admin with a free license creates the project and sees it as admin", async () => {
		const res = await creator.agent
			.post(PROJECTS)
			.send({ name: "  Casa Moinhos  " });

		expect(res.status).toBe(201);
		const created = projectSummarySchema.parse(res.body);
		expect(created).toMatchObject({ name: "Casa Moinhos", role: "admin" });

		const listed = await creator.agent.get(PROJECTS);
		expect(projectListSchema.parse(listed.body)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: created.id, role: "admin" }),
			]),
		);
	});

	test("consumes exactly one license and creates no project membership", async () => {
		const organizationId = await organizationOf(creator.userId);

		expect(await freeLicenseCount(organizationId)).toBe(2);
		const consumed = await db.query.license.findMany({
			where: and(
				eq(license.organizationId, organizationId),
				isNotNull(license.projectId),
			),
		});
		expect(consumed).toHaveLength(1);

		const membership = await db.query.projectMember.findFirst({
			where: eq(projectMember.userId, creator.userId),
		});
		expect(membership).toBeUndefined();
	});

	test("without a free license, answers 409 and creates nothing", async () => {
		const res = await exhausted.agent
			.post(PROJECTS)
			.send({ name: "Torre Ipê" });

		expect(res.status).toBe(409);
		expect(problemDetailsSchema.parse(res.body).code).toBe("NO_FREE_LICENSE");

		const listed = await exhausted.agent.get(PROJECTS);
		expect(projectListSchema.parse(listed.body)).toEqual([]);
	});

	test("simultaneous creations with one free license produce exactly one project", async () => {
		const attempts = await Promise.all(
			Array.from({ length: 5 }, () =>
				contended.agent.post(PROJECTS).send({ name: "Galpão Sul" }),
			),
		);

		const succeeded = attempts.filter((res) => res.status === 201);
		const conflicted = attempts.filter((res) => res.status === 409);

		expect(succeeded).toHaveLength(1);
		expect(conflicted).toHaveLength(4);
		for (const res of conflicted) {
			expect(problemDetailsSchema.parse(res.body).code).toBe("NO_FREE_LICENSE");
		}

		const listed = await contended.agent.get(PROJECTS);
		expect(projectListSchema.parse(listed.body)).toHaveLength(1);
	});

	test("refuses a caller who is not the organization's admin", async () => {
		const res = await nonAdmin.agent.post(PROJECTS).send({ name: "Casa Nova" });

		expect(res.status).toBe(403);
		expect(problemDetailsSchema.parse(res.body).code).toBe("FORBIDDEN");
		expect(await freeLicenseCount(await organizationOf(nonAdmin.userId))).toBe(
			3,
		);
	});

	test("rejects a blank name", async () => {
		const res = await creator.agent.post(PROJECTS).send({ name: "   " });

		expect(res.status).toBe(400);
		const problem = problemDetailsSchema.parse(res.body);
		expect(problem.code).toBe("VALIDATION_FAILED");
		expect(problem.errors?.[0]?.pointer).toBe("/body/name");
	});

	test("rejects a name over 120 characters", async () => {
		const res = await creator.agent
			.post(PROJECTS)
			.send({ name: "a".repeat(121) });

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("VALIDATION_FAILED");
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server)
			.post(PROJECTS)
			.send({ name: "Casa Nova" });

		expect(res.status).toBe(401);
		expect(problemDetailsSchema.parse(res.body).code).toBe("UNAUTHORIZED");
	});
});
