import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { member } from "../members/member.entity";
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

	async findByMember(userId: string) {
		const [found] = await this.txHost.tx
			.select({
				id: organization.id,
				name: organization.name,
				role: member.role,
			})
			.from(member)
			.innerJoin(organization, eq(organization.id, member.organizationId))
			.where(eq(member.userId, userId));

		return found;
	}
}
