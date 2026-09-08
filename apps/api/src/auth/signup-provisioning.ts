import { eq } from "drizzle-orm";
import { Database } from "../db/database.module";
import { license, member, organization, user } from "../db/schema";

const FREE_LICENSES = 3;

export async function provisionTenant(
	db: Database,
	userId: string,
	name: string,
): Promise<void> {
	await db.transaction(async (tx) => {
		const [created] = await tx
			.insert(organization)
			.values({ name })
			.returning({ id: organization.id });
		const organizationId = created!.id;

		await tx.insert(member).values({ organizationId, userId, role: "admin" });
		await tx
			.insert(license)
			.values(
				Array.from({ length: FREE_LICENSES }, () => ({ organizationId })),
			);
	});
}

// Writes to `user`, which Better Auth owns: once its row is committed this is
// the only way left to keep a failed signup from leaving someone without an
// organization. `session` and `account` cascade off it.
export async function discardUser(db: Database, userId: string): Promise<void> {
	await db.delete(user).where(eq(user.id, userId));
}
