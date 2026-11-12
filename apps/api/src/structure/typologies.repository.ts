import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { comparableLocationName, type NewTypology } from "@bluprint/shared";
import { and, asc, count, eq, inArray, ne, sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { location } from "./location.entity";
import { room } from "./room.entity";
import { unitChangesQuery } from "./unit-changes";
import { typology, typologyRoom } from "./typology.entity";

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

export interface TypologyUsageRow extends Record<string, unknown> {
	typology_id: string;
	units: number;
	changed: number;
}

@Injectable()
export class TypologiesRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	list(projectId: string): Promise<{ id: string; name: string }[]> {
		return this.txHost.tx
			.select({ id: typology.id, name: typology.name })
			.from(typology)
			.where(eq(typology.projectId, projectId))
			.orderBy(asc(typology.id));
	}

	listRooms(
		projectId: string,
	): Promise<{ id: string; typologyId: string; name: string }[]> {
		return this.txHost.tx
			.select({
				id: typologyRoom.id,
				typologyId: typologyRoom.typologyId,
				name: typologyRoom.name,
			})
			.from(typologyRoom)
			.innerJoin(typology, eq(typology.id, typologyRoom.typologyId))
			.where(eq(typology.projectId, projectId))
			.orderBy(asc(typologyRoom.position), asc(typologyRoom.id));
	}

	async countUnitsByType(
		projectId: string,
	): Promise<Map<string, { units: number; changed: number }>> {
		const { rows } = await this.txHost.tx.execute<TypologyUsageRow>(sql`
			with changes as (${unitChangesQuery(projectId)})
			select u.typology_id, count(*)::int as units, count(changes.unit_id)::int as changed
			from ${location} u
			left join changes on changes.unit_id = u.id
			where u.project_id = ${projectId} and u.typology_id is not null
			group by u.typology_id
		`);

		return new Map(
			rows.map((row) => [
				row.typology_id,
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
			.select({ id: typology.id })
			.from(typology)
			.where(and(inArray(typology.id, ids), ne(typology.projectId, projectId)));

		return new Set(rows.map((row) => row.id));
	}

	async findRoomIds(ids: string[]): Promise<Set<string>> {
		if (ids.length === 0) return new Set();
		const rows = await this.txHost.tx
			.select({ id: typologyRoom.id })
			.from(typologyRoom)
			.where(inArray(typologyRoom.id, ids));

		return new Set(rows.map((row) => row.id));
	}

	async insertAll(projectId: string, typologies: NewTypology[]): Promise<void> {
		if (typologies.length === 0) return;
		await this.txHost.tx
			.insert(typology)
			.values(typologies.map(({ id, name }) => ({ id, projectId, name })));

		const rooms = typologies.flatMap(({ id, rooms }) =>
			rooms.map((entry, position) => ({
				id: entry.id,
				typologyId: id,
				name: entry.name,
				position,
			})),
		);
		for (let start = 0; start < rooms.length; start += INSERT_CHUNK) {
			await this.txHost.tx
				.insert(typologyRoom)
				.values(rooms.slice(start, start + INSERT_CHUNK));
		}
	}

	async giveUnitsTheirRooms(
		units: { id: string; typologyId: string }[],
	): Promise<void> {
		if (units.length === 0) return;
		const typeRooms = await this.txHost.tx
			.select({
				id: typologyRoom.id,
				typologyId: typologyRoom.typologyId,
				name: typologyRoom.name,
				position: typologyRoom.position,
			})
			.from(typologyRoom)
			.where(
				inArray(typologyRoom.typologyId, [
					...new Set(units.map(({ typologyId }) => typologyId)),
				]),
			);

		const rows = units.flatMap(({ id, typologyId }) =>
			typeRooms
				.filter((typeRoom) => typeRoom.typologyId === typologyId)
				.map((typeRoom) => ({
					locationId: id,
					name: typeRoom.name,
					position: typeRoom.position,
					typologyRoomId: typeRoom.id,
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
		typologyId: string,
	): Promise<{ id: string; name: string } | undefined> {
		const [found] = await this.txHost.tx
			.select({ id: typology.id, name: typology.name })
			.from(typology)
			.where(
				and(eq(typology.id, typologyId), eq(typology.projectId, projectId)),
			);

		return found;
	}

	async nameInUse(
		projectId: string,
		name: string,
		exceptTypologyId?: string,
	): Promise<boolean> {
		const [found] = await this.txHost.tx
			.select({ id: typology.id })
			.from(typology)
			.where(
				and(
					eq(typology.projectId, projectId),
					sql`${comparable(typology.name)} = ${comparableLocationName(name)}`,
					exceptTypologyId ? ne(typology.id, exceptTypologyId) : undefined,
				),
			);

		return found !== undefined;
	}

	async rename(typologyId: string, name: string): Promise<void> {
		await this.txHost.tx
			.update(typology)
			.set({ name })
			.where(eq(typology.id, typologyId));
	}

	async countUnits(typologyId: string): Promise<number> {
		const [found] = await this.txHost.tx
			.select({ units: count() })
			.from(location)
			.where(eq(location.typologyId, typologyId));

		return found?.units ?? 0;
	}

	async delete(typologyId: string): Promise<void> {
		await this.txHost.tx.delete(typology).where(eq(typology.id, typologyId));
	}

	async roomsOf(typologyId: string): Promise<{ id: string; name: string }[]> {
		return this.txHost.tx
			.select({ id: typologyRoom.id, name: typologyRoom.name })
			.from(typologyRoom)
			.where(eq(typologyRoom.typologyId, typologyId))
			.orderBy(asc(typologyRoom.position), asc(typologyRoom.id));
	}

	async unitIdsOf(typologyId: string): Promise<string[]> {
		const rows = await this.txHost.tx
			.select({ id: location.id })
			.from(location)
			.where(eq(location.typologyId, typologyId));

		return rows.map(({ id }) => id);
	}

	async releaseRoomsOfRemoved(removedIds: string[]): Promise<string[]> {
		if (removedIds.length === 0) return [];
		await this.txHost.tx
			.update(room)
			.set({ typologyRoomId: null, renamed: false })
			.where(
				and(inArray(room.typologyRoomId, removedIds), eq(room.renamed, true)),
			);
		const deleted = await this.txHost.tx
			.delete(room)
			.where(inArray(room.typologyRoomId, removedIds))
			.returning({ locationId: room.locationId });

		return deleted.map(({ locationId }) => locationId);
	}

	async deleteRooms(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await this.txHost.tx
			.delete(typologyRoom)
			.where(inArray(typologyRoom.id, ids));
	}

	async updateRooms(rooms: TypeRoomValue[]): Promise<void> {
		if (rooms.length === 0) return;
		const ids = rooms.map(({ id }) => id);
		await this.txHost.tx
			.update(typologyRoom)
			.set({ name: sql`${typologyRoom.id}::text` })
			.where(inArray(typologyRoom.id, ids));
		await this.txHost.tx.execute(sql`
			update ${typologyRoom} as t
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

	async insertRooms(typologyId: string, rooms: TypeRoomValue[]): Promise<void> {
		if (rooms.length === 0) return;
		await this.txHost.tx
			.insert(typologyRoom)
			.values(rooms.map((entry) => ({ ...entry, typologyId })));
	}

	async findNameClashes(
		typologyId: string,
		addedIds: string[],
	): Promise<string[]> {
		const { rows } = await this.txHost.tx.execute<{ name: string }>(sql`
			with units as (
				select id from ${location} where typology_id = ${typologyId}
			),
			predicted as (
				select r.location_id, tr.name
				from ${room} r
				join ${typologyRoom} tr on tr.id = r.typology_room_id
				where r.location_id in (select id from units) and not r.renamed
				union all
				select r.location_id, r.name
				from ${room} r
				where r.location_id in (select id from units)
					and (r.renamed or r.typology_room_id is null)
					and not (
						r.typology_room_id is null
						and exists (
							select 1 from ${typologyRoom} a
							where a.id = any(${uuidList(addedIds)})
								and ${comparable(sql`a.name`)} = ${comparable(sql`r.name`)}
						)
					)
				union all
				select u.id, a.name
				from units u
				cross join ${typologyRoom} a
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
			inArray(room.typologyRoomId, renamedIds),
			eq(room.renamed, false),
			sql`${room.name} <> (select t.name from ${typologyRoom} t where t.id = ${room.typologyRoomId})`,
		);
		await this.txHost.tx
			.update(room)
			.set({ name: sql`${room.id}::text` })
			.where(stale);
		const updated = await this.txHost.tx
			.update(room)
			.set({
				name: sql`(select t.name from ${typologyRoom} t where t.id = ${room.typologyRoomId})`,
			})
			.where(
				and(
					inArray(room.typologyRoomId, renamedIds),
					eq(room.renamed, false),
					sql`${room.name} = ${room.id}::text`,
				),
			)
			.returning({ locationId: room.locationId });

		return updated.map(({ locationId }) => locationId);
	}

	async adoptOwnRooms(
		typologyId: string,
		addedIds: string[],
	): Promise<string[]> {
		if (addedIds.length === 0) return [];
		const { rows } = await this.txHost.tx.execute<{ location_id: string }>(sql`
			update ${room} r
			set typology_room_id = a.id, renamed = false, name = a.name, position = a.position
			from ${typologyRoom} a, ${location} u
			where a.id = any(${uuidList(addedIds)})
				and u.id = r.location_id
				and u.typology_id = ${typologyId}
				and r.typology_room_id is null
				and ${comparable(sql`r.name`)} = ${comparable(sql`a.name`)}
			returning r.location_id
		`);

		return rows.map(({ location_id }) => location_id);
	}

	async addRoomsToUnits(
		typologyId: string,
		addedIds: string[],
	): Promise<string[]> {
		if (addedIds.length === 0) return [];
		const { rows } = await this.txHost.tx.execute<{ location_id: string }>(sql`
			insert into ${room} (location_id, name, position, typology_room_id)
			select u.id, a.name, a.position, a.id
			from ${location} u
			join ${typologyRoom} a on a.id = any(${uuidList(addedIds)})
			where u.typology_id = ${typologyId}
				and not exists (
					select 1 from ${room} x where x.location_id = u.id and x.typology_room_id = a.id
				)
			returning location_id
		`);

		return rows.map(({ location_id }) => location_id);
	}
}
