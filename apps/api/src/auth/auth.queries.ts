import { eq } from "drizzle-orm";
import { Executor } from "../db/database.module";
import { user } from "../db/schema";

// session and account cascade off user, so deleting this row alone undoes a signup
export async function deleteUser(db: Executor, userId: string): Promise<void> {
	await db.delete(user).where(eq(user.id, userId));
}
