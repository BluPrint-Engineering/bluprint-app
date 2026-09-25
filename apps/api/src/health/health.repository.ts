import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";

@Injectable()
export class HealthRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	async ping(): Promise<void> {
		await this.txHost.tx.execute(sql`select 1`);
	}
}
