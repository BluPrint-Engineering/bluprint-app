import {
	type CreateUnitType,
	ROOM_NAME_TAKEN,
	UNIT_TYPE_ID_TAKEN,
	UNIT_TYPE_IN_USE,
	UNIT_TYPE_NAME_TAKEN,
	UNIT_TYPE_NOT_FOUND,
	type UnitType,
	type UnitTypeList,
	type UpdateUnitType,
	type UpdateUnitTypeResult,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { ProjectsService } from "../projects/projects.service";
import { UnitsService } from "../units/units.service";
import { planRoomChanges } from "./unit-type-room-plan";
import { UnitTypesRepository } from "./unit-types.repository";

const unitTypeNameTaken = (name: string) =>
	new ProblemException({
		status: 409,
		code: UNIT_TYPE_NAME_TAKEN,
		detail: "A unit type of this name already exists in the project.",
		names: [name],
	});

const unitTypeNotFound = () =>
	new ProblemException({
		status: 404,
		code: UNIT_TYPE_NOT_FOUND,
		detail: "The unit type does not exist in the project.",
	});

@Injectable()
export class UnitTypesService {
	constructor(
		private readonly projects: ProjectsService,
		private readonly units: UnitsService,
		private readonly unitTypes: UnitTypesRepository,
	) {}

	async list(userId: string, projectId: string): Promise<UnitTypeList> {
		await this.projects.findVisible(userId, projectId);

		return this.readAll(projectId);
	}

	@Transactional()
	async create(
		userId: string,
		projectId: string,
		{ id, name, rooms }: CreateUnitType,
	): Promise<UnitType> {
		await this.beginWrite(userId, projectId);

		if (await this.unitTypes.find(projectId, id)) {
			return this.readOne(projectId, id);
		}
		const idsTaken =
			(await this.unitTypes.findIdsInOtherProjects(projectId, [id])).size > 0 ||
			(await this.unitTypes.findRoomIds(rooms.map((entry) => entry.id))).size >
				0;
		if (idsTaken) {
			throw new ProblemException({
				status: 409,
				code: UNIT_TYPE_ID_TAKEN,
				detail: "The unit type or room id belongs to another unit type.",
			});
		}
		if (await this.unitTypes.nameInUse(projectId, name)) {
			throw unitTypeNameTaken(name);
		}

		await this.unitTypes.insertAll(projectId, [{ id, name, rooms }]);

		return this.readOne(projectId, id);
	}

	@Transactional()
	async update(
		userId: string,
		projectId: string,
		unitTypeId: string,
		{ name, rooms }: UpdateUnitType,
	): Promise<UpdateUnitTypeResult> {
		await this.beginWrite(userId, projectId);
		const found = await this.unitTypes.find(projectId, unitTypeId);
		if (!found) throw unitTypeNotFound();

		if (name !== undefined && name !== found.name) {
			if (await this.unitTypes.nameInUse(projectId, name, unitTypeId)) {
				throw unitTypeNameTaken(name);
			}
			await this.unitTypes.rename(unitTypeId, name);
		}
		const updatedUnits = rooms ? await this.changeRooms(unitTypeId, rooms) : 0;

		return {
			unitType: await this.readOne(projectId, unitTypeId),
			updatedUnitCount: updatedUnits,
		};
	}

	@Transactional()
	async remove(
		userId: string,
		projectId: string,
		unitTypeId: string,
	): Promise<UnitTypeList> {
		await this.beginWrite(userId, projectId);
		if (!(await this.unitTypes.find(projectId, unitTypeId))) {
			throw unitTypeNotFound();
		}

		if ((await this.unitTypes.countUnits(unitTypeId)) > 0) {
			throw new ProblemException({
				status: 409,
				code: UNIT_TYPE_IN_USE,
				detail: "Units still follow this unit type.",
			});
		}
		await this.unitTypes.delete(unitTypeId);

		return this.readAll(projectId);
	}

	private async changeRooms(
		unitTypeId: string,
		requested: { id: string; name: string }[],
	): Promise<number> {
		const current = await this.unitTypes.roomsOf(unitTypeId);
		const plan = planRoomChanges(current, requested);

		const currentIds = new Set(current.map(({ id }) => id));
		const claimed = await this.unitTypes.findRoomIds(plan.addedIds);
		if ([...claimed].some((id) => !currentIds.has(id))) {
			throw new ProblemException({
				status: 409,
				code: UNIT_TYPE_ID_TAKEN,
				detail: "A room id of the request belongs to another unit type.",
			});
		}

		const changed = new Set<string>();
		for (const id of await this.unitTypes.releaseRoomsOfRemoved(
			plan.removedIds,
		)) {
			changed.add(id);
		}
		await this.unitTypes.deleteRooms(plan.removedIds);
		await this.unitTypes.updateRooms(
			requested
				.map(({ id, name }, position) => ({ id, name, position }))
				.filter(({ id }) => currentIds.has(id)),
		);
		await this.unitTypes.insertRooms(
			unitTypeId,
			requested
				.map(({ id, name }, position) => ({ id, name, position }))
				.filter(({ id }) => !currentIds.has(id)),
		);

		const clashes = await this.unitTypes.findNameClashes(
			unitTypeId,
			plan.addedIds,
		);
		if (clashes.length > 0) {
			throw new ProblemException({
				status: 409,
				code: ROOM_NAME_TAKEN,
				detail:
					"A unit already has a room of one of these names that the unit type cannot take over.",
				names: clashes,
			});
		}

		for (const id of await this.unitTypes.renameRoomsInUnits(plan.renamedIds)) {
			changed.add(id);
		}
		await this.unitTypes.adoptOwnRooms(unitTypeId, plan.addedIds);
		for (const id of await this.unitTypes.addRoomsToUnits(
			unitTypeId,
			plan.addedIds,
		)) {
			changed.add(id);
		}
		if (plan.reordered) {
			for (const id of await this.unitTypes.unitIdsOf(unitTypeId)) {
				changed.add(id);
			}
		}

		return changed.size;
	}

	private async beginWrite(userId: string, projectId: string) {
		await this.projects.beginStructureWrite(userId, projectId);
		await this.units.lockEditable(projectId);
	}

	private async readOne(
		projectId: string,
		unitTypeId: string,
	): Promise<UnitType> {
		const { unitTypes } = await this.readAll(projectId);
		const found = unitTypes.find(({ id }) => id === unitTypeId);
		if (!found) throw unitTypeNotFound();

		return found;
	}

	private async readAll(projectId: string): Promise<UnitTypeList> {
		const [types, rooms, usage] = await Promise.all([
			this.unitTypes.list(projectId),
			this.unitTypes.listRooms(projectId),
			this.unitTypes.countUnitsByType(projectId),
		]);

		return {
			unitTypes: types.map(({ id, name }) => ({
				id,
				name,
				rooms: rooms
					.filter((candidate) => candidate.unitTypeId === id)
					.map((candidate) => ({ id: candidate.id, name: candidate.name })),
				unitCount: usage.get(id)?.units ?? 0,
				changedUnitCount: usage.get(id)?.changed ?? 0,
			})),
		};
	}
}
