import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import type { NewUnitType } from "@bluprint/shared";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { location } from "./location.entity";
import { room } from "./room.entity";
import { unitChangesQuery } from "./unit-changes";
import { unitType, unitTypeRoom } from "./unit-type.entity";

const INSERT_CHUNK = 1000;

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

	async findIdsInOtherProjects(
		projectId: string,
		ids: string[],
	): Promise<Set<string>> {
		if (ids.length === 0) return new Set();
		const rows = await this.txHost.tx
			.select({ id: unitType.id })
			.from(unitType)
			.where(and(inArray(unitType.id, ids), ne(unitType.projectId, projectId)));

		return new Set(rows.map((row) => row.id));
	}

	async findRoomIds(ids: string[]): Promise<Set<string>> {
		if (ids.length === 0) return new Set();
		const rows = await this.txHost.tx
			.select({ id: unitTypeRoom.id })
			.from(unitTypeRoom)
			.where(inArray(unitTypeRoom.id, ids));

		return new Set(rows.map((row) => row.id));
	}

	async insertAll(projectId: string, unitTypes: NewUnitType[]): Promise<void> {
		if (unitTypes.length === 0) return;
		await this.txHost.tx
			.insert(unitType)
			.values(unitTypes.map(({ id, name }) => ({ id, projectId, name })));

		const rooms = unitTypes.flatMap(({ id, rooms }) =>
			rooms.map((entry, position) => ({
				id: entry.id,
				unitTypeId: id,
				name: entry.name,
				position,
			})),
		);
		for (let start = 0; start < rooms.length; start += INSERT_CHUNK) {
			await this.txHost.tx
				.insert(unitTypeRoom)
				.values(rooms.slice(start, start + INSERT_CHUNK));
		}
	}

	async giveUnitsTheirRooms(
		units: { id: string; unitTypeId: string }[],
	): Promise<void> {
		if (units.length === 0) return;
		const typeRooms = await this.txHost.tx
			.select({
				id: unitTypeRoom.id,
				unitTypeId: unitTypeRoom.unitTypeId,
				name: unitTypeRoom.name,
				position: unitTypeRoom.position,
			})
			.from(unitTypeRoom)
			.where(
				inArray(unitTypeRoom.unitTypeId, [
					...new Set(units.map(({ unitTypeId }) => unitTypeId)),
				]),
			);

		const rows = units.flatMap(({ id, unitTypeId }) =>
			typeRooms
				.filter((typeRoom) => typeRoom.unitTypeId === unitTypeId)
				.map((typeRoom) => ({
					locationId: id,
					name: typeRoom.name,
					position: typeRoom.position,
					unitTypeRoomId: typeRoom.id,
				})),
		);
		for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
			await this.txHost.tx
				.insert(room)
				.values(rows.slice(start, start + INSERT_CHUNK));
		}
	}
}
