import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	problemDetailsSchema,
	projectListSchema,
	projectManagersSchema,
} from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { and, eq } from "drizzle-orm";
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
// most recent activity first, the order `sort=activity` must answer in
let paginatedIdsByActivity: string[];

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
				// reversed against creation, in pairs sharing an instant, so activity disagrees with the other sorts
				lastActivityAt: new Date(base + Math.floor((25 - i) / 2) * 60_000),
			})),
		)
		.returning({
			id: project.id,
			name: project.name,
			createdAt: project.createdAt,
			lastActivityAt: project.lastActivityAt,
		});
	paginatedIds = rows
		.toSorted(
			(a, b) =>
				b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1),
		)
		.map((row) => row.id);
	paginatedIdsByActivity = rows
		.toSorted(
			(a, b) =>
				b.lastActivityAt.getTime() - a.lastActivityAt.getTime() ||
				(a.id < b.id ? 1 : -1),
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
		expect(projectListSchema.parse(res.body)).toEqual({
			items: [],
			total: 0,
			counts: { active: 0, delivered: 0 },
		});
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
		expect(projectListSchema.parse(res.body)).toEqual({
			items: [],
			total: 0,
			counts: { active: 0, delivered: 0 },
		});
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server).get(PROJECTS);

		expect(res.status).toBe(401);
		expect(problemDetailsSchema.parse(res.body).code).toBe("UNAUTHORIZED");
	});

	test("never leaks a field outside the shared response schema", async () => {
		const res = await admin.agent.get(PROJECTS);

		const body = res.body as { items: Record<string, unknown>[] };
		expect(Object.keys(body).sort()).toEqual(["counts", "items", "total"]);
		for (const row of body.items) {
			expect(Object.keys(row).sort()).toEqual(
				["createdAt", "id", "lastActivityAt", "name", "role", "status"].sort(),
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
		expect(await page("page=9")).toEqual({
			items: [],
			total: 26,
			counts: { active: 26, delivered: 0 },
		});
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

	test("activity walks every page by last activity, most recent first, ties broken by id", async () => {
		const walked = await walk("activity");

		expect(walked.map((p) => p.id)).toEqual(paginatedIdsByActivity);
		expect(walked.map((p) => p.id)).not.toEqual(paginatedIds);
	});

	test("activity reports each project's last activity", async () => {
		const { items } = await page("sort=activity&pageSize=100");

		const times = items.map((p) => Date.parse(p.lastActivityAt));
		expect(times).toEqual(times.toSorted((a, b) => b - a));
		expect(times[0]).toBe(Date.UTC(2026, 0, 1) + 12 * 60_000);
	});
});

describe("GET /api/projects search", () => {
	async function namesFor(q: string, extra = "") {
		const params = new URLSearchParams({ q, sort: "name" });
		return page(`${params.toString()}${extra}`);
	}

	test("finds a name by a substring, ignoring accents", async () => {
		const { items, total } = await namesFor("edificio");

		expect(items.map((p) => p.name)).toEqual([
			"Edifício Aurora",
			"Edificio Brisa",
		]);
		expect(total).toBe(2);
	});

	test("finds a name by an accented query, ignoring what the name spells plain", async () => {
		const { items } = await namesFor("edifício");

		expect(items.map((p) => p.name)).toEqual([
			"Edifício Aurora",
			"Edificio Brisa",
		]);
	});

	test("finds a name by any word of it, ignoring case", async () => {
		expect((await namesFor("MOINHOS")).items.map((p) => p.name)).toEqual([
			"Casa Moinhos",
		]);
		expect((await namesFor("agata")).items.map((p) => p.name)).toEqual([
			"Ágata Residencial",
		]);
	});

	test("finds a substring in the middle of a word", async () => {
		expect((await namesFor("plica")).items.map((p) => p.name)).toEqual([
			"Obra Duplicada",
			"Obra Duplicada",
			"Obra Duplicada",
		]);
	});

	test("takes a blank query as no search", async () => {
		expect((await namesFor("   ")).total).toBe(26);
	});

	test("takes % and _ as themselves, not as wildcards", async () => {
		expect((await namesFor("%")).total).toBe(0);
		expect((await namesFor("_")).total).toBe(0);
		expect((await namesFor("Bloco_C")).total).toBe(0);
	});

	test("answers the total of the search across every page", async () => {
		const first = await page("q=residencial&pageSize=5");

		// "Residencial 14" to "Residencial 24" and "Ágata Residencial"
		expect(first.total).toBe(12);
		expect(first.items).toHaveLength(5);
		expect((await page("q=residencial&pageSize=5&page=3")).items).toHaveLength(
			2,
		);
	});

	test("answers no items and total 0 when nothing matches", async () => {
		expect(await page("q=brisa-inexistente")).toEqual({
			items: [],
			total: 0,
			counts: { active: 0, delivered: 0 },
		});
	});

	test("never reaches another organization's project", async () => {
		expect((await namesFor("moinhos")).items.map((p) => p.name)).toEqual([
			"Casa Moinhos",
		]);

		const other = projectListSchema.parse(
			(await admin.agent.get(`${PROJECTS}?q=residencial`)).body,
		);
		expect(other).toEqual({
			items: [],
			total: 0,
			counts: { active: 0, delivered: 0 },
		});

		const own = projectListSchema.parse(
			(await admin.agent.get(`${PROJECTS}?q=casa`)).body,
		);
		expect(own.items.map((p) => p.id)).toEqual([projectOne]);
	});

	test("narrows a member to their own projects, not the organization's", async () => {
		const res = await linked.agent.get(`${PROJECTS}?q=galpao`);

		expect(projectListSchema.parse(res.body)).toEqual({
			items: [],
			total: 0,
			counts: { active: 0, delivered: 0 },
		});
	});

	test("rejects a query over 100 characters", async () => {
		const res = await paginated.agent.get(`${PROJECTS}?q=${"a".repeat(101)}`);

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("VALIDATION_FAILED");
	});
});

describe("GET /api/projects manager filter", () => {
	async function listAs(
		caller: { agent: ReturnType<typeof request.agent> },
		query: string,
	) {
		const res = await caller.agent.get(`${PROJECTS}?${query}`);
		expect(res.status).toBe(200);
		return projectListSchema.parse(res.body);
	}

	test("the admin sees only the projects where that person is manager, with the matching total", async () => {
		const { items, total } = await listAs(admin, `manager=${linked.userId}`);

		expect(items.map((p) => p.id)).toEqual([projectOne]);
		expect(total).toBe(1);
	});

	test("a project where the person is only assistant does not count", async () => {
		// linked is assistant on projectTwo and manager on projectOne
		const { items } = await listAs(admin, `manager=${linked.userId}`);

		expect(items.map((p) => p.id)).not.toContain(projectTwo);
	});

	test("a person whose only manager role is the default one matches no project", async () => {
		expect(await listAs(admin, `manager=${unlinked.userId}`)).toEqual({
			items: [],
			total: 0,
			counts: { active: 0, delivered: 0 },
		});
	});

	test("the admin cannot reach another organization's project through its manager", async () => {
		expect(await listAs(admin, `manager=${outsider.userId}`)).toEqual({
			items: [],
			total: 0,
			counts: { active: 0, delivered: 0 },
		});
	});

	test("is ignored for someone who is not the admin", async () => {
		const { items, total } = await listAs(linked, `manager=${admin.userId}`);

		expect(items.map((p) => p.id).sort()).toEqual(
			[projectOne, projectTwo].sort(),
		);
		expect(total).toBe(2);
	});

	test("rejects an empty manager", async () => {
		const res = await admin.agent.get(`${PROJECTS}?manager=`);

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("VALIDATION_FAILED");
	});
});

describe("GET /api/projects/managers", () => {
	const MANAGERS = `${PROJECTS}/managers`;

	test("lists whoever is manager on at least one project of the organization, by name", async () => {
		const res = await admin.agent.get(MANAGERS);

		expect(res.status).toBe(200);
		expect(projectManagersSchema.parse(res.body)).toEqual([
			{ id: admin.userId, name: "Admin da Construtora" },
			{ id: linked.userId, name: "Gerente Vinculada" },
		]);
	});

	test("leaves out someone who is only manager by default role", async () => {
		const res = await admin.agent.get(MANAGERS);

		const ids = projectManagersSchema.parse(res.body).map((m) => m.id);
		expect(ids).not.toContain(unlinked.userId);
	});

	test("lists a person once, however many projects they manage", async () => {
		await db.insert(projectMember).values({
			projectId: projectThree,
			userId: linked.userId,
			role: "manager",
		});

		const res = await admin.agent.get(MANAGERS);

		const ids = projectManagersSchema.parse(res.body).map((m) => m.id);
		expect(ids.filter((id) => id === linked.userId)).toHaveLength(1);

		await db
			.delete(projectMember)
			.where(
				and(
					eq(projectMember.projectId, projectThree),
					eq(projectMember.userId, linked.userId),
				),
			);
	});

	test("never lists someone from another organization", async () => {
		const res = await paginated.agent.get(MANAGERS);

		expect(res.status).toBe(200);
		expect(projectManagersSchema.parse(res.body)).toEqual([]);
	});

	test.each([
		["a manager", () => linked],
		["a member with no project", () => unlinked],
	])("refuses %s", async (_, caller) => {
		const res = await caller().agent.get(MANAGERS);

		expect(res.status).toBe(403);
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server).get(MANAGERS);

		expect(res.status).toBe(401);
	});
});
