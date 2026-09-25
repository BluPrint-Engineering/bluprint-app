import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
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

	async findAdminOrganizationId(userId: string): Promise<string | undefined> {
		const found = await this.txHost.tx.query.member.findFirst({
			where: and(eq(member.userId, userId), eq(member.role, "admin")),
		});

		return found?.organizationId;
	}
}
