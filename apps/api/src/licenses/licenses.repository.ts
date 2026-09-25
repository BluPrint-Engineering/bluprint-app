import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { license } from "../db/schema";

@Injectable()
export class LicensesRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	async insertMany(organizationId: string, count: number): Promise<void> {
		await this.txHost.tx
			.insert(license)
			.values(Array.from({ length: count }, () => ({ organizationId })));
	}

	async consumeFree(
		organizationId: string,
		projectId: string,
	): Promise<{ id: string } | undefined> {
		const db = this.txHost.tx;

		const freeLicense = db
			.select({ id: license.id })
			.from(license)
			.where(
				and(
					eq(license.organizationId, organizationId),
					isNull(license.projectId),
				),
			)
			.limit(1)
			.for("update", { skipLocked: true });

		const [consumed] = await db
			.update(license)
			.set({ projectId })
			.where(eq(license.id, freeLicense))
			.returning({ id: license.id });

		return consumed;
	}
}
