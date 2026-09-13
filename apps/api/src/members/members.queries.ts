import { Executor } from "../db/database.module";
import { member } from "../db/schema";

export async function insertMember(
	db: Executor,
	values: { organizationId: string; userId: string; role: "admin" },
): Promise<void> {
	await db.insert(member).values(values);
}
