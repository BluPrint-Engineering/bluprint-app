import type { UnitTypeList } from "@bluprint/shared";
import { Injectable } from "@nestjs/common";
import { ProjectsService } from "../projects/projects.service";
import { UnitTypesRepository } from "./unit-types.repository";

@Injectable()
export class UnitTypesService {
	constructor(
		private readonly projects: ProjectsService,
		private readonly unitTypes: UnitTypesRepository,
	) {}

	async list(userId: string, projectId: string): Promise<UnitTypeList> {
		await this.projects.findVisible(userId, projectId);

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
