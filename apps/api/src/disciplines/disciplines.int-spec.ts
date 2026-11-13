import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq, sql } from "drizzle-orm";
import request from "supertest";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "../db/database.module";
import {
	discipline,
	location,
	locationDiscipline,
	member,
	organization,
	project,
	projectMember,
} from "../db/schema";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";

type Person = { userId: string; agent: ReturnType<typeof request.agent> };

let app: INestApplication;
let server: Server;
let db: Database;

let admin: Person;
let manager: Person;
let assistant: Person;
let unlinked: Person;
let outsider: Person;
let organizationId: string;

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

async function joinOrganization(person: Person, role: "manager" | "assistant") {
	await db
		.delete(organization)
		.where(eq(organization.id, await organizationOf(person.userId)));
	await db
		.insert(member)
		.values({ organizationId, userId: person.userId, role });
}

async function createProject(person: Person): Promise<string> {
	const id = randomUUID();
	const res = await person.agent
		.post("/api/projects")
		.send({ id, name: "Casa Moinhos", units: 1 });
	expect(res.status).toBe(201);
	return id;
}

const listPath = (projectId: string) =>
	`/api/projects/${projectId}/disciplines`;

const EXPECTED_COLORS = [
	"#0D9488",
	"#7C3AED",
	"#DB2777",
	"#15803D",
	"#DC2626",
	"#0891B2",
	"#4338CA",
	"#4D7C0F",
	"#A21CAF",
	"#92400E",
];

interface Listed {
	id: string;
	name: string;
	color: string | null;
	type: string;
	hasOwnPlan: boolean;
	appliesEverywhere: boolean;
}

async function listOf(person: Person, projectId: string): Promise<Listed[]> {
	const res = await person.agent.get(listPath(projectId));
	expect(res.status).toBe(200);
	return (res.body as { items: Listed[] }).items;
}

const extrasOf = async (person: Person, projectId: string) =>
	(await listOf(person, projectId)).filter(({ type }) => type === "extra");

const create = (
	person: Person,
	projectId: string,
	body: { id?: string; name: string; appliesEverywhere?: boolean },
) =>
	person.agent.post(listPath(projectId)).send({
		id: randomUUID(),
		appliesEverywhere: true,
		...body,
	});

async function linkTeam(projectId: string) {
	await db.insert(projectMember).values([
		{ projectId, userId: manager.userId, role: "manager" },
		{ projectId, userId: assistant.userId, role: "assistant" },
	]);
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
	assistant = await signUp("Assistente Vinculado");
	unlinked = await signUp("Gerente Sem Vínculo");
	outsider = await signUp("Pessoa de Outra Construtora");

	organizationId = await organizationOf(admin.userId);
	await joinOrganization(manager, "manager");
	await joinOrganization(assistant, "assistant");
	await joinOrganization(unlinked, "manager");
});

afterAll(async () => {
	await app.close();
});

describe("GET /api/projects/:id/disciplines", () => {
	test("a new project lists General without a color, then Hidráulica and Elétrica", async () => {
		const projectId = await createProject(admin);

		const res = await admin.agent.get(listPath(projectId));

		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			items: [
				{
					id: expect.any(String) as string,
					name: "Geral",
					color: null,
					type: "general",
					hasOwnPlan: true,
					appliesEverywhere: true,
				},
				{
					id: expect.any(String) as string,
					name: "Hidráulica",
					color: "#2563EB",
					type: "base",
					hasOwnPlan: true,
					appliesEverywhere: true,
				},
				{
					id: expect.any(String) as string,
					name: "Elétrica",
					color: "#D97706",
					type: "base",
					hasOwnPlan: true,
					appliesEverywhere: true,
				},
			],
		});
	});
});

describe("POST /api/projects/:id/disciplines", () => {
	test("creates an extra discipline for the whole project with the first color, and the second takes the next", async () => {
		const projectId = await createProject(admin);

		const first = await create(admin, projectId, { name: "Pintura" });
		const second = await create(admin, projectId, { name: "Gesso" });

		expect(first.status).toBe(201);
		expect(first.body).toEqual({
			id: expect.any(String) as string,
			name: "Pintura",
			color: "#0D9488",
			type: "extra",
			hasOwnPlan: false,
			appliesEverywhere: true,
		});
		expect(second.status).toBe(201);
		expect((second.body as Listed).color).toBe("#7C3AED");
	});

	test("keeps the name as typed, trimmed, and the choice of where it applies", async () => {
		const projectId = await createProject(admin);

		const res = await create(admin, projectId, {
			name: "  Esquadrias  ",
			appliesEverywhere: false,
		});

		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({
			name: "Esquadrias",
			appliesEverywhere: false,
		});
		expect((await extrasOf(admin, projectId)).map(({ name }) => name)).toEqual([
			"Esquadrias",
		]);
	});

	test("lists the extras after the three defaults in the order they were created", async () => {
		const projectId = await createProject(admin);
		await create(admin, projectId, { name: "Pintura" });
		await create(admin, projectId, { name: "Gesso" });

		expect((await listOf(admin, projectId)).map(({ name }) => name)).toEqual([
			"Geral",
			"Hidráulica",
			"Elétrica",
			"Pintura",
			"Gesso",
		]);
	});

	test("sending the same id again answers the original discipline, ignoring another name and choice", async () => {
		const projectId = await createProject(admin);
		const id = randomUUID();
		await create(admin, projectId, { id, name: "Pintura" });

		const again = await create(admin, projectId, {
			id,
			name: "Gesso",
			appliesEverywhere: false,
		});

		expect(again.status).toBe(201);
		expect(again.body).toEqual({
			id,
			name: "Pintura",
			color: "#0D9488",
			type: "extra",
			hasOwnPlan: false,
			appliesEverywhere: true,
		});
		expect(await extrasOf(admin, projectId)).toHaveLength(1);
	});

	test.each(["pintura  ", "Píntura", "PINTURA", "Pintura"])(
		"refuses %j as the name Pintura already taken and answers the spelling that exists",
		async (name) => {
			const projectId = await createProject(admin);
			await create(admin, projectId, { name: "Pintura" });

			const res = await create(admin, projectId, { name });

			expect(res.status).toBe(409);
			expect(res.body).toMatchObject({
				code: "DISCIPLINE_NAME_TAKEN",
				name: "Pintura",
			});
			expect(await extrasOf(admin, projectId)).toHaveLength(1);
		},
	);

	test.each(["Geral", "geral", "  GERAL "])(
		"refuses %j because General already has the name",
		async (name) => {
			const projectId = await createProject(admin);

			const res = await create(admin, projectId, { name });

			expect(res.status).toBe(409);
			expect(res.body).toMatchObject({
				code: "DISCIPLINE_NAME_TAKEN",
				name: "Geral",
			});
		},
	);

	test("refuses the name of a base discipline spelled without its accent", async () => {
		const projectId = await createProject(admin);

		const res = await create(admin, projectId, { name: "eletrica" });

		expect(res.body).toMatchObject({
			code: "DISCIPLINE_NAME_TAKEN",
			name: "Elétrica",
		});
	});

	test("gives the ten extras the ten colors in order and refuses the eleventh", async () => {
		const projectId = await createProject(admin);

		for (let number = 1; number <= 10; number += 1) {
			const res = await create(admin, projectId, { name: `Extra ${number}` });
			expect(res.status).toBe(201);
		}
		const refused = await create(admin, projectId, { name: "Extra 11" });

		expect(
			(await extrasOf(admin, projectId)).map(({ color }) => color),
		).toEqual(EXPECTED_COLORS);
		expect(refused.status).toBe(409);
		expect(refused.body).toMatchObject({ code: "DISCIPLINE_LIMIT_REACHED" });
		expect(await extrasOf(admin, projectId)).toHaveLength(10);
	});

	test("still answers a discipline already created when the project has ten extras", async () => {
		const projectId = await createProject(admin);
		const id = randomUUID();
		await create(admin, projectId, { id, name: "Extra 1" });
		for (let number = 2; number <= 10; number += 1) {
			await create(admin, projectId, { name: `Extra ${number}` });
		}

		const again = await create(admin, projectId, { id, name: "Extra 1" });

		expect(again.status).toBe(201);
		expect(again.body).toMatchObject({ id, name: "Extra 1" });
	});

	test("refuses the id of a discipline of another project without revealing it", async () => {
		const mine = await createProject(admin);
		const other = await createProject(admin);
		const id = randomUUID();
		await create(admin, other, { id, name: "Pintura" });

		const res = await create(admin, mine, {
			id,
			name: "Gesso",
			appliesEverywhere: false,
		});

		expect(res.status).toBe(409);
		expect(res.body).toMatchObject({ code: "DISCIPLINE_ID_TAKEN" });
		expect(JSON.stringify(res.body)).not.toContain("Pintura");
		expect(JSON.stringify(res.body)).not.toContain("#0D9488");
		expect(await extrasOf(admin, mine)).toEqual([]);
	});

	test("refuses a missing, blank or too long name and a malformed body", async () => {
		const projectId = await createProject(admin);

		for (const body of [
			{ id: randomUUID(), name: "   ", appliesEverywhere: true },
			{ id: randomUUID(), name: "x".repeat(61), appliesEverywhere: true },
			{ id: randomUUID(), appliesEverywhere: true },
			{ id: randomUUID(), name: "Pintura" },
			{ id: "not-a-uuid", name: "Pintura", appliesEverywhere: true },
		]) {
			const res = await admin.agent.post(listPath(projectId)).send(body);
			expect(res.status).toBe(400);
			expect(res.body).toMatchObject({ code: "VALIDATION_FAILED" });
		}
		expect(await extrasOf(admin, projectId)).toEqual([]);
	});

	test("accepts a name of exactly 60 characters", async () => {
		const projectId = await createProject(admin);

		const res = await create(admin, projectId, { name: "x".repeat(60) });

		expect(res.status).toBe(201);
	});

	test("lets the admin, a manager and an assistant of the project create", async () => {
		const projectId = await createProject(admin);
		await linkTeam(projectId);

		for (const [person, name] of [
			[admin, "Do admin"],
			[manager, "Do gerente"],
			[assistant, "Do assistente"],
		] as const) {
			const res = await create(person, projectId, { name });
			expect(res.status).toBe(201);
		}
		expect(
			(await extrasOf(manager, projectId)).map(({ name }) => name),
		).toEqual(["Do admin", "Do gerente", "Do assistente"]);
	});

	test("answers 404 to someone without a link to the project, on both routes", async () => {
		const projectId = await createProject(admin);
		await linkTeam(projectId);

		for (const person of [unlinked, outsider]) {
			const read = await person.agent.get(listPath(projectId));
			const write = await create(person, projectId, { name: "Pintura" });

			expect(read.status).toBe(404);
			expect(read.body).toMatchObject({ code: "PROJECT_NOT_FOUND" });
			expect(write.status).toBe(404);
			expect(write.body).toMatchObject({ code: "PROJECT_NOT_FOUND" });
		}
		expect(await extrasOf(admin, projectId)).toEqual([]);
	});

	test("refuses to create in a delivered project and still lists its disciplines", async () => {
		const projectId = await createProject(admin);
		await db
			.update(project)
			.set({ status: "delivered", deliveredAt: new Date() })
			.where(eq(project.id, projectId));

		const res = await create(admin, projectId, { name: "Pintura" });

		expect(res.status).toBe(409);
		expect(res.body).toMatchObject({ code: "PROJECT_DELIVERED" });
		expect(await listOf(admin, projectId)).toHaveLength(3);
	});

	test("moves the project's last activity", async () => {
		const projectId = await createProject(admin);
		const before = await db.query.project.findFirst({
			where: eq(project.id, projectId),
		});

		await create(admin, projectId, { name: "Pintura" });

		const after = await db.query.project.findFirst({
			where: eq(project.id, projectId),
		});
		expect(after!.lastActivityAt.getTime()).toBeGreaterThan(
			before!.lastActivityAt.getTime(),
		);
	});

	test("two creations at once with different names both pass with different colors", async () => {
		const projectId = await createProject(admin);

		const results = await Promise.all([
			create(admin, projectId, { name: "Pintura" }),
			create(admin, projectId, { name: "Gesso" }),
		]);

		expect(results.map(({ status }) => status)).toEqual([201, 201]);
		const extras = await extrasOf(admin, projectId);
		expect(extras.map(({ color }) => color).sort()).toEqual(
			["#0D9488", "#7C3AED"].sort(),
		);
	});

	test("two creations at once with the same name and different ids let exactly one pass", async () => {
		const projectId = await createProject(admin);

		const results = await Promise.all([
			create(admin, projectId, { name: "Pintura" }),
			create(admin, projectId, { name: "pintura" }),
		]);

		expect(results.map(({ status }) => status).sort()).toEqual([201, 409]);
		expect(await extrasOf(admin, projectId)).toHaveLength(1);
	});

	test("many creations at once never repeat a color or pass the ceiling", async () => {
		const projectId = await createProject(admin);

		const results = await Promise.all(
			Array.from({ length: 12 }, (_, number) =>
				create(admin, projectId, { name: `Extra ${number}` }),
			),
		);

		expect(results.filter(({ status }) => status === 201)).toHaveLength(10);
		expect(
			(await extrasOf(admin, projectId)).map(({ color }) => color).sort(),
		).toEqual([...EXPECTED_COLORS].sort());
	});
});

describe("the discipline tables", () => {
	test("the database refuses a second discipline with the same color, one with the same name without accents, and a second General", async () => {
		const projectId = await createProject(admin);
		await create(admin, projectId, { name: "Suíte" });
		const row = {
			projectId,
			hasOwnPlan: false,
			appliesEverywhere: true,
		};

		await expect(
			db.insert(discipline).values({
				...row,
				name: "Outra",
				color: "#0D9488",
				type: "extra",
			}),
		).rejects.toThrow();
		await expect(
			db.insert(discipline).values({
				...row,
				name: "suite",
				color: "#DB2777",
				type: "extra",
			}),
		).rejects.toThrow();
		await expect(
			db.insert(discipline).values({
				...row,
				name: "Outra Geral",
				color: null,
				type: "general",
			}),
		).rejects.toThrow();
		await expect(
			db.insert(discipline).values({
				...row,
				name: "Sem cor",
				color: null,
				type: "extra",
			}),
		).rejects.toThrow();
		expect(await extrasOf(admin, projectId)).toHaveLength(1);
	});

	test("the database refuses a location discipline that joins a discipline of one project to a location of another", async () => {
		const mine = await createProject(admin);
		const other = await createProject(admin);
		const [place] = await db
			.insert(location)
			.values({
				projectId: other,
				type: "common_area",
				name: "Guarita",
				position: 0,
			})
			.returning({ id: location.id });
		const [general] = await db
			.select({ id: discipline.id })
			.from(discipline)
			.where(
				sql`${discipline.projectId} = ${mine} and ${discipline.type} = 'general'`,
			);

		await expect(
			db.insert(locationDiscipline).values({
				locationId: place!.id,
				disciplineId: general!.id,
				projectId: mine,
				applies: true,
			}),
		).rejects.toThrow();
		await expect(
			db.insert(locationDiscipline).values({
				locationId: place!.id,
				disciplineId: general!.id,
				projectId: other,
				applies: true,
			}),
		).rejects.toThrow();
	});

	test("deleting a project takes its disciplines with it", async () => {
		const projectId = await createProject(admin);
		await create(admin, projectId, { name: "Pintura" });

		await db.delete(project).where(eq(project.id, projectId));

		expect(
			await db
				.select({ id: discipline.id })
				.from(discipline)
				.where(eq(discipline.projectId, projectId)),
		).toEqual([]);
	});
});
