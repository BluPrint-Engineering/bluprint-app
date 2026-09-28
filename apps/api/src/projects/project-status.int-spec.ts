import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	problemDetailsSchema,
	type ProjectStatus,
	projectListSchema,
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
let onlyDelivered: Person;
let outsider: Person;

let activeOne: string;
let activeTwo: string;
let deliveredOne: string;
let deliveredTwo: string;
let deliveredThree: string;

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

async function list(person: Person, query = "") {
	const res = await person.agent.get(`${PROJECTS}?${query}`);
	expect(res.status).toBe(200);
	return projectListSchema.parse(res.body);
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
	manager = await signUp("Gerente Vinculada");
	onlyDelivered = await signUp("Assistente da Obra Entregue");
	outsider = await signUp("Admin de Outra Construtora");

	const organizationId = await organizationOf(admin.userId);

	// created a minute apart, so `recent` orders them and the walk over pages is checkable
	const base = Date.UTC(2026, 0, 1);
	const projects: { name: string; status: ProjectStatus }[] = [
		{ name: "Em andamento 1", status: "active" },
		{ name: "Em andamento 2", status: "active" },
		{ name: "Entregue 1", status: "delivered" },
		{ name: "Entregue 2", status: "delivered" },
		{ name: "Entregue 3", status: "delivered" },
	];
	const created = await db
		.insert(project)
		.values(
			projects.map((values, i) => ({
				...values,
				organizationId,
				createdAt: new Date(base + i * 60_000),
			})),
		)
		.returning({ id: project.id });
	[activeOne, activeTwo, deliveredOne, deliveredTwo, deliveredThree] =
		created.map((row) => row.id) as [string, string, string, string, string];

	// sign-up gave each its own organization; one per person (RF-139), so it goes before they join this one
	for (const { userId } of [manager, onlyDelivered]) {
		await db
			.delete(organization)
			.where(eq(organization.id, await organizationOf(userId)));
		await db
			.insert(member)
			.values({ organizationId, userId, role: "assistant" });
	}
	await db.insert(projectMember).values([
		{ projectId: activeOne, userId: manager.userId, role: "manager" },
		{ projectId: deliveredOne, userId: manager.userId, role: "manager" },
		{
			projectId: deliveredTwo,
			userId: onlyDelivered.userId,
			role: "assistant",
		},
	]);

	// another organization's delivered project: no filter of the others may reach it
	await db.insert(project).values({
		organizationId: await organizationOf(outsider.userId),
		name: "Entregue de outra construtora",
		status: "delivered",
	});
});

afterAll(async () => {
	for (const { userId } of [admin, manager, onlyDelivered, outsider]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await app.close();
});

describe("GET /api/projects status", () => {
	test("lists only the projects in progress by default", async () => {
		const { items, total } = await list(admin);

		expect(items.map((p) => p.id)).toEqual([activeTwo, activeOne]);
		expect(items.every((p) => p.status === "active")).toBe(true);
		expect(total).toBe(2);
	});

	test("status=delivered lists only the delivered ones, each reporting its status", async () => {
		const { items, total } = await list(admin, "status=delivered");

		expect(items.map((p) => p.id)).toEqual([
			deliveredThree,
			deliveredTwo,
			deliveredOne,
		]);
		expect(items.every((p) => p.status === "delivered")).toBe(true);
		expect(total).toBe(3);
	});

	test("status=all lists both", async () => {
		const { items, total } = await list(admin, "status=all");

		expect(items.map((p) => p.id)).toEqual([
			deliveredThree,
			deliveredTwo,
			deliveredOne,
			activeTwo,
			activeOne,
		]);
		expect(total).toBe(5);
	});

	test("counts give each status, whichever one the request filtered by", async () => {
		for (const status of ["active", "delivered", "all"]) {
			const { counts } = await list(admin, `status=${status}`);

			expect(counts).toEqual({ active: 2, delivered: 3 });
		}
	});

	test("counts survive a page past the last", async () => {
		expect(await list(admin, "status=delivered&page=9")).toEqual({
			items: [],
			total: 3,
			counts: { active: 2, delivered: 3 },
		});
	});

	test("pages walk the filtered result without repeating or skipping", async () => {
		const walked = [
			...(await list(admin, "status=all&pageSize=2&page=1")).items,
			...(await list(admin, "status=all&pageSize=2&page=2")).items,
			...(await list(admin, "status=all&pageSize=2&page=3")).items,
		].map((p) => p.id);

		expect(walked).toEqual([
			deliveredThree,
			deliveredTwo,
			deliveredOne,
			activeTwo,
			activeOne,
		]);
	});

	test("status combines with the name sort", async () => {
		const { items } = await list(admin, "status=delivered&sort=name");

		expect(items.map((p) => p.name)).toEqual([
			"Entregue 1",
			"Entregue 2",
			"Entregue 3",
		]);
	});

	test("a project member sees only their projects in each status, and counts only those", async () => {
		const active = await list(manager);
		const delivered = await list(manager, "status=delivered");

		expect(active.items.map((p) => p.id)).toEqual([activeOne]);
		expect(delivered.items.map((p) => p.id)).toEqual([deliveredOne]);
		expect(active.counts).toEqual({ active: 1, delivered: 1 });
	});

	test("someone whose every project was delivered gets an empty list that still counts them", async () => {
		expect(await list(onlyDelivered)).toEqual({
			items: [],
			total: 0,
			counts: { active: 0, delivered: 1 },
		});
	});

	test("no status reaches another organization's project, nor counts it", async () => {
		const all = await list(admin, "status=all&pageSize=100");

		expect(all.items.map((p) => p.name)).not.toContain(
			"Entregue de outra construtora",
		);
		expect(all.counts.delivered).toBe(3);

		expect(await list(outsider, "status=delivered")).toMatchObject({
			total: 1,
			counts: { active: 0, delivered: 1 },
		});
	});

	test.each(["status=bogus", "status=Active", "status="])(
		"rejects %s",
		async (query) => {
			const res = await admin.agent.get(`${PROJECTS}?${query}`);

			expect(res.status).toBe(400);
			expect(problemDetailsSchema.parse(res.body).code).toBe(
				"VALIDATION_FAILED",
			);
		},
	);
});
