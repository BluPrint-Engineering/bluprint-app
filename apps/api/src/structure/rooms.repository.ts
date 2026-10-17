import { comparableLocationName, type LocationType } from "@bluprint/shared";
import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, eq, ne, sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { location } from "./location.entity";
import { droppedRoom, room } from "./room.entity";
import { unitTypeRoom } from "./unit-type.entity";

export interface RoomRow {
	id: string;
	locationId: string;
	locationType: LocationType;
	name: string;
	unitTypeRoomId: string | null;
}

const comparableName = sql`lower(regexp_replace(btrim(${room.name}), '\\s+', ' ', 'g'))`;

@Injectable()
export class RoomsRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	async findInProject(
		projectId: string,
		roomId: string,
	): Promise<RoomRow | undefined> {
		const [found] = await this.txHost.tx
			.select({
				id: room.id,
				locationId: room.locationId,
				locationType: location.type,
				name: room.name,
				unitTypeRoomId: room.unitTypeRoomId,
			})
			.from(room)
			.innerJoin(location, eq(location.id, room.locationId))
			.where(and(eq(room.id, roomId), eq(location.projectId, projectId)));

		return found;
	}

	async locationOf(roomId: string): Promise<string | undefined> {
		const [found] = await this.txHost.tx
			.select({ locationId: room.locationId })
			.from(room)
			.where(eq(room.id, roomId));

		return found?.locationId;
	}

	async nameInUse(
		locationId: string,
		name: string,
		exceptRoomId?: string,
	): Promise<boolean> {
		const [found] = await this.txHost.tx
			.select({ id: room.id })
			.from(room)
			.where(
				and(
					eq(room.locationId, locationId),
					sql`${comparableName} = ${comparableLocationName(name)}`,
					exceptRoomId ? ne(room.id, exceptRoomId) : undefined,
				),
			);

		return found !== undefined;
	}

	async nextPosition(locationId: string): Promise<number> {
		const [found] = await this.txHost.tx
			.select({
				next: sql<number>`coalesce(max(${room.position}) + 1, 0)::int`,
			})
			.from(room)
			.where(eq(room.locationId, locationId));

		return found?.next ?? 0;
	}

	async insert(values: {
		id?: string;
		locationId: string;
		name: string;
		position: number;
		unitTypeRoomId?: string;
	}): Promise<void> {
		await this.txHost.tx.insert(room).values(values);
	}

	async rename(
		roomId: string,
		name: string,
		renamedFromUnitType: boolean,
	): Promise<void> {
		await this.txHost.tx
			.update(room)
			.set(renamedFromUnitType ? { name, renamed: true } : { name })
			.where(eq(room.id, roomId));
	}

	async delete(roomId: string): Promise<void> {
		await this.txHost.tx.delete(room).where(eq(room.id, roomId));
	}

	async drop(locationId: string, unitTypeRoomId: string): Promise<void> {
		await this.txHost.tx
			.insert(droppedRoom)
			.values({ locationId, unitTypeRoomId })
			.onConflictDoNothing();
	}

	async findDropped(
		locationId: string,
		unitTypeRoomId: string,
	): Promise<{ name: string; position: number } | undefined> {
		const [found] = await this.txHost.tx
			.select({ name: unitTypeRoom.name, position: unitTypeRoom.position })
			.from(droppedRoom)
			.innerJoin(unitTypeRoom, eq(unitTypeRoom.id, droppedRoom.unitTypeRoomId))
			.where(
				and(
					eq(droppedRoom.locationId, locationId),
					eq(droppedRoom.unitTypeRoomId, unitTypeRoomId),
				),
			);

		return found;
	}

	async takeBack(locationId: string, unitTypeRoomId: string): Promise<void> {
		await this.txHost.tx
			.delete(droppedRoom)
			.where(
				and(
					eq(droppedRoom.locationId, locationId),
					eq(droppedRoom.unitTypeRoomId, unitTypeRoomId),
				),
			);
	}

	async setUnitType(unitId: string, unitTypeId: string | null): Promise<void> {
		await this.txHost.tx
			.update(location)
			.set({ unitTypeId })
			.where(eq(location.id, unitId));
	}

	async clear(unitId: string): Promise<void> {
		await this.txHost.tx.delete(room).where(eq(room.locationId, unitId));
		await this.txHost.tx
			.delete(droppedRoom)
			.where(eq(droppedRoom.locationId, unitId));
	}

	async keepAsOwn(unitId: string, orderedIds: string[]): Promise<void> {
		await this.txHost.tx
			.update(room)
			.set({ unitTypeRoomId: null, renamed: false })
			.where(eq(room.locationId, unitId));
		for (const [position, id] of orderedIds.entries()) {
			await this.txHost.tx
				.update(room)
				.set({ position })
				.where(eq(room.id, id));
		}
		await this.txHost.tx
			.delete(droppedRoom)
			.where(eq(droppedRoom.locationId, unitId));
	}

	async restoreFromUnitType(unitId: string): Promise<void> {
		await this.txHost.tx
			.delete(room)
			.where(
				and(eq(room.locationId, unitId), sql`${room.unitTypeRoomId} is null`),
			);
		await this.txHost.tx
			.update(room)
			.set({ name: sql`${room.id}::text` })
			.where(and(eq(room.locationId, unitId), eq(room.renamed, true)));
		await this.txHost.tx
			.update(room)
			.set({
				name: unitTypeRoom.name,
				position: unitTypeRoom.position,
				renamed: false,
			})
			.from(unitTypeRoom)
			.where(
				and(
					eq(room.locationId, unitId),
					eq(room.unitTypeRoomId, unitTypeRoom.id),
					eq(room.renamed, true),
				),
			);
		await this.txHost.tx.execute(sql`
			insert into ${room} (location_id, name, position, unit_type_room_id)
			select ${droppedRoom.locationId}, ${unitTypeRoom.name}, ${unitTypeRoom.position}, ${unitTypeRoom.id}
			from ${droppedRoom}
			join ${unitTypeRoom} on ${unitTypeRoom.id} = ${droppedRoom.unitTypeRoomId}
			where ${droppedRoom.locationId} = ${unitId}
		`);
		await this.txHost.tx
			.delete(droppedRoom)
			.where(eq(droppedRoom.locationId, unitId));
	}
}
