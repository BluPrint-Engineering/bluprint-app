import { comparableLocationName, type LocationType } from "@bluprint/shared";
import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, eq, ne, sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { location } from "./location.entity";
import { droppedRoom, room } from "./room.entity";
import { typologyRoom } from "./typology.entity";

export interface RoomRow {
	id: string;
	locationId: string;
	locationType: LocationType;
	name: string;
	typologyRoomId: string | null;
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
				typologyRoomId: room.typologyRoomId,
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
		typologyRoomId?: string;
	}): Promise<void> {
		await this.txHost.tx.insert(room).values(values);
	}

	async rename(
		roomId: string,
		name: string,
		renamedFromTypology: boolean,
	): Promise<void> {
		await this.txHost.tx
			.update(room)
			.set(renamedFromTypology ? { name, renamed: true } : { name })
			.where(eq(room.id, roomId));
	}

	async delete(roomId: string): Promise<void> {
		await this.txHost.tx.delete(room).where(eq(room.id, roomId));
	}

	async drop(locationId: string, typologyRoomId: string): Promise<void> {
		await this.txHost.tx
			.insert(droppedRoom)
			.values({ locationId, typologyRoomId })
			.onConflictDoNothing();
	}

	async findDropped(
		locationId: string,
		typologyRoomId: string,
	): Promise<{ name: string; position: number } | undefined> {
		const [found] = await this.txHost.tx
			.select({ name: typologyRoom.name, position: typologyRoom.position })
			.from(droppedRoom)
			.innerJoin(typologyRoom, eq(typologyRoom.id, droppedRoom.typologyRoomId))
			.where(
				and(
					eq(droppedRoom.locationId, locationId),
					eq(droppedRoom.typologyRoomId, typologyRoomId),
				),
			);

		return found;
	}

	async takeBack(locationId: string, typologyRoomId: string): Promise<void> {
		await this.txHost.tx
			.delete(droppedRoom)
			.where(
				and(
					eq(droppedRoom.locationId, locationId),
					eq(droppedRoom.typologyRoomId, typologyRoomId),
				),
			);
	}

	async setTypology(unitId: string, typologyId: string | null): Promise<void> {
		await this.txHost.tx
			.update(location)
			.set({ typologyId })
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
			.set({ typologyRoomId: null, renamed: false })
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

	async restoreFromTypology(unitId: string): Promise<void> {
		await this.txHost.tx
			.delete(room)
			.where(
				and(eq(room.locationId, unitId), sql`${room.typologyRoomId} is null`),
			);
		await this.txHost.tx
			.update(room)
			.set({ name: sql`${room.id}::text` })
			.where(and(eq(room.locationId, unitId), eq(room.renamed, true)));
		await this.txHost.tx
			.update(room)
			.set({
				name: typologyRoom.name,
				position: typologyRoom.position,
				renamed: false,
			})
			.from(typologyRoom)
			.where(
				and(
					eq(room.locationId, unitId),
					eq(room.typologyRoomId, typologyRoom.id),
					eq(room.renamed, true),
				),
			);
		await this.txHost.tx.execute(sql`
			insert into ${room} (location_id, name, position, typology_room_id)
			select ${droppedRoom.locationId}, ${typologyRoom.name}, ${typologyRoom.position}, ${typologyRoom.id}
			from ${droppedRoom}
			join ${typologyRoom} on ${typologyRoom.id} = ${droppedRoom.typologyRoomId}
			where ${droppedRoom.locationId} = ${unitId}
		`);
		await this.txHost.tx
			.delete(droppedRoom)
			.where(eq(droppedRoom.locationId, unitId));
	}
}
