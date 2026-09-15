import "reflect-metadata";
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { Pool } from "pg";
import { createAuth } from "../../auth/auth";
import {
	consumeFreeLicense,
	insertLicenses,
} from "../../licenses/licenses.queries";
import { insertOrganization } from "../../organizations/organizations.queries";
import { insertProject } from "../../projects/projects.queries";
import { envSchema } from "../../lib/env";
import { createDatabase, Database } from "../database.module";
import { member, organization, projectMember, session, user } from "../schema";
import { SEED_PASSWORD, organizations, people, platformAdmin } from "./fixture";

// Same cwd assumption as auth.config.ts and test/setup-env.ts.
config({ path: ["../../.env.local", "../../.env"] });

const env = envSchema.parse(process.env);

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
	auth: ReturnType<typeof createAuth>,
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

	const pool = new Pool({ connectionString: env.DATABASE_URL });
	// see database.module.ts's pool "error" listener
	pool.on("error", (error: Error) => {
		console.error(`Idle client error: ${error.message}`);
	});
	const db = createDatabase(pool);
	const auth = createAuth(db, {
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		trustedOrigins: [env.CORS_ORIGIN],
		allowSelfSignup: true,
	});

	try {
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

		await db.transaction(async (tx) => {
			for (const org of organizations) {
				const createdOrganization = await insertOrganization(tx, {
					name: org.name,
				});

				await insertLicenses(tx, createdOrganization.id, org.licenses);

				for (const orgMember of org.members) {
					// not insertMember: its role is narrowed to "admin" for the signup-provisioning caller
					await tx.insert(member).values({
						organizationId: createdOrganization.id,
						userId: userIdByEmail.get(orgMember.email)!,
						role: orgMember.role,
					});
				}

				for (const seedProject of org.projects) {
					const createdProject = await insertProject(tx, {
						organizationId: createdOrganization.id,
						name: seedProject.name,
					});

					const license = await consumeFreeLicense(
						tx,
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
						await tx.insert(projectMember).values({
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

		console.log(
			`Seeded ${people.length} accounts, password "${SEED_PASSWORD}":`,
		);
		for (const person of people) {
			console.log(`  ${person.email}`);
		}
	} finally {
		await pool.end();
	}
}

void main();
