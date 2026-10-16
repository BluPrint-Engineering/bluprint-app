import {
	LOCATION_NOT_FOUND,
	type LocationDetail,
	type Structure,
} from "@bluprint/shared";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { ProjectsService } from "../projects/projects.service";
import type { LocationRow } from "./location-row";
import { buildStructure } from "./structure-tree";
import { StructureRepository } from "./structure.repository";

const toRef = ({ id, type, name }: LocationRow) => ({ id, type, name });

@Injectable()
export class StructureService {
	constructor(
		private readonly projects: ProjectsService,
		private readonly locations: StructureRepository,
	) {}

	async readStructure(userId: string, projectId: string): Promise<Structure> {
		await this.projects.findVisible(userId, projectId);

		return buildStructure(await this.locations.listByProject(projectId));
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

		const [ancestors, children] = await Promise.all([
			found.parentId
				? this.locations.listAncestors(projectId, found.parentId)
				: [],
			this.locations.listChildren(found.id),
		]);

		return {
			...toRef(found),
			ancestors: ancestors.map(toRef),
			children: children.map(toRef),
		};
	}
}
