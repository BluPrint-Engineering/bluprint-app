import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { license } from "../licenses/license.entity";
import { organization } from "../organizations/organization.entity";
import { project } from "../projects/project.entity";
import { location } from "../structure/location.entity";

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

	async lockProject(projectId: string): Promise<number | undefined> {
		const [locked] = await this.txHost.tx
			.select({ reserved: project.reservedUnits })
			.from(project)
			.where(eq(project.id, projectId))
			.for("no key update");

		return locked?.reserved;
	}

	async countUsed(projectIds: string[]): Promise<Map<string, number>> {
		if (projectIds.length === 0) return new Map();

		const rows = await this.txHost.tx
			.select({
				projectId: location.projectId,
				used: sql<number>`count(*)::int`,
			})
			.from(location)
			.where(
				and(inArray(location.projectId, projectIds), eq(location.type, "unit")),
			)
			.groupBy(location.projectId);

		return new Map(rows.map((row) => [row.projectId, row.used]));
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

		const [inProgressUsed] = await db
			.select({ total: sql<number>`count(*)::int` })
			.from(location)
			.innerJoin(project, eq(project.id, location.projectId))
			.where(
				and(
					eq(project.organizationId, organizationId),
					eq(project.status, "active"),
					eq(location.type, "unit"),
				),
			);

		return {
			contracted: contracted!.total,
			reserved: reserved!.total,
			reclaimable: reserved!.inProgress - inProgressUsed!.total,
		};
	}
}
