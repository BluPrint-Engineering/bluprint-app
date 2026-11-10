import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	projectListSchema,
	projectManagersSchema,
	projectSummarySchema,
} from "@bluprint/shared";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { and, eq, sql } from "drizzle-orm";
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

let admin: { userId: string; agent: ReturnType<typeof request.agent> };
let linked: { userId: string; agent: ReturnType<typeof request.agent> };
let unlinked: { userId: string; agent: ReturnType<typeof request.agent> };
let outsider: { userId: string; agent: ReturnType<typeof request.agent> };
let paginated: { userId: string; agent: ReturnType<typeof request.agent> };

let projectOne: string;
let projectTwo: string;
let projectThree: string;
let paginatedIds: string[];
let paginatedIdsByName: string[];
let paginatedIdsByActivity: string[];

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
			{ organizationId, name: "Casa Moinhos", reservedUnits: 40 },
			{ organizationId, name: "Torre Ipê" },
			{ organizationId, name: "Galpão Sul" },
		])
		.returning({ id: project.id });
	projectOne = created[0]!.id;
	projectTwo = created[1]!.id;
	projectThree = created[2]!.id;

	for (const { userId } of [linked, unlinked]) {
		await db
			.delete(organization)
			.where(eq(organization.id, await organizationOf(userId)));
	}

	await db.insert(member).values({
		organizationId,
		userId: linked.userId,
		role: "assistant",
	});
	await db.insert(projectMember).values([
		{ projectId: projectOne, userId: linked.userId, role: "manager" },
		{ projectId: projectTwo, userId: linked.userId, role: "assistant" },
	]);

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

	const paginatedOrganization = await organizationOf(paginated.userId);
	const base = Date.UTC(2026, 0, 1);
	const rows = await db
		.insert(project)
		.values(
			Array.from({ length: 26 }, (_, i) => ({
				organizationId: paginatedOrganization,
				name: NAMES_ALPHABETICAL[(i * 7) % 26]!,
				createdAt: new Date(base + Math.floor(i / 2) * 60_000),
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

	test("reports each project's reserved units, none used yet", async () => {
		const res = await linked.agent.get(PROJECTS);

		const { items } = projectListSchema.parse(res.body);
		expect(items.find((p) => p.id === projectOne)?.units).toEqual({
			reserved: 40,
			used: 0,
		});
		expect(items.find((p) => p.id === projectTwo)?.units).toEqual({
			reserved: 0,
			used: 0,
		});
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
				[
					"createdAt",
					"delivery",
					"id",
					"lastActivityAt",
					"name",
					"role",
					"status",
					"units",
				].sort(),
			);
		}
	});
});

describe("GET /api/projects/:id", () => {
	const read = (id: string) => `${PROJECTS}/${id}`;

	test("the organization admin reads any project of the organization, reported as admin", async () => {
		const res = await admin.agent.get(read(projectThree));

		expect(res.status).toBe(200);
		expect(projectSummarySchema.parse(res.body)).toMatchObject({
			id: projectThree,
			name: "Galpão Sul",
			role: "admin",
			status: "active",
		});
	});

	test("the effective role wins over admin when the admin is also a project_member", async () => {
		const res = await admin.agent.get(read(projectOne));

		expect(projectSummarySchema.parse(res.body).role).toBe("manager");
	});

	test("a manager reads their project", async () => {
		const res = await linked.agent.get(read(projectOne));

		expect(res.status).toBe(200);
		expect(projectSummarySchema.parse(res.body)).toMatchObject({
			id: projectOne,
			role: "manager",
		});
	});

	test("an assistant reads their project", async () => {
		const res = await linked.agent.get(read(projectTwo));

		expect(res.status).toBe(200);
		expect(projectSummarySchema.parse(res.body)).toMatchObject({
			id: projectTwo,
			role: "assistant",
		});
	});

	test("answers the very summary the list gives", async () => {
		const listed = projectListSchema
			.parse((await linked.agent.get(PROJECTS)).body)
			.items.find((p) => p.id === projectOne);

		const res = await linked.agent.get(read(projectOne));

		expect(projectSummarySchema.parse(res.body)).toEqual(listed);
	});

	test("answers 404 PROJECT_NOT_FOUND to a member with no membership on the project", async () => {
		const res = await linked.agent.get(read(projectThree));

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
	});

	test("answers 404 PROJECT_NOT_FOUND to an organization member linked to no project", async () => {
		const res = await unlinked.agent.get(read(projectOne));

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
	});

	test("answers 404 PROJECT_NOT_FOUND for another organization's project", async () => {
		const res = await outsider.agent.get(read(projectOne));

		expect(res.status).toBe(404);
		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
	});

	test("answers the same 404 to a project that does not exist, revealing nothing", async () => {
		const missing = await admin.agent.get(read(randomUUID()));
		const foreign = await outsider.agent.get(read(projectOne));

		expect(missing.status).toBe(404);
		expect(foreign.status).toBe(404);
		const { instance: _missing, ...missingProblem } =
			problemDetailsSchema.parse(missing.body);
		const { instance: _foreign, ...foreignProblem } =
			problemDetailsSchema.parse(foreign.body);
		expect(missingProblem).toEqual(foreignProblem);
	});

	test("rejects an id that is not a UUID with a validation failure", async () => {
		const res = await admin.agent.get(read("not-a-uuid"));

		expect(res.status).toBe(400);
		expect(problemDetailsSchema.parse(res.body).code).toBe("VALIDATION_FAILED");
	});

	test("refuses an anonymous caller", async () => {
		const res = await request(server).get(read(projectOne));

		expect(res.status).toBe(401);
		expect(problemDetailsSchema.parse(res.body).code).toBe("UNAUTHORIZED");
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

		expect(items.map((p) => p.id)).toEqual(paginatedIdsByActivity.slice(0, 12));
		expect(total).toBe(26);
	});

	test("walks every page by my recent use, ties broken by id, without repeating or skipping", async () => {
		const walked = [
			...(await page("page=1")).items,
			...(await page("page=2")).items,
			...(await page("page=3")).items,
		].map((p) => p.id);

		expect(walked).toEqual(paginatedIdsByActivity);
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

		expect(items.map((p) => p.id)).toEqual(paginatedIdsByActivity.slice(5, 10));
	});

	test("no page reaches another organization's project, nor counts it", async () => {
		const { items, total } = await page("pageSize=100");

		expect(total).toBe(26);
		expect(items.map((p) => p.id)).toEqual(paginatedIdsByActivity);

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

	test("recent is newest first", async () => {
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

describe("my recent use", () => {
	async function ids(
		agent: ReturnType<typeof request.agent>,
		query = "pageSize=100",
	) {
		const res = await agent.get(`${PROJECTS}?${query}`);
		expect(res.status).toBe(200);
		return projectListSchema.parse(res.body).items.map((item) => item.id);
	}

	async function forget(userId: string) {
		await db.execute(sql`delete from project_use where user_id = ${userId}`);
	}

	test("myUse is the default, and an explicit sort=myUse matches it", async () => {
		await forget(paginated.userId);
		const res = await paginated.agent.get(`${PROJECTS}?pageSize=100`);

		expect(res.status).toBe(200);
		expect(
			projectListSchema.parse(res.body).items.map((item) => item.id),
		).toEqual(paginatedIdsByActivity);
		expect(
			projectListSchema
				.parse(
					(await paginated.agent.get(`${PROJECTS}?sort=myUse&pageSize=100`))
						.body,
				)
				.items.map((item) => item.id),
		).toEqual(paginatedIdsByActivity);
	});

	test("opening a project puts it first, and projects never used stay behind by last activity", async () => {
		await forget(paginated.userId);
		const oldest = paginatedIdsByActivity.at(-1)!;

		const opened = await paginated.agent.get(`${PROJECTS}/${oldest}`);

		expect(opened.status).toBe(200);
		expect(await ids(paginated.agent)).toEqual([
			oldest,
			...paginatedIdsByActivity.filter((id) => id !== oldest),
		]);
	});

	test("a change by someone else does not move my order", async () => {
		await forget(admin.userId);
		await forget(linked.userId);
		expect((await admin.agent.get(`${PROJECTS}/${projectTwo}`)).status).toBe(
			200,
		);
		const before = await ids(admin.agent, "pageSize=100");
		expect(before[0]).toBe(projectTwo);

		const renamed = await linked.agent
			.patch(`${PROJECTS}/${projectOne}`)
			.send({ name: "Casa Moinhos Renomeada" });

		expect(renamed.status).toBe(200);
		expect(await ids(admin.agent, "pageSize=100")).toEqual(before);
		expect(await ids(linked.agent, "pageSize=100")).toEqual([
			projectOne,
			projectTwo,
		]);
	});

	test("creating a project counts as my use of it", async () => {
		await forget(paginated.userId);
		const oldest = paginatedIdsByActivity.at(-1)!;
		expect((await paginated.agent.get(`${PROJECTS}/${oldest}`)).status).toBe(
			200,
		);
		const id = randomUUID();

		const created = await paginated.agent
			.post(PROJECTS)
			.send({ id, name: "Obra Acabada de Criar", units: 2 });

		expect(created.status).toBe(201);
		expect((await ids(paginated.agent)).slice(0, 2)).toEqual([id, oldest]);
		await db.delete(project).where(eq(project.id, id));
	});

	test("changing a reservation from the units screen counts for that project", async () => {
		await forget(paginated.userId);
		const oldest = paginatedIdsByActivity.at(-1)!;

		const changed = await paginated.agent
			.patch("/api/organization/units/reservations")
			.send({ items: [{ projectId: oldest, reserved: 1 }] });

		expect(changed.status).toBe(200);
		expect((await ids(paginated.agent))[0]).toBe(oldest);
	});

	test("the project list, the managers list and the units screens do not count", async () => {
		await forget(paginated.userId);
		const oldest = paginatedIdsByActivity.at(-1)!;
		expect((await paginated.agent.get(`${PROJECTS}/${oldest}`)).status).toBe(
			200,
		);

		expect((await paginated.agent.get(PROJECTS)).status).toBe(200);
		expect((await paginated.agent.get(`${PROJECTS}/managers`)).status).toBe(
			200,
		);
		expect((await paginated.agent.get("/api/organization/units")).status).toBe(
			200,
		);
		expect(
			(await paginated.agent.get("/api/organization/units/reservations"))
				.status,
		).toBe(200);
		expect(await ids(paginated.agent)).toEqual([
			oldest,
			...paginatedIdsByActivity.filter((id) => id !== oldest),
		]);
	});

	test("a refused request does not count", async () => {
		await forget(paginated.userId);
		await forget(linked.userId);
		expect((await linked.agent.get(`${PROJECTS}/${projectOne}`)).status).toBe(
			200,
		);
		const missing = randomUUID();

		expect((await paginated.agent.get(`${PROJECTS}/${missing}`)).status).toBe(
			404,
		);
		expect(
			(
				await paginated.agent
					.patch("/api/organization/units/reservations")
					.send({ items: [{ projectId: missing, reserved: 1 }] })
			).status,
		).toBe(404);
		expect(
			(
				await paginated.agent
					.patch("/api/organization/units/reservations")
					.send({
						items: [
							{ projectId: paginatedIdsByActivity.at(-1)!, reserved: 10000 },
						],
					})
			).status,
		).toBe(409);
		expect(
			(
				await linked.agent
					.patch(`${PROJECTS}/${projectTwo}`)
					.send({ name: "Torre Recusada" })
			).status,
		).toBe(403);
		expect(await ids(paginated.agent)).toEqual(paginatedIdsByActivity);
		expect(await ids(linked.agent, "pageSize=100")).toEqual([
			projectOne,
			projectTwo,
		]);
	});

	test("opening again within 5 minutes does not pass the project opened after it", async () => {
		await forget(paginated.userId);
		const newest = paginatedIdsByActivity[0]!;
		const oldest = paginatedIdsByActivity.at(-1)!;

		expect((await paginated.agent.get(`${PROJECTS}/${oldest}`)).status).toBe(
			200,
		);
		expect((await paginated.agent.get(`${PROJECTS}/${newest}`)).status).toBe(
			200,
		);
		expect((await paginated.agent.get(`${PROJECTS}/${oldest}`)).status).toBe(
			200,
		);

		expect((await ids(paginated.agent)).slice(0, 2)).toEqual([newest, oldest]);

		await db.execute(
			sql`update project_use set last_used_at = now() - interval '6 minutes' where user_id = ${paginated.userId} and project_id = ${oldest}`,
		);
		expect((await paginated.agent.get(`${PROJECTS}/${oldest}`)).status).toBe(
			200,
		);

		expect((await ids(paginated.agent)).slice(0, 2)).toEqual([oldest, newest]);
	});

	test("a tie in my use breaks by id, after unused projects ordered by last activity", async () => {
		await forget(paginated.userId);
		const unused = paginatedIdsByActivity[0]!;
		const used = paginatedIdsByActivity.slice(-2);

		for (const id of used) {
			expect((await paginated.agent.get(`${PROJECTS}/${id}`)).status).toBe(200);
		}
		await db.execute(
			sql`update project_use set last_used_at = '2026-01-01T00:00:00Z' where user_id = ${paginated.userId}`,
		);

		const tied = used.toSorted((a, b) => (a < b ? 1 : -1));
		expect((await ids(paginated.agent)).slice(0, 3)).toEqual([
			tied[0],
			tied[1],
			unused,
		]);
	});

	test("my recent use keeps search, the status filter and stable pages", async () => {
		await forget(paginated.userId);
		const last = paginatedIdsByActivity.at(-1)!;

		expect((await paginated.agent.get(`${PROJECTS}/${last}`)).status).toBe(200);
		const firstPage = await ids(paginated.agent, "page=1");
		const secondPage = await ids(paginated.agent, "page=2");
		const thirdPage = await ids(paginated.agent, "page=3");
		const walked = [...firstPage, ...secondPage, ...thirdPage];

		expect(firstPage[0]).toBe(last);
		expect(walked).toEqual([
			last,
			...paginatedIdsByActivity.filter((id) => id !== last),
		]);
		expect(new Set(walked).size).toBe(paginatedIdsByActivity.length);

		const named = projectListSchema
			.parse(
				(await paginated.agent.get(`${PROJECTS}?sort=name&pageSize=100`)).body,
			)
			.items.find((item) => item.name === "Torre Ipê");
		const found = await ids(
			paginated.agent,
			"q=Torre%20Ip%C3%AA&status=all&pageSize=100",
		);
		expect(found).toEqual([named!.id]);
	});
});
