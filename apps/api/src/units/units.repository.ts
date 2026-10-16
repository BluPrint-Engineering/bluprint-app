import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { license } from "../licenses/license.entity";
import { organization } from "../organizations/organization.entity";
import { project } from "../projects/project.entity";

@Injectable()
export class UnitsRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	async lockOrganization(organizationId: string): Promise<void> {
		await this.txHost.tx
			.select({ id: organization.id })
			.from(organization)
			.where(eq(organization.id, organizationId))
			.for("no key update");
	}

	async sum(organizationId: string): Promise<{
		contracted: number;
		reserved: number;
		reclaimable: number;
	}> {
		const db = this.txHost.tx;

		const [contracted] = await db
			.select({ total: sql<number>`coalesce(sum(${license.units}), 0)::int` })
			.from(license)
			.where(eq(license.organizationId, organizationId));

		const [reserved] = await db
			.select({
				total: sql<number>`coalesce(sum(${project.reservedUnits}), 0)::int`,
				inProgress: sql<number>`coalesce(sum(${project.reservedUnits}) filter (where ${project.status} = 'active'), 0)::int`,
			})
			.from(project)
			.where(eq(project.organizationId, organizationId));

		return {
			contracted: contracted!.total,
			reserved: reserved!.total,
			reclaimable: reserved!.inProgress,
		};
	}
}
