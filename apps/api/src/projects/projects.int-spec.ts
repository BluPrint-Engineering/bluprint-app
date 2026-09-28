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

let app: INestApplication;
let server: Server;
let db: Database;

// one account per role this route distinguishes, shared: sign-up is rate limited at 5/min
let admin: { userId: string; agent: ReturnType<typeof request.agent> };
let linked: { userId: string; agent: ReturnType<typeof request.agent> };
let unlinked: { userId: string; agent: ReturnType<typeof request.agent> };
let outsider: { userId: string; agent: ReturnType<typeof request.agent> };
let paginated: { userId: string; agent: ReturnType<typeof request.agent> };

let projectOne: string;
let projectTwo: string;
let projectThree: string;
// newest first, the order the list must answer in
let paginatedIds: string[];
// alphabetical, the order `sort=name` must answer in
let paginatedIdsByName: string[];

// pt-BR alphabetical order: an accent or a lowercase initial keeps a name among its letter
const NAMES_ALPHABETICAL = [
	"Ágata Residencial",
	"Alameda Santos",
	"Bloco C",
	"Casa Moinhos",
	"casa Verde",
	"Edifício Aurora",
	"Edificio Brisa",
	"Élan Office",
	"Estação Norte",
	"Galpão Sul",
	// straddles the first page break, which only the id orders
	"Obra Duplicada",
	"Obra Duplicada",
	"Obra Duplicada",
	...Array.from({ length: 11 }, (_, i) => `Residencial ${i + 14}`),
	"Torre Ipê",
	"Última Etapa",
];

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
	paginated = await signUp("Admin com Muitas Obras");

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

	// sign-up gave each its own organization; one per person (RF-139), so it goes before they join this one
	for (const { userId } of [linked, unlinked]) {
		await db
			.delete(organization)
			.where(eq(organization.id, await organizationOf(userId)));
	}

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

	// 26 projects over 13 creation instants, two per instant, so pages cross ties that only the id breaks;
	// names are shuffled against creation, so the two sorts disagree
	const paginatedOrganization = await organizationOf(paginated.userId);
	const base = Date.UTC(2026, 0, 1);
	const rows = await db
		.insert(project)
		.values(
			Array.from({ length: 26 }, (_, i) => ({
				organizationId: paginatedOrganization,
				name: NAMES_ALPHABETICAL[(i * 7) % 26]!,
				createdAt: new Date(base + Math.floor(i / 2) * 60_000),
			})),
		)
		.returning({
			id: project.id,
			name: project.name,
			createdAt: project.createdAt,
		});
	paginatedIds = rows
		.toSorted(
			(a, b) =>
				b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1),
		)
		.map((row) => row.id);
	paginatedIdsByName = rows
		.toSorted(
			(a, b) =>
				NAMES_ALPHABETICAL.indexOf(a.name) -
					NAMES_ALPHABETICAL.indexOf(b.name) || (a.id < b.id ? -1 : 1),
		)
		.map((row) => row.id);
});

afterAll(async () => {
	for (const { userId } of [admin, linked, unlinked, outsider, paginated]) {
		await db.delete(user).where(eq(user.id, userId));
	}
	await app.close();
});

describe("GET /api/projects", () => {
	test("a project member sees only their projects, with the effective role", async () => {
		const res = await linked.agent.get(PROJECTS);

		expect(res.status).toBe(200);
		const { items, total } = projectListSchema.parse(res.body);
		expect(items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: projectOne, role: "manager" }),
				expect.objectContaining({ id: projectTwo, role: "assistant" }),
			]),
		);
		expect(items.map((p) => p.id)).not.toContain(projectThree);
		expect(items).toHaveLength(2);
		expect(total).toBe(2);
	});

	test("an organization member with no project membership sees nothing", async () => {
		const res = await unlinked.agent.get(PROJECTS);

		expect(res.status).toBe(200);
		expect(projectListSchema.parse(res.body)).toEqual({ items: [], total: 0 });
	});

	test("the organization admin sees every project, reported as admin", async () => {
		const res = await admin.agent.get(PROJECTS);

		expect(res.status).toBe(200);
		const { items, total } = projectListSchema.parse(res.body);
		expect(items).toHaveLength(3);
		expect(total).toBe(3);
		expect(items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: projectTwo, role: "admin" }),
				expect.objectContaining({ id: projectThree, role: "admin" }),
			]),
		);
	});

	test("the effective role wins over admin when the admin is also a project_member", async () => {
		const res = await admin.agent.get(PROJECTS);

		const { items } = projectListSchema.parse(res.body);
		expect(items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: projectOne, role: "manager" }),
			]),
		);
	});

	test("a caller from another organization sees nothing", async () => {
		const res = await outsider.agent.get(PROJECTS);

		expect(res.status).toBe(200);
		expect(projectListSchema.parse(res.body)).toEqual({ items: [], total: 0 });
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server).get(PROJECTS);

		expect(res.status).toBe(401);
		expect(problemDetailsSchema.parse(res.body).code).toBe("UNAUTHORIZED");
	});

	test("never leaks a field outside the shared response schema", async () => {
		const res = await admin.agent.get(PROJECTS);

		const body = res.body as { items: Record<string, unknown>[] };
		expect(Object.keys(body).sort()).toEqual(["items", "total"]);
		for (const row of body.items) {
			expect(Object.keys(row).sort()).toEqual(
				["createdAt", "id", "name", "role"].sort(),
			);
		}
	});
});

async function page(query: string) {
	const res = await paginated.agent.get(`${PROJECTS}?${query}`);
	expect(res.status).toBe(200);
	return projectListSchema.parse(res.body);
}

describe("GET /api/projects pagination", () => {
	test("answers 12 projects by default, with the total across every page", async () => {
		const { items, total } = await page("");

		expect(items.map((p) => p.id)).toEqual(paginatedIds.slice(0, 12));
		expect(total).toBe(26);
	});

	test("walks every page newest first, ties broken by id, without repeating or skipping", async () => {
		const walked = [
			...(await page("page=1")).items,
			...(await page("page=2")).items,
			...(await page("page=3")).items,
		].map((p) => p.id);

		expect(walked).toEqual(paginatedIds);
	});

	test("the last page holds the remainder", async () => {
		const { items, total } = await page("page=3");

		expect(items).toHaveLength(2);
		expect(total).toBe(26);
	});

	test("a page past the last answers no items and the real total", async () => {
		expect(await page("page=9")).toEqual({ items: [], total: 26 });
	});

	test("honours a page size", async () => {
		const { items } = await page("page=2&pageSize=5");

		expect(items.map((p) => p.id)).toEqual(paginatedIds.slice(5, 10));
	});

	test("no page reaches another organization's project, nor counts it", async () => {
		const { items, total } = await page("pageSize=100");

		expect(total).toBe(26);
		expect(items.map((p) => p.id)).toEqual(paginatedIds);

		const other = projectListSchema.parse(
			(await admin.agent.get(`${PROJECTS}?pageSize=100`)).body,
		);
		expect(other.total).toBe(3);
		expect(other.items.filter((p) => paginatedIds.includes(p.id))).toEqual([]);
	});

	test.each([
		"page=0",
		"page=abc",
		"pageSize=0",
		"pageSize=101",
		"page=1.5",
		"sort=bogus",
		"sort=Name",
	])("rejects %s", async (query) => {
		const res = await paginated.agent.get(`${PROJECTS}?${query}`);

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("VALIDATION_FAILED");
	});
});

describe("GET /api/projects sort", () => {
	async function walk(sort: string) {
		return [
			...(await page(`sort=${sort}&page=1`)).items,
			...(await page(`sort=${sort}&page=2`)).items,
			...(await page(`sort=${sort}&page=3`)).items,
		];
	}

	test("recent is the default: newest first", async () => {
		expect((await walk("recent")).map((p) => p.id)).toEqual(paginatedIds);
	});

	test("name walks every page in pt-BR alphabetical order, ignoring accents and case", async () => {
		const walked = await walk("name");

		expect(walked.map((p) => p.name)).toEqual(NAMES_ALPHABETICAL);
	});

	test("name breaks a tie by id, so pages never repeat or skip a project", async () => {
		const walked = await walk("name");

		expect(walked.map((p) => p.id)).toEqual(paginatedIdsByName);
	});

	test("name keeps the total", async () => {
		expect((await page("sort=name")).total).toBe(26);
	});
});
