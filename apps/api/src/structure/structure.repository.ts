import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import type { DroppedRoom, Room } from "@bluprint/shared";
import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { location } from "./location.entity";
import type {
	LocationRow,
	PlacedLocation,
	PlacedRow,
	SiblingRow,
	StructureRow,
} from "./location-row";
import { droppedRoom, room } from "./room.entity";
import { type UnitChangesRow, unitChangesQuery } from "./unit-changes";
import { typology, typologyRoom } from "./typology.entity";

const INSERT_CHUNK = 1000;

const columns = {
	id: location.id,
	parentId: location.parentId,
	type: location.type,
	name: location.name,
};

const structureColumns = {
	...columns,
	typologyId: typology.id,
	typologyName: typology.name,
};

function toStructureRow({
	typologyId,
	typologyName,
	...row
}: LocationRow & {
	typologyId: string | null;
	typologyName: string | null;
}): StructureRow {
	return {
		...row,
		typology:
			typologyId === null || typologyName === null
				? null
				: { id: typologyId, name: typologyName },
	};
}

@Injectable()
export class StructureRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	async listByProject(projectId: string): Promise<StructureRow[]> {
		const rows = await this.txHost.tx
			.select(structureColumns)
			.from(location)
			.leftJoin(typology, eq(typology.id, location.typologyId))
			.where(eq(location.projectId, projectId))
			.orderBy(asc(location.position), asc(location.id));

		return rows.map(toStructureRow);
	}

	listForNaming(projectId: string): Promise<LocationRow[]> {
		return this.txHost.tx
			.select(columns)
			.from(location)
			.where(eq(location.projectId, projectId));
	}

	async findIdsInOtherProjects(
		projectId: string,
		ids: string[],
	): Promise<Set<string>> {
		const rows = await this.txHost.tx
			.select({ id: location.id })
			.from(location)
			.where(and(inArray(location.id, ids), ne(location.projectId, projectId)));

		return new Set(rows.map((row) => row.id));
	}

	async insertAll(
		projectId: string,
		locations: PlacedLocation[],
	): Promise<void> {
		for (let start = 0; start < locations.length; start += INSERT_CHUNK) {
			await this.txHost.tx.insert(location).values(
				locations
					.slice(start, start + INSERT_CHUNK)
					.map(({ id, parentId, type, name, position, typologyId }) => ({
						id,
						projectId,
						parentId,
						type,
						name,
						position,
						typologyId: typologyId ?? null,
					})),
			);
		}
	}

	async findRoomIds(ids: string[]): Promise<Set<string>> {
		if (ids.length === 0) return new Set();
		const rows = await this.txHost.tx
			.select({ id: room.id })
			.from(room)
			.where(inArray(room.id, ids));

		return new Set(rows.map((row) => row.id));
	}

	async insertRooms(
		rooms: {
			id: string;
			locationId: string;
			name: string;
			position: number;
			typologyRoomId: string | null;
			renamed: boolean;
		}[],
	): Promise<void> {
		for (let start = 0; start < rooms.length; start += INSERT_CHUNK) {
			await this.txHost.tx
				.insert(room)
				.values(rooms.slice(start, start + INSERT_CHUNK));
		}
	}

	async insertDroppedRooms(
		dropped: { locationId: string; typologyRoomId: string }[],
	): Promise<void> {
		for (let start = 0; start < dropped.length; start += INSERT_CHUNK) {
			await this.txHost.tx
				.insert(droppedRoom)
				.values(dropped.slice(start, start + INSERT_CHUNK));
		}
	}

	async listSubtree(projectId: string, rootId: string): Promise<LocationRow[]> {
		const { rows } = await this.txHost.tx.execute<{
			id: string;
			parent_id: string | null;
			type: LocationRow["type"];
			name: string;
		}>(sql`
			with recursive subtree as (
				select ${location.id} as id, ${location.parentId} as parent_id, ${location.type} as type, ${location.name} as name
				from ${location}
				where ${location.id} = ${rootId} and ${location.projectId} = ${projectId}
				union all
				select l.id, l.parent_id, l.type, l.name
				from ${location} l
				join subtree on l.parent_id = subtree.id
			)
			select id, parent_id, type, name from subtree
		`);

		return rows.map((row) => ({
			id: row.id,
			parentId: row.parent_id,
			type: row.type,
			name: row.name,
		}));
	}

	async delete(locationId: string): Promise<void> {
		await this.txHost.tx.delete(location).where(eq(location.id, locationId));
	}

	listSiblings(
		projectId: string,
		parentId: string | null,
	): Promise<SiblingRow[]> {
		return this.txHost.tx
			.select({
				id: location.id,
				type: location.type,
				position: location.position,
			})
			.from(location)
			.where(
				and(
					eq(location.projectId, projectId),
					parentId === null
						? isNull(location.parentId)
						: eq(location.parentId, parentId),
				),
			)
			.orderBy(asc(location.position), asc(location.id));
	}

	async setPosition(locationId: string, position: number): Promise<void> {
		await this.txHost.tx
			.update(location)
			.set({ position })
			.where(eq(location.id, locationId));
	}

	async rename(locationId: string, name: string): Promise<void> {
		await this.txHost.tx
			.update(location)
			.set({ name })
			.where(eq(location.id, locationId));
	}

	async find(
		projectId: string,
		locationId: string,
	): Promise<PlacedRow | undefined> {
		const [found] = await this.txHost.tx
			.select({ ...structureColumns, position: location.position })
			.from(location)
			.leftJoin(typology, eq(typology.id, location.typologyId))
			.where(
				and(eq(location.projectId, projectId), eq(location.id, locationId)),
			);

		return found && { ...toStructureRow(found), position: found.position };
	}

	async countUnitChanges(
		projectId: string,
		unitId?: string,
	): Promise<ReadonlyMap<string, number>> {
		const { rows } = await this.txHost.tx.execute<UnitChangesRow>(
			unitChangesQuery(projectId, unitId),
		);

		return new Map(rows.map((row) => [row.unit_id, row.n]));
	}

	async roomsByLocation(locationIds: string[]): Promise<Map<string, Room[]>> {
		const byLocation = new Map(locationIds.map((id) => [id, [] as Room[]]));
		if (locationIds.length === 0) return byLocation;
		const rows = await this.txHost.tx
			.select({
				locationId: room.locationId,
				id: room.id,
				name: room.name,
				typologyRoomId: room.typologyRoomId,
				renamed: room.renamed,
			})
			.from(room)
			.leftJoin(typologyRoom, eq(typologyRoom.id, room.typologyRoomId))
			.where(inArray(room.locationId, locationIds))
			.orderBy(
				sql`(${room.typologyRoomId} is null)`,
				sql`coalesce(${typologyRoom.position}, ${room.position})`,
				asc(room.id),
			);
		for (const { locationId, ...entry } of rows) {
			byLocation.get(locationId)?.push(entry);
		}

		return byLocation;
	}

	async droppedRoomsByLocation(
		locationIds: string[],
	): Promise<Map<string, DroppedRoom[]>> {
		const byLocation = new Map(
			locationIds.map((id) => [id, [] as DroppedRoom[]]),
		);
		if (locationIds.length === 0) return byLocation;
		const rows = await this.txHost.tx
			.select({
				locationId: droppedRoom.locationId,
				typologyRoomId: droppedRoom.typologyRoomId,
				name: typologyRoom.name,
			})
			.from(droppedRoom)
			.innerJoin(typologyRoom, eq(typologyRoom.id, droppedRoom.typologyRoomId))
			.where(inArray(droppedRoom.locationId, locationIds))
			.orderBy(asc(typologyRoom.position), asc(typologyRoom.id));
		for (const { locationId, ...entry } of rows) {
			byLocation.get(locationId)?.push(entry);
		}

		return byLocation;
	}

	async listRooms(locationId: string): Promise<Room[]> {
		return (await this.roomsByLocation([locationId])).get(locationId) ?? [];
	}

	async listDroppedRooms(locationId: string): Promise<DroppedRoom[]> {
		return (
			(await this.droppedRoomsByLocation([locationId])).get(locationId) ?? []
		);
	}

	listChildren(parentId: string): Promise<LocationRow[]> {
		return this.txHost.tx
			.select(columns)
			.from(location)
			.where(eq(location.parentId, parentId))
			.orderBy(asc(location.position), asc(location.id));
	}

	async listAncestorsFromTop(
		projectId: string,
		parentId: string,
	): Promise<LocationRow[]> {
		const { rows } = await this.txHost.tx.execute<{
			id: string;
			parent_id: string | null;
			type: LocationRow["type"];
			name: string;
		}>(sql`
			with recursive chain as (
				select ${location.id} as id, ${location.parentId} as parent_id, ${location.type} as type, ${location.name} as name, 0 as depth
				from ${location}
				where ${location.id} = ${parentId} and ${location.projectId} = ${projectId}
				union all
				select l.id, l.parent_id, l.type, l.name, chain.depth + 1
				from ${location} l
				join chain on l.id = chain.parent_id
			)
			select id, parent_id, type, name from chain order by depth desc
		`);

		return rows.map((row) => ({
			id: row.id,
			parentId: row.parent_id,
			type: row.type,
			name: row.name,
		}));
	}
}
