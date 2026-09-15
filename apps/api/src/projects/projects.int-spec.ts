import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import { problemDetailsSchema, projectListSchema } from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "../db/database.module";
import { member, project, projectMember, user } from "../db/schema";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";
const PROJECTS = "/api/projects";

let app: INestApplication;
let server: Server;
let db: Database;

// one account per role this route distinguishes, shared: sign-up is rate limited at 5/min
let admin: { userId: string; agent: ReturnType<typeof request.agent> };
let linked: { userId: string; agent: ReturnType<typeof request.agent> };
let unlinked: { userId: string; agent: ReturnType<typeof request.agent> };
let outsider: { userId: string; agent: ReturnType<typeof request.agent> };

let projectOne: string;
let projectTwo: string;
let projectThree: string;

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
	linked = await signUp("Gerente Vinculada");
	unlinked = await signUp("Gerente Sem Vínculo");
	outsider = await signUp("Pessoa de Outra Construtora");

	const organizationId = await organizationOf(admin.userId);

	const created = await db
		.insert(project)
		.values([
			{ organizationId, name: "Casa Moinhos" },
			{ organizationId, name: "Torre Ipê" },
			{ organizationId, name: "Galpão Sul" },
		])
		.returning({ id: project.id });
	projectOne = created[0]!.id;
	projectTwo = created[1]!.id;
	projectThree = created[2]!.id;

	// linked's access and roles come from project_member below, never this organization membership
	await db.insert(member).values({
		organizationId,
		userId: linked.userId,
		role: "assistant",
	});
	await db.insert(projectMember).values([
		{ projectId: projectOne, userId: linked.userId, role: "manager" },
		{ projectId: projectTwo, userId: linked.userId, role: "assistant" },
	]);

	// same organization, no project: managers and assistants only see projects they belong to
	await db.insert(member).values({
		organizationId,
		userId: unlinked.userId,
		role: "manager",
	});

	await db.insert(projectMember).values({
		projectId: projectOne,
		userId: admin.userId,
		role: "manager",
	});
});

afterAll(async () => {
	for (const { userId } of [admin, linked, unlinked, outsider]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await app.close();
});

describe("GET /api/projects", () => {
	test("a project member sees only their projects, with the effective role", async () => {
		const res = await linked.agent.get(PROJECTS);

		expect(res.status).toBe(200);
		const projects = projectListSchema.parse(res.body);
		expect(projects).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: projectOne, role: "manager" }),
				expect.objectContaining({ id: projectTwo, role: "assistant" }),
			]),
		);
		expect(projects.map((p) => p.id)).not.toContain(projectThree);
		expect(projects).toHaveLength(2);
	});

	test("an organization member with no project membership sees nothing", async () => {
		const res = await unlinked.agent.get(PROJECTS);

		expect(res.status).toBe(200);
		expect(projectListSchema.parse(res.body)).toEqual([]);
	});

	test("the organization admin sees every project, reported as admin", async () => {
		const res = await admin.agent.get(PROJECTS);

		expect(res.status).toBe(200);
		const projects = projectListSchema.parse(res.body);
		expect(projects).toHaveLength(3);
		expect(projects).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: projectTwo, role: "admin" }),
				expect.objectContaining({ id: projectThree, role: "admin" }),
			]),
		);
	});

	test("the effective role wins over admin when the admin is also a project_member", async () => {
		const res = await admin.agent.get(PROJECTS);

		const projects = projectListSchema.parse(res.body);
		expect(projects).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: projectOne, role: "manager" }),
			]),
		);
	});

	test("a caller from another organization sees nothing", async () => {
		const res = await outsider.agent.get(PROJECTS);

		expect(res.status).toBe(200);
		expect(projectListSchema.parse(res.body)).toEqual([]);
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server).get(PROJECTS);

		expect(res.status).toBe(401);
		expect(problemDetailsSchema.parse(res.body).code).toBe("UNAUTHORIZED");
	});

	test("never leaks a field outside the shared response schema", async () => {
		const res = await admin.agent.get(PROJECTS);

		for (const row of res.body as Record<string, unknown>[]) {
			expect(Object.keys(row).sort()).toEqual(
				["createdAt", "id", "name", "role"].sort(),
			);
		}
	});
});
