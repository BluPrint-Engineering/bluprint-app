import {
	type CreateTypology,
	ROOM_NAME_TAKEN,
	TYPOLOGY_ID_TAKEN,
	TYPOLOGY_IN_USE,
	TYPOLOGY_NAME_TAKEN,
	TYPOLOGY_NOT_FOUND,
	type Typology,
	type TypologyList,
	type UpdateTypology,
	type UpdateTypologyResult,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { ProjectsService } from "../projects/projects.service";
import { UnitsService } from "../units/units.service";
import { planRoomChanges } from "./typology-room-plan";
import { TypologiesRepository } from "./typologies.repository";

const typologyNameTaken = (name: string) =>
	new ProblemException({
		status: 409,
		code: TYPOLOGY_NAME_TAKEN,
		detail: "A typology of this name already exists in the project.",
		names: [name],
	});

const typologyNotFound = () =>
	new ProblemException({
		status: 404,
		code: TYPOLOGY_NOT_FOUND,
		detail: "The typology does not exist in the project.",
	});

@Injectable()
export class TypologiesService {
	constructor(
		private readonly projects: ProjectsService,
		private readonly units: UnitsService,
		private readonly typologies: TypologiesRepository,
	) {}

	async list(userId: string, projectId: string): Promise<TypologyList> {
		await this.projects.findVisible(userId, projectId);

		return this.readAll(projectId);
	}

	@Transactional()
	async create(
		userId: string,
		projectId: string,
		{ id, name, rooms }: CreateTypology,
	): Promise<Typology> {
		await this.beginWrite(userId, projectId);

		if (await this.typologies.find(projectId, id)) {
			return this.readOne(projectId, id);
		}
		const idsTaken =
			(await this.typologies.findIdsInOtherProjects(projectId, [id])).size >
				0 ||
			(await this.typologies.findRoomIds(rooms.map((entry) => entry.id))).size >
				0;
		if (idsTaken) {
			throw new ProblemException({
				status: 409,
				code: TYPOLOGY_ID_TAKEN,
				detail: "The typology or room id belongs to another typology.",
			});
		}
		if (await this.typologies.nameInUse(projectId, name)) {
			throw typologyNameTaken(name);
		}

		await this.typologies.insertAll(projectId, [{ id, name, rooms }]);

		return this.readOne(projectId, id);
	}

	@Transactional()
	async update(
		userId: string,
		projectId: string,
		typologyId: string,
		{ name, rooms }: UpdateTypology,
	): Promise<UpdateTypologyResult> {
		await this.beginWrite(userId, projectId);
		const found = await this.typologies.find(projectId, typologyId);
		if (!found) throw typologyNotFound();

		if (name !== undefined && name !== found.name) {
			if (await this.typologies.nameInUse(projectId, name, typologyId)) {
				throw typologyNameTaken(name);
			}
			await this.typologies.rename(typologyId, name);
		}
		const updatedUnits = rooms ? await this.changeRooms(typologyId, rooms) : 0;

		return {
			typology: await this.readOne(projectId, typologyId),
			updatedUnitCount: updatedUnits,
		};
	}

	@Transactional()
	async remove(
		userId: string,
		projectId: string,
		typologyId: string,
	): Promise<TypologyList> {
		await this.beginWrite(userId, projectId);
		if (!(await this.typologies.find(projectId, typologyId))) {
			throw typologyNotFound();
		}

		if ((await this.typologies.countUnits(typologyId)) > 0) {
			throw new ProblemException({
				status: 409,
				code: TYPOLOGY_IN_USE,
				detail: "Units still follow this typology.",
			});
		}
		await this.typologies.delete(typologyId);

		return this.readAll(projectId);
	}

	private async changeRooms(
		typologyId: string,
		requested: { id: string; name: string }[],
	): Promise<number> {
		const current = await this.typologies.roomsOf(typologyId);
		const plan = planRoomChanges(current, requested);

		const currentIds = new Set(current.map(({ id }) => id));
		const claimed = await this.typologies.findRoomIds(plan.addedIds);
		if ([...claimed].some((id) => !currentIds.has(id))) {
			throw new ProblemException({
				status: 409,
				code: TYPOLOGY_ID_TAKEN,
				detail: "A room id of the request belongs to another typology.",
			});
		}

		const changed = new Set<string>();
		for (const id of await this.typologies.releaseRoomsOfRemoved(
			plan.removedIds,
		)) {
			changed.add(id);
		}
		await this.typologies.deleteRooms(plan.removedIds);
		await this.typologies.updateRooms(
			requested
				.map(({ id, name }, position) => ({ id, name, position }))
				.filter(({ id }) => currentIds.has(id)),
		);
		await this.typologies.insertRooms(
			typologyId,
			requested
				.map(({ id, name }, position) => ({ id, name, position }))
				.filter(({ id }) => !currentIds.has(id)),
		);

		const clashes = await this.typologies.findNameClashes(
			typologyId,
			plan.addedIds,
		);
		if (clashes.length > 0) {
			throw new ProblemException({
				status: 409,
				code: ROOM_NAME_TAKEN,
				detail:
					"A unit already has a room of one of these names that the typology cannot take over.",
				names: clashes,
			});
		}

		for (const id of await this.typologies.renameRoomsInUnits(
			plan.renamedIds,
		)) {
			changed.add(id);
		}
		for (const id of await this.typologies.adoptOwnRooms(
			typologyId,
			plan.addedIds,
		)) {
			changed.add(id);
		}
		for (const id of await this.typologies.addRoomsToUnits(
			typologyId,
			plan.addedIds,
		)) {
			changed.add(id);
		}
		if (plan.reordered) {
			for (const id of await this.typologies.unitIdsOf(typologyId)) {
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
		typologyId: string,
	): Promise<Typology> {
		const { typologies } = await this.readAll(projectId);
		const found = typologies.find(({ id }) => id === typologyId);
		if (!found) throw typologyNotFound();

		return found;
	}

	private async readAll(projectId: string): Promise<TypologyList> {
		const [types, rooms, usage] = await Promise.all([
			this.typologies.list(projectId),
			this.typologies.listRooms(projectId),
			this.typologies.countUnitsByType(projectId),
		]);

		return {
			typologies: types.map(({ id, name }) => ({
				id,
				name,
				rooms: rooms
					.filter((candidate) => candidate.typologyId === id)
					.map((candidate) => ({ id: candidate.id, name: candidate.name })),
				unitCount: usage.get(id)?.units ?? 0,
				changedUnitCount: usage.get(id)?.changed ?? 0,
			})),
		};
	}
}
