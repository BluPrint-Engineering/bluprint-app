import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import {
	PROJECT_NOT_FOUND,
	problemDetailsSchema,
	roomNamesSchema,
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
import { location } from "./location.entity";
import { room } from "./room.entity";
import { typology, typologyRoom } from "./typology.entity";

const SIGN_UP = "/api/auth/sign-up/email";
const PASSWORD = "senha-de-obra-123";

type Person = { userId: string; agent: ReturnType<typeof request.agent> };

let app: INestApplication;
let server: Server;
let db: Database;
let manager: Person;
let unlinked: Person;
let outsider: Person;
let projectId: string;
let emptyProjectId: string;
let outsiderProjectId: string;

const roomNamesPath = (id: string) => `/api/projects/${id}/room-names`;

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

beforeAll(async () => {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	server = app.getHttpServer() as Server;
	db = app.get<Database>(DATABASE);

	const admin = await signUp("Admin da Construtora");
	manager = await signUp("Gerente Vinculada");
	unlinked = await signUp("Gerente Sem Vínculo");
	outsider = await signUp("Pessoa de Outra Construtora");

	const organizationId = await organizationOf(admin.userId);
	for (const person of [manager, unlinked]) {
		await db
			.delete(organization)
			.where(eq(organization.id, await organizationOf(person.userId)));
		await db
			.insert(member)
			.values({ organizationId, userId: person.userId, role: "manager" });
	}

	const projects = await db
		.insert(project)
		.values([
			{ organizationId, name: "Casa Moinhos" },
			{ organizationId, name: "Galpão Sul" },
		])
		.returning({ id: project.id });
	projectId = projects[0]!.id;
	emptyProjectId = projects[1]!.id;
	await db.insert(projectMember).values([
		{ projectId, userId: manager.userId, role: "manager" },
		{ projectId: emptyProjectId, userId: manager.userId, role: "manager" },
	]);

	const [outsiderProject] = await db
		.insert(project)
		.values({
			organizationId: await organizationOf(outsider.userId),
			name: "Casa Moinhos",
		})
		.returning({ id: project.id });
	outsiderProjectId = outsiderProject!.id;

	const typologies = await db
		.insert(typology)
		.values([
			{ projectId, name: "Tipologia A", locationType: "unit" },
			{ projectId, name: "Tipologia B", locationType: "unit" },
			{ projectId, name: "Lazer", locationType: "common_area" },
		])
		.returning({ id: typology.id });
	await db.insert(typologyRoom).values([
		{ typologyId: typologies[0]!.id, name: "Suite", position: 0 },
		{ typologyId: typologies[0]!.id, name: "Sala", position: 1 },
		{ typologyId: typologies[1]!.id, name: "Suíte", position: 0 },
		{ typologyId: typologies[1]!.id, name: "Salão", position: 1 },
		{ typologyId: typologies[2]!.id, name: "Sala", position: 0 },
		{ typologyId: typologies[2]!.id, name: "SUÍTE", position: 1 },
		{ typologyId: typologies[2]!.id, name: "salão", position: 2 },
	]);

	const garage = await db
		.insert(location)
		.values({ projectId, type: "common_area", name: "Garagem", position: 0 })
		.returning({ id: location.id });
	await db.insert(room).values([
		{ locationId: garage[0]!.id, name: "Box 1", position: 0 },
		{ locationId: garage[0]!.id, name: "Sala", position: 1 },
		{ locationId: garage[0]!.id, name: "Suíte", position: 2 },
	]);

	await db.insert(typologyRoom).values({
		typologyId: (
			await db
				.insert(typology)
				.values({
					projectId: outsiderProjectId,
					name: "Outra",
					locationType: "unit",
				})
				.returning({ id: typology.id })
		)[0]!.id,
		name: "Sauna",
		position: 0,
	});
});

afterAll(async () => {
	await db.delete(project).where(eq(project.id, outsiderProjectId));
	await db.delete(project).where(eq(project.id, projectId));
	await db.delete(project).where(eq(project.id, emptyProjectId));
	await db.delete(user).where(eq(user.id, unlinked.userId));
	await app.close();
});

describe("GET /projects/:id/room-names", () => {
	it("joins typology and location rooms once per name, most used first", async () => {
		const res = await manager.agent.get(roomNamesPath(projectId)).expect(200);
		const body = roomNamesSchema.parse(res.body);

		expect(body.names).toEqual(["Suíte", "Sala", "Salão", "Box 1"]);
	});

	it("answers an empty list for a project without rooms", async () => {
		const res = await manager.agent
			.get(roomNamesPath(emptyProjectId))
			.expect(200);

		expect(roomNamesSchema.parse(res.body)).toEqual({ names: [] });
	});

	it.each([
		["a person without membership", () => unlinked],
		["another organization", () => outsider],
	])("answers 404 for %s", async (_label, who) => {
		const res = await who().agent.get(roomNamesPath(projectId)).expect(404);

		expect(problemDetailsSchema.parse(res.body).code).toBe(PROJECT_NOT_FOUND);
	});

	it("answers 401 without a session", async () => {
		await request(server).get(roomNamesPath(projectId)).expect(401);
	});
});
