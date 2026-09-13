import { sql } from "drizzle-orm";
import { Executor } from "../db/database.module";

export async function pingDatabase(db: Executor): Promise<void> {
	await db.execute(sql`select 1`);
}
