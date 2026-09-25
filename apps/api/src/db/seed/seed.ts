import "reflect-metadata";
import { TransactionHost } from "@nestjs-cls/transactional";
import { NestFactory } from "@nestjs/core";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { createAuth } from "../../auth/auth";
import { LicensesRepository } from "../../licenses/licenses.repository";
import { envSchema } from "../../lib/env";
import { OrganizationsRepository } from "../../organizations/organizations.repository";
import { ProjectsRepository } from "../../projects/projects.repository";
import { DATABASE, Database, DatabaseAdapter } from "../database.module";
import { member, organization, projectMember, session, user } from "../schema";
import { SEED_PASSWORD, organizations, people, platformAdmin } from "./fixture";

// Same cwd assumption as auth.config.ts and test/setup-env.ts.
config({ path: ["../../.env.local", "../../.env"] });

const env = envSchema.parse(process.env);

type Auth = ReturnType<typeof createAuth>;

// only guard between a typo'd DATABASE_URL and TRUNCATE hitting staging or production
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function assertLocalDatabase(databaseUrl: string): void {
	const { hostname } = new URL(databaseUrl);
	if (!LOCAL_HOSTNAMES.has(hostname)) {
		throw new Error(
			`Refusing to seed "${hostname}": db:seed only runs against a local database.`,
		);
	}
}

// TODO(#11): the discard step goes with self-signup; see docs/adr/0012-signup-seeding-as-compensated-saga.md
async function signUpAndDiscardScaffolding(
	db: Database,
	auth: Auth,
	person: { name: string; email: string },
): Promise<string> {
	const result = await auth.api.signUpEmail({
		body: { name: person.name, email: person.email, password: SEED_PASSWORD },
	});
	const userId = result.user.id;

	const scaffold = await db.query.member.findFirst({
		where: eq(member.userId, userId),
	});
	if (scaffold) {
		await db
			.delete(organization)
			.where(eq(organization.id, scaffold.organizationId));
	}

	return userId;
}

async function main(): Promise<void> {
	assertLocalDatabase(env.DATABASE_URL);

	// signUpAndDiscardScaffolding needs self-signup on; dynamic import: ConfigModule.forRoot snapshots process.env when app.module loads
	process.env.ALLOW_SELF_SIGNUP = "true";
	const { AppModule } = await import("../../app.module.js");

	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error", "warn"],
	});
	const db = app.get<Database>(DATABASE);
	const auth = app.get<AuthService<Auth>>(AuthService).instance;
	const txHost = app.get<TransactionHost<DatabaseAdapter>>(TransactionHost);
	const organizationsRepository = app.get(OrganizationsRepository);
	const licensesRepository = app.get(LicensesRepository);
	const projectsRepository = app.get(ProjectsRepository);

	try {
		await app.get(ClsService).run(async () => {
			// organization cascades to member/license/project/project_member; user cascades to session/account
			await db.execute(
				sql`TRUNCATE TABLE "user", "verification", "organization" CASCADE`,
			);

			const userIdByEmail = new Map<string, string>();
			for (const person of people) {
				const userId = await signUpAndDiscardScaffolding(db, auth, person);
				userIdByEmail.set(person.email, userId);
			}

			await db
				.update(user)
				.set({ isPlatformAdmin: true })
				.where(eq(user.id, userIdByEmail.get(platformAdmin.email)!));

			await txHost.withTransaction(async () => {
				for (const org of organizations) {
					const createdOrganization = await organizationsRepository.insert({
						name: org.name,
					});

					await licensesRepository.insertMany(
						createdOrganization.id,
						org.licenses,
					);

					for (const orgMember of org.members) {
						// not MembersRepository.insert: its role is narrowed to "admin" for SignupProvisioning
						await txHost.tx.insert(member).values({
							organizationId: createdOrganization.id,
							userId: userIdByEmail.get(orgMember.email)!,
							role: orgMember.role,
						});
					}

					for (const seedProject of org.projects) {
						const createdProject = await projectsRepository.insert({
							organizationId: createdOrganization.id,
							name: seedProject.name,
						});

						const license = await licensesRepository.consumeFree(
							createdOrganization.id,
							createdProject.id,
						);
						if (!license) {
							// fixture bug: org.licenses above must cover every project listed for it
							throw new Error(
								`No free license left for "${seedProject.name}" in "${org.name}" — add one to fixture.ts.`,
							);
						}

						for (const projectMemberSeed of seedProject.members) {
							await txHost.tx.insert(projectMember).values({
								projectId: createdProject.id,
								userId: userIdByEmail.get(projectMemberSeed.email)!,
								role: projectMemberSeed.role,
							});
						}
					}
				}
			});

			// sign-up leaves a session behind for each account; none should stay logged in
			await db.delete(session);
		});

		console.log(
			`Seeded ${people.length} accounts, password "${SEED_PASSWORD}":`,
		);
		for (const person of people) {
			console.log(`  ${person.email}`);
		}
	} finally {
		await app.close();
	}
}

void main();
