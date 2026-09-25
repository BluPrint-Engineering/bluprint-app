import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { DatabaseAdapter } from "../db/database.module";
import { organization } from "./organization.entity";

@Injectable()
export class OrganizationsRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	async insert(values: { name: string }): Promise<{ id: string }> {
		const [created] = await this.txHost.tx
			.insert(organization)
			.values(values)
			.returning({ id: organization.id });

		return created!;
	}
}
