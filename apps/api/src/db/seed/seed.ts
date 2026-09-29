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
import { organizations, people, platformAdmin } from "./fixture";
import { describeAccountRoles } from "./seed-summary";
import { resolveSeedTarget } from "./seed-target";

// relative to apps/api, the cwd every api script runs from
config({ path: ["../../.env.local", "../../.env"] });

const env = envSchema.parse(process.env);

type Auth = ReturnType<typeof createAuth>;

// TODO(#11): the discard step goes with self-signup (ADR 0012)
async function signUpAndDiscardScaffolding(
	db: Database,
	auth: Auth,
	person: { name: string; email: string },
	password: string,
): Promise<string> {
	const result = await auth.api.signUpEmail({
		body: { name: person.name, email: person.email, password },
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
	const target = resolveSeedTarget(env.DATABASE_URL, process.env, people);

	// signUpAndDiscardScaffolding needs self-signup on; dynamic import: ConfigModule.forRoot snapshots process.env when app.module loads
	process.env.ALLOW_SELF_SIGNUP = "true";
	process.env.PASSWORD_BREACH_CHECK = "false";
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
				const userId = await signUpAndDiscardScaffolding(
					db,
					auth,
					person,
					target.password,
				);
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
							status: seedProject.status,
						});

						const license = await licensesRepository.consumeFree(
							createdOrganization.id,
							createdProject.id,
						);
						if (!license) {
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

		if (target.kind === "local") {
			console.log(
				`Seeded ${people.length} accounts, password "${target.password}":`,
			);
			for (const person of people) {
				console.log(`  ${person.email}`);
			}
		} else {
			console.log(
				`Seeded ${people.length} accounts on ${target.host}, all with SEED_PASSWORD:`,
			);
			for (const { email, roles } of describeAccountRoles(
				people,
				organizations,
				platformAdmin,
			)) {
				console.log(`  ${email}  ${roles}`);
			}
		}
	} finally {
		await app.close();
	}
}

void main();
