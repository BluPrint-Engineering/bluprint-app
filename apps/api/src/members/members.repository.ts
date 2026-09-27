import { TransactionHost } from "@nestjs-cls/transactional";
import type { DefaultRole } from "@bluprint/shared";
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { member } from "./member.entity";

@Injectable()
export class MembersRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	async insert(values: {
		organizationId: string;
		userId: string;
		role: "admin";
	}): Promise<void> {
		await this.txHost.tx.insert(member).values(values);
	}

	async findByUser(
		userId: string,
	): Promise<{ organizationId: string; role: DefaultRole } | undefined> {
		return this.txHost.tx.query.member.findFirst({
			columns: { organizationId: true, role: true },
			where: eq(member.userId, userId),
		});
	}
}
