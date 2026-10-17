import {
	type AddRoom,
	type ChangeUnitType,
	LOCATION_KIND_INVALID,
	LOCATION_NOT_FOUND,
	type LocationDetail,
	type LocationType,
	ROOM_ID_TAKEN,
	ROOM_NAME_TAKEN,
	ROOM_NOT_FOUND,
	type RenameRoom,
	UNIT_TYPE_NOT_FOUND,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { ProjectsService } from "../projects/projects.service";
import { UnitsService } from "../units/units.service";
import { RoomsRepository } from "./rooms.repository";
import { StructureRepository } from "./structure.repository";
import { StructureService } from "./structure.service";
import { UnitTypesRepository } from "./unit-types.repository";

const ROOM_HOLDERS: readonly LocationType[] = ["unit", "common_area"];

const roomNameTaken = (name: string) =>
	new ProblemException({
		status: 409,
		code: ROOM_NAME_TAKEN,
		detail: "A room of this name already exists in this location.",
		names: [name],
	});

const roomNotFound = () =>
	new ProblemException({
		status: 404,
		code: ROOM_NOT_FOUND,
		detail: "The room does not exist in this project.",
	});

@Injectable()
export class RoomsService {
	constructor(
		private readonly projects: ProjectsService,
		private readonly units: UnitsService,
		private readonly structure: StructureService,
		private readonly locations: StructureRepository,
		private readonly rooms: RoomsRepository,
		private readonly unitTypes: UnitTypesRepository,
	) {}

	@Transactional()
	async add(
		userId: string,
		projectId: string,
		locationId: string,
		{ id, name }: AddRoom,
	): Promise<LocationDetail> {
		await this.beginWrite(userId, projectId);
		const found = await this.findLocation(projectId, locationId);
		this.assertKind(found.type, ROOM_HOLDERS);

		const existing = await this.rooms.locationOf(id);
		if (existing === locationId) {
			return this.structure.readLocation(userId, projectId, locationId);
		}
		if (existing !== undefined) {
			throw new ProblemException({
				status: 409,
				code: ROOM_ID_TAKEN,
				detail: "The room id belongs to another location.",
			});
		}
		if (await this.rooms.nameInUse(locationId, name)) {
			throw roomNameTaken(name);
		}

		await this.rooms.insert({
			id,
			locationId,
			name,
			position: await this.rooms.nextPosition(locationId),
		});

		return this.structure.readLocation(userId, projectId, locationId);
	}

	@Transactional()
	async rename(
		userId: string,
		projectId: string,
		roomId: string,
		{ name }: RenameRoom,
	): Promise<LocationDetail> {
		await this.beginWrite(userId, projectId);
		const found = await this.findRoom(projectId, roomId);

		if (await this.rooms.nameInUse(found.locationId, name, roomId)) {
			throw roomNameTaken(name);
		}
		await this.rooms.rename(roomId, name, found.unitTypeRoomId !== null);

		return this.structure.readLocation(userId, projectId, found.locationId);
	}

	@Transactional()
	async remove(
		userId: string,
		projectId: string,
		roomId: string,
	): Promise<LocationDetail> {
		await this.beginWrite(userId, projectId);
		const found = await this.findRoom(projectId, roomId);

		await this.rooms.delete(roomId);
		if (found.unitTypeRoomId !== null) {
			await this.rooms.drop(found.locationId, found.unitTypeRoomId);
		}

		return this.structure.readLocation(userId, projectId, found.locationId);
	}

	@Transactional()
	async giveBack(
		userId: string,
		projectId: string,
		unitId: string,
		unitTypeRoomId: string,
	): Promise<LocationDetail> {
		await this.beginWrite(userId, projectId);
		const unit = await this.findLocation(projectId, unitId);
		this.assertKind(unit.type, ["unit"]);

		const dropped = await this.rooms.findDropped(unitId, unitTypeRoomId);
		if (!dropped) throw roomNotFound();
		if (await this.rooms.nameInUse(unitId, dropped.name)) {
			throw roomNameTaken(dropped.name);
		}

		await this.rooms.insert({
			locationId: unitId,
			name: dropped.name,
			position: dropped.position,
			unitTypeRoomId,
		});
		await this.rooms.takeBack(unitId, unitTypeRoomId);

		return this.structure.readLocation(userId, projectId, unitId);
	}

	@Transactional()
	async changeUnitType(
		userId: string,
		projectId: string,
		unitId: string,
		{ unitTypeId }: ChangeUnitType,
	): Promise<LocationDetail> {
		await this.beginWrite(userId, projectId);
		const unit = await this.findLocation(projectId, unitId);
		this.assertKind(unit.type, ["unit"]);

		const current = unit.unitType?.id ?? null;
		if (unitTypeId === current) {
			return this.structure.readLocation(userId, projectId, unitId);
		}

		if (unitTypeId === null) {
			const ordered = await this.locations.listRooms(unitId);
			await this.rooms.keepAsOwn(
				unitId,
				ordered.map(({ id }) => id),
			);
			await this.rooms.setUnitType(unitId, null);
		} else {
			const known = await this.unitTypes.list(projectId);
			if (!known.some(({ id }) => id === unitTypeId)) {
				throw new ProblemException({
					status: 400,
					code: UNIT_TYPE_NOT_FOUND,
					detail: "The unit type does not exist in the project.",
				});
			}
			await this.rooms.clear(unitId);
			await this.rooms.setUnitType(unitId, unitTypeId);
			await this.unitTypes.giveUnitsTheirRooms([{ id: unitId, unitTypeId }]);
		}

		return this.structure.readLocation(userId, projectId, unitId);
	}

	@Transactional()
	async resetToUnitType(
		userId: string,
		projectId: string,
		unitId: string,
	): Promise<LocationDetail> {
		await this.beginWrite(userId, projectId);
		const unit = await this.findLocation(projectId, unitId);
		this.assertKind(unit.type, ["unit"]);

		if (unit.unitType) await this.rooms.restoreFromUnitType(unitId);

		return this.structure.readLocation(userId, projectId, unitId);
	}

	private async beginWrite(userId: string, projectId: string) {
		await this.projects.beginStructureWrite(userId, projectId);
		await this.units.lockEditable(projectId);
	}

	private async findLocation(projectId: string, locationId: string) {
		const found = await this.locations.find(projectId, locationId);
		if (!found) {
			throw new ProblemException({
				status: 404,
				code: LOCATION_NOT_FOUND,
				detail: "The location does not exist in this project.",
			});
		}

		return found;
	}

	private async findRoom(projectId: string, roomId: string) {
		const found = await this.rooms.findInProject(projectId, roomId);
		if (!found) throw roomNotFound();

		return found;
	}

	private assertKind(type: LocationType, allowed: readonly LocationType[]) {
		if (!allowed.includes(type)) {
			throw new ProblemException({
				status: 400,
				code: LOCATION_KIND_INVALID,
				detail: `A ${type.replace("_", " ")} cannot take this change.`,
			});
		}
	}
}
