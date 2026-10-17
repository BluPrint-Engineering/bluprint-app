import type { ProjectStatus } from "@bluprint/shared";
import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
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

	async lockProject(
		projectId: string,
	): Promise<
		| { reserved: number; status: ProjectStatus; organizationId: string }
		| undefined
	> {
		const [locked] = await this.txHost.tx
			.select({
				reserved: project.reservedUnits,
				status: project.status,
				organizationId: project.organizationId,
			})
			.from(project)
			.where(eq(project.id, projectId))
			.for("no key update");

		return locked;
	}

	async lockProjectsOf(
		organizationId: string,
		projectIds: string[],
	): Promise<{ id: string; reserved: number; status: ProjectStatus }[]> {
		return this.txHost.tx
			.select({
				id: project.id,
				reserved: project.reservedUnits,
				status: project.status,
			})
			.from(project)
			.where(
				and(
					eq(project.organizationId, organizationId),
					inArray(project.id, projectIds),
				),
			)
			.orderBy(asc(project.id))
			.for("no key update");
	}

	async setReserved(projectId: string, reservedUnits: number): Promise<void> {
		await this.txHost.tx
			.update(project)
			.set({ reservedUnits })
			.where(eq(project.id, projectId));
	}

	async listInProgress(
		organizationId: string,
	): Promise<{ projectId: string; name: string; reserved: number }[]> {
		return this.txHost.tx
			.select({
				projectId: project.id,
				name: project.name,
				reserved: project.reservedUnits,
			})
			.from(project)
			.where(
				and(
					eq(project.organizationId, organizationId),
					eq(project.status, "active"),
				),
			)
			.orderBy(
				asc(sql`${project.name} collate "pt-BR-x-icu"`),
				asc(project.id),
			);
	}

	async sumDelivered(
		organizationId: string,
	): Promise<{ projects: number; units: number }> {
		const [delivered] = await this.txHost.tx
			.select({
				projects: sql<number>`count(*)::int`,
				units: sql<number>`coalesce(sum(${project.reservedUnits}), 0)::int`,
			})
			.from(project)
			.where(
				and(
					eq(project.organizationId, organizationId),
					eq(project.status, "delivered"),
				),
			);

		return delivered!;
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
