import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { user } from "../db/schema";

@Injectable()
export class UsersRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	// session and account cascade off user, so deleting this row alone undoes a signup
	async delete(userId: string): Promise<void> {
		await this.txHost.tx.delete(user).where(eq(user.id, userId));
	}
}
