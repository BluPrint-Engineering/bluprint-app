import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { asc, eq, sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { location } from "./location.entity";
import { unitChangesQuery } from "./unit-changes";
import { unitType, unitTypeRoom } from "./unit-type.entity";

export interface UnitTypeUsageRow extends Record<string, unknown> {
	unit_type_id: string;
	units: number;
	changed: number;
}

@Injectable()
export class UnitTypesRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	list(projectId: string): Promise<{ id: string; name: string }[]> {
		return this.txHost.tx
			.select({ id: unitType.id, name: unitType.name })
			.from(unitType)
			.where(eq(unitType.projectId, projectId))
			.orderBy(asc(unitType.id));
	}

	listRooms(
		projectId: string,
	): Promise<{ id: string; unitTypeId: string; name: string }[]> {
		return this.txHost.tx
			.select({
				id: unitTypeRoom.id,
				unitTypeId: unitTypeRoom.unitTypeId,
				name: unitTypeRoom.name,
			})
			.from(unitTypeRoom)
			.innerJoin(unitType, eq(unitType.id, unitTypeRoom.unitTypeId))
			.where(eq(unitType.projectId, projectId))
			.orderBy(asc(unitTypeRoom.position), asc(unitTypeRoom.id));
	}

	async countUnitsByType(
		projectId: string,
	): Promise<Map<string, { units: number; changed: number }>> {
		const { rows } = await this.txHost.tx.execute<UnitTypeUsageRow>(sql`
			with changes as (${unitChangesQuery(projectId)})
			select u.unit_type_id, count(*)::int as units, count(changes.unit_id)::int as changed
			from ${location} u
			left join changes on changes.unit_id = u.id
			where u.project_id = ${projectId} and u.unit_type_id is not null
			group by u.unit_type_id
		`);

		return new Map(
			rows.map((row) => [
				row.unit_type_id,
				{ units: row.units, changed: row.changed },
			]),
		);
	}
}
