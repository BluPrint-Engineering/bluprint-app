import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import { configureApp, nestApplicationOptions } from "../app";
import { AppModule } from "../app.module";
import { DATABASE, Database } from "./database.module";
import { license, member, organization, user } from "./schema";

const UUID_V7 =
	/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let app: INestApplication;
let db: Database;

/** Better Auth's `user.id` has no database default, so it carries a value no
 * uuid column would accept — which is what proves the foreign key stayed text. */
const userId = `test-user-${randomUUID()}`;
let organizationId: string;

beforeAll(async () => {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication(nestApplicationOptions);
	configureApp(app);
	await app.init();

	db = app.get<Database>(DATABASE);
	await db.insert(user).values({
		id: userId,
		name: "Engenheira de Obra",
		email: `${randomUUID()}@example.com`,
	});
});

afterAll(async () => {
	await db.delete(user).where(eq(user.id, userId));
	await db.delete(organization).where(eq(organization.id, organizationId));
	await app.close();
});

describe("organization", () => {
	test("writes and reads back the same row", async () => {
		const [created] = await db
			.insert(organization)
			.values({ name: "Casa Moinhos" })
			.returning({ id: organization.id });
		organizationId = created!.id;

		const found = await db.query.organization.findFirst({
			where: eq(organization.id, organizationId),
		});

		expect(found?.name).toBe("Casa Moinhos");
		expect(found?.createdAt).toBeInstanceOf(Date);
	});

	test("takes its id from the database, as a time-ordered uuid v7", async () => {
		const [first] = await db
			.insert(organization)
			.values({ name: "Primeira" })
			.returning({ id: organization.id });
		const [second] = await db
			.insert(organization)
			.values({ name: "Segunda" })
			.returning({ id: organization.id });

		expect(first!.id).toMatch(UUID_V7);
		expect(second!.id > first!.id).toBe(true);

		await db.delete(organization).where(eq(organization.id, first!.id));
		await db.delete(organization).where(eq(organization.id, second!.id));
	});
});

describe("member", () => {
	test("writes and reads back the default role and Better Auth's user id", async () => {
		await db.insert(member).values({ organizationId, userId, role: "admin" });

		const found = await db.query.member.findFirst({
			where: eq(member.userId, userId),
		});

		expect(found?.role).toBe("admin");
		expect(found?.userId).toBe(userId);
		expect(found?.organizationId).toBe(organizationId);
	});
});

describe("license", () => {
	test("writes and reads back a license belonging to the organization", async () => {
		const [created] = await db
			.insert(license)
			.values({ organizationId })
			.returning({ id: license.id });

		const found = await db.query.license.findFirst({
			where: eq(license.id, created!.id),
		});

		expect(found?.organizationId).toBe(organizationId);
		expect(found?.id).toMatch(UUID_V7);
	});
});
