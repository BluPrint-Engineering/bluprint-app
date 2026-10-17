import {
	type CreateStructure,
	type CreateStructureResult,
	LOCATION_NOT_FOUND,
	type LocationDetail,
	type Structure,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { ProjectsService } from "../projects/projects.service";
import { UnitsService } from "../units/units.service";
import type { LocationRow } from "./location-row";
import { planCreation } from "./plan-creation";
import { buildStructure } from "./structure-tree";
import { StructureRepository } from "./structure.repository";

const toRef = ({ id, type, name }: LocationRow) => ({ id, type, name });

@Injectable()
export class StructureService {
	constructor(
		private readonly projects: ProjectsService,
		private readonly units: UnitsService,
		private readonly locations: StructureRepository,
	) {}

	@Transactional()
	async create(
		userId: string,
		projectId: string,
		{ locations }: CreateStructure,
	): Promise<CreateStructureResult> {
		await this.projects.beginStructureWrite(userId, projectId);

		const inProject = await this.locations.listForNaming(projectId);
		const takenElsewhere = await this.locations.findIdsInOtherProjects(
			projectId,
			locations.map(({ id }) => id),
		);
		const { fresh, newUnits, counts } = planCreation(
			locations,
			inProject,
			takenElsewhere,
		);

		await this.units.assertAvailable(projectId, newUnits);
		await this.locations.insertAll(projectId, fresh);

		return { counts };
	}

	async readStructure(userId: string, projectId: string): Promise<Structure> {
		await this.projects.findVisible(userId, projectId);

		const [rows, changes] = await Promise.all([
			this.locations.listByProject(projectId),
			this.locations.countUnitChanges(projectId),
		]);

		return buildStructure(rows, changes);
	}

	async readLocation(
		userId: string,
		projectId: string,
		locationId: string,
	): Promise<LocationDetail> {
		await this.projects.findVisible(userId, projectId);

		const found = await this.locations.find(projectId, locationId);
		if (!found) {
			throw new ProblemException({
				status: 404,
				code: LOCATION_NOT_FOUND,
				detail: "The location does not exist in this project.",
			});
		}

		const holdsRooms = found.type === "unit" || found.type === "common_area";
		const [ancestors, children, rooms, droppedRooms, changes] =
			await Promise.all([
				found.parentId
					? this.locations.listAncestorsFromTop(projectId, found.parentId)
					: [],
				this.locations.listChildren(found.id),
				holdsRooms ? this.locations.listRooms(found.id) : [],
				found.unitType ? this.locations.listDroppedRooms(found.id) : [],
				found.unitType
					? this.locations.countUnitChanges(projectId, found.id)
					: new Map<string, number>(),
			]);

		return {
			...toRef(found),
			ancestors: ancestors.map(toRef),
			children: children.map(toRef),
			unitType: found.unitType,
			changes: changes.get(found.id) ?? 0,
			rooms,
			droppedRooms,
		};
	}
}
