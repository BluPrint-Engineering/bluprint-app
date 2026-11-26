import {
	disciplineApplies,
	LOCATION_NOT_FOUND,
	type LocationDiscipline,
	type LocationDisciplines,
	type LocationType,
	type NewLocationDiscipline,
	type SetLocationDiscipline,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { ProjectsService } from "../projects/projects.service";
import { UnitsService } from "../units/units.service";
import { assertSpecific } from "./discipline-problems";
import { DisciplinesRepository } from "./disciplines.repository";
import { LocationDisciplinesRepository } from "./location-disciplines.repository";

@Injectable()
export class LocationDisciplinesService {
	constructor(
		private readonly projects: ProjectsService,
		private readonly units: UnitsService,
		private readonly disciplines: DisciplinesRepository,
		private readonly exceptions: LocationDisciplinesRepository,
	) {}

	async resolve(
		projectId: string,
		location: { id: string; type: LocationType },
	): Promise<LocationDiscipline[]> {
		const rows = await this.exceptions.listSpecific(projectId, location.id);

		return rows.map((row) => ({
			id: row.id,
			name: row.name,
			applies: disciplineApplies(location.type, row, row.exception),
		}));
	}

	exceptionsByLocation(
		locationIds: string[],
	): Promise<Map<string, NewLocationDiscipline[]>> {
		return this.exceptions.exceptionsByLocation(locationIds);
	}

	@Transactional()
	async setApplies(
		userId: string,
		projectId: string,
		locationId: string,
		disciplineId: string,
		{ applies }: SetLocationDiscipline,
	): Promise<LocationDisciplines> {
		await this.projects.beginStructureWrite(userId, projectId);
		await this.units.lockEditable(projectId);

		const found = await this.exceptions.findLocation(projectId, locationId);
		if (!found) {
			throw new ProblemException({
				status: 404,
				code: LOCATION_NOT_FOUND,
				detail: "The location does not exist in this project.",
			});
		}

		const target = await this.disciplines.find(disciplineId);
		assertSpecific(target, projectId, 404);

		if (applies === disciplineApplies(found.type, target, null)) {
			await this.exceptions.clearException(locationId, disciplineId);
		} else {
			await this.exceptions.setException({
				locationId,
				disciplineId,
				projectId,
				applies,
			});
		}

		return { disciplines: await this.resolve(projectId, found) };
	}

	async giveNewLocationsTheirExceptions(
		projectId: string,
		locations: {
			id: string;
			type: LocationType;
			disciplines?: NewLocationDiscipline[] | undefined;
		}[],
	): Promise<void> {
		const catalog = new Map(
			(await this.disciplines.list(projectId)).map((row) => [row.id, row]),
		);

		await this.exceptions.insertExceptions(
			locations.flatMap(({ id: locationId, type, disciplines = [] }) =>
				disciplines.flatMap(({ disciplineId, applies }) => {
					const target = catalog.get(disciplineId);
					assertSpecific(target, projectId, 400);
					return applies === disciplineApplies(type, target, null)
						? []
						: [{ locationId, disciplineId, projectId, applies }];
				}),
			),
		);
	}
}
