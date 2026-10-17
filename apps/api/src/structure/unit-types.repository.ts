import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { comparableLocationName, type NewUnitType } from "@bluprint/shared";
import { and, asc, count, eq, inArray, ne, sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { location } from "./location.entity";
import { room } from "./room.entity";
import { unitChangesQuery } from "./unit-changes";
import { unitType, unitTypeRoom } from "./unit-type.entity";

const INSERT_CHUNK = 1000;

const comparable = (name: unknown) =>
	sql`lower(regexp_replace(btrim(${name}), '\\s+', ' ', 'g'))`;

const uuidList = (ids: string[]) =>
	sql`array[${sql.join(
		ids.map((id) => sql`${id}::uuid`),
		sql`, `,
	)}]::uuid[]`;

export interface TypeRoomValue {
	id: string;
	name: string;
	position: number;
}

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
	async find(
		projectId: string,
		unitTypeId: string,
	): Promise<{ id: string; name: string } | undefined> {
		const [found] = await this.txHost.tx
			.select({ id: unitType.id, name: unitType.name })
			.from(unitType)
			.where(
				and(eq(unitType.id, unitTypeId), eq(unitType.projectId, projectId)),
			);

		return found;
	}

	async nameInUse(
		projectId: string,
		name: string,
		exceptUnitTypeId?: string,
	): Promise<boolean> {
		const [found] = await this.txHost.tx
			.select({ id: unitType.id })
			.from(unitType)
			.where(
				and(
					eq(unitType.projectId, projectId),
					sql`${comparable(unitType.name)} = ${comparableLocationName(name)}`,
					exceptUnitTypeId ? ne(unitType.id, exceptUnitTypeId) : undefined,
				),
			);

		return found !== undefined;
	}

	async rename(unitTypeId: string, name: string): Promise<void> {
		await this.txHost.tx
			.update(unitType)
			.set({ name })
			.where(eq(unitType.id, unitTypeId));
	}

	async countUnits(unitTypeId: string): Promise<number> {
		const [found] = await this.txHost.tx
			.select({ units: count() })
			.from(location)
			.where(eq(location.unitTypeId, unitTypeId));

		return found?.units ?? 0;
	}

	async delete(unitTypeId: string): Promise<void> {
		await this.txHost.tx.delete(unitType).where(eq(unitType.id, unitTypeId));
	}

	async roomsOf(unitTypeId: string): Promise<{ id: string; name: string }[]> {
		return this.txHost.tx
			.select({ id: unitTypeRoom.id, name: unitTypeRoom.name })
			.from(unitTypeRoom)
			.where(eq(unitTypeRoom.unitTypeId, unitTypeId))
			.orderBy(asc(unitTypeRoom.position), asc(unitTypeRoom.id));
	}

	async unitIdsOf(unitTypeId: string): Promise<string[]> {
		const rows = await this.txHost.tx
			.select({ id: location.id })
			.from(location)
			.where(eq(location.unitTypeId, unitTypeId));

		return rows.map(({ id }) => id);
	}

	async releaseRoomsOfRemoved(removedIds: string[]): Promise<string[]> {
		if (removedIds.length === 0) return [];
		await this.txHost.tx
			.update(room)
			.set({ unitTypeRoomId: null, renamed: false })
			.where(
				and(inArray(room.unitTypeRoomId, removedIds), eq(room.renamed, true)),
			);
		const deleted = await this.txHost.tx
			.delete(room)
			.where(inArray(room.unitTypeRoomId, removedIds))
			.returning({ locationId: room.locationId });

		return deleted.map(({ locationId }) => locationId);
	}

	async deleteRooms(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await this.txHost.tx
			.delete(unitTypeRoom)
			.where(inArray(unitTypeRoom.id, ids));
	}

	async updateRooms(rooms: TypeRoomValue[]): Promise<void> {
		if (rooms.length === 0) return;
		const ids = rooms.map(({ id }) => id);
		await this.txHost.tx
			.update(unitTypeRoom)
			.set({ name: sql`${unitTypeRoom.id}::text` })
			.where(inArray(unitTypeRoom.id, ids));
		await this.txHost.tx.execute(sql`
			update ${unitTypeRoom} as t
			set name = v.name, position = v.position
			from (values ${sql.join(
				rooms.map(
					({ id, name, position }) =>
						sql`(${id}::uuid, ${name}::text, ${position}::int)`,
				),
				sql`, `,
			)}) as v(id, name, position)
			where t.id = v.id
		`);
	}

	async insertRooms(unitTypeId: string, rooms: TypeRoomValue[]): Promise<void> {
		if (rooms.length === 0) return;
		await this.txHost.tx
			.insert(unitTypeRoom)
			.values(rooms.map((entry) => ({ ...entry, unitTypeId })));
	}

	async findNameClashes(
		unitTypeId: string,
		addedIds: string[],
	): Promise<string[]> {
		const { rows } = await this.txHost.tx.execute<{ name: string }>(sql`
			with units as (
				select id from ${location} where unit_type_id = ${unitTypeId}
			),
			predicted as (
				select r.location_id, tr.name
				from ${room} r
				join ${unitTypeRoom} tr on tr.id = r.unit_type_room_id
				where r.location_id in (select id from units) and not r.renamed
				union all
				select r.location_id, r.name
				from ${room} r
				where r.location_id in (select id from units)
					and (r.renamed or r.unit_type_room_id is null)
					and not (
						r.unit_type_room_id is null
						and exists (
							select 1 from ${unitTypeRoom} a
							where a.id = any(${uuidList(addedIds)})
								and ${comparable(sql`a.name`)} = ${comparable(sql`r.name`)}
						)
					)
				union all
				select u.id, a.name
				from units u
				cross join ${unitTypeRoom} a
				where a.id = any(${uuidList(addedIds)})
			)
			select min(name) as name
			from predicted
			group by location_id, ${comparable(sql`name`)}
			having count(*) > 1
		`);

		return [...new Set(rows.map(({ name }) => name))];
	}

	async renameRoomsInUnits(renamedIds: string[]): Promise<string[]> {
		if (renamedIds.length === 0) return [];
		const stale = and(
			inArray(room.unitTypeRoomId, renamedIds),
			eq(room.renamed, false),
			sql`${room.name} <> (select t.name from ${unitTypeRoom} t where t.id = ${room.unitTypeRoomId})`,
		);
		await this.txHost.tx
			.update(room)
			.set({ name: sql`${room.id}::text` })
			.where(stale);
		const updated = await this.txHost.tx
			.update(room)
			.set({
				name: sql`(select t.name from ${unitTypeRoom} t where t.id = ${room.unitTypeRoomId})`,
			})
			.where(
				and(
					inArray(room.unitTypeRoomId, renamedIds),
					eq(room.renamed, false),
					sql`${room.name} = ${room.id}::text`,
				),
			)
			.returning({ locationId: room.locationId });

		return updated.map(({ locationId }) => locationId);
	}

	async adoptOwnRooms(unitTypeId: string, addedIds: string[]): Promise<void> {
		if (addedIds.length === 0) return;
		await this.txHost.tx.execute(sql`
			update ${room} r
			set unit_type_room_id = a.id, renamed = false, name = a.name, position = a.position
			from ${unitTypeRoom} a, ${location} u
			where a.id = any(${uuidList(addedIds)})
				and u.id = r.location_id
				and u.unit_type_id = ${unitTypeId}
				and r.unit_type_room_id is null
				and ${comparable(sql`r.name`)} = ${comparable(sql`a.name`)}
		`);
	}

	async addRoomsToUnits(
		unitTypeId: string,
		addedIds: string[],
	): Promise<string[]> {
		if (addedIds.length === 0) return [];
		const { rows } = await this.txHost.tx.execute<{ location_id: string }>(sql`
			insert into ${room} (location_id, name, position, unit_type_room_id)
			select u.id, a.name, a.position, a.id
			from ${location} u
			join ${unitTypeRoom} a on a.id = any(${uuidList(addedIds)})
			where u.unit_type_id = ${unitTypeId}
				and not exists (
					select 1 from ${room} x where x.location_id = u.id and x.unit_type_room_id = a.id
				)
			returning location_id
		`);

		return rows.map(({ location_id }) => location_id);
	}
}
