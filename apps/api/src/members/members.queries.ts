import { and, eq } from "drizzle-orm";
import { Executor } from "../db/database.module";
import { member } from "../db/schema";

export async function insertMember(
	db: Executor,
	values: { organizationId: string; userId: string; role: "admin" },
): Promise<void> {
	await db.insert(member).values(values);
}

// First match on purpose: nothing yet makes a person admin of two organizations.
export async function findAdminOrganizationId(
	db: Executor,
	userId: string,
): Promise<string | undefined> {
	const found = await db.query.member.findFirst({
		where: and(eq(member.userId, userId), eq(member.role, "admin")),
	});

	return found?.organizationId;
}
