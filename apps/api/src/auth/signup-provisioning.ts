import { Database } from "../db/database.module";
import { insertLicenses } from "../licenses/licenses.queries";
import { insertMember } from "../members/members.queries";
import { insertOrganization } from "../organizations/organizations.queries";
import { deleteUser } from "./auth.queries";

const FREE_LICENSES = 3;

export async function provisionTenant(
	db: Database,
	userId: string,
	name: string,
): Promise<void> {
	await db.transaction(async (tx) => {
		const organization = await insertOrganization(tx, { name });

		await insertMember(tx, {
			organizationId: organization.id,
			userId,
			role: "admin",
		});
		await insertLicenses(tx, organization.id, FREE_LICENSES);
	});
}

// Once the `user` row is committed, this is the only way left to keep a
// failed signup from leaving someone without an organization.
export async function discardUser(db: Database, userId: string): Promise<void> {
	await deleteUser(db, userId);
}
