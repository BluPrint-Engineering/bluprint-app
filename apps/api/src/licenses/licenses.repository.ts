import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { DatabaseAdapter } from "../db/database.module";
import { license } from "./license.entity";

@Injectable()
export class LicensesRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	async insert(organizationId: string, units: number): Promise<void> {
		await this.txHost.tx.insert(license).values({ organizationId, units });
	}
}
