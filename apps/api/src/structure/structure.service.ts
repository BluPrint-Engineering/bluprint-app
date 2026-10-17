import {
	type CreateStructure,
	type CreateStructureResult,
	LOCATION_NAME_TAKEN,
	LOCATION_NOT_FOUND,
	type LocationDetail,
	type LocationRef,
	type RenameLocation,
	type Structure,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { ProjectsService } from "../projects/projects.service";
import { UnitsService } from "../units/units.service";
import { nameKey } from "./location-names";
import type { LocationRow } from "./location-row";
import { planCreation } from "./plan-creation";
import { buildStructure } from "./structure-tree";
import { StructureRepository } from "./structure.repository";
import { UnitTypesRepository } from "./unit-types.repository";

const toRef = ({ id, type, name }: LocationRow) => ({ id, type, name });

const locationNotFound = () =>
	new ProblemException({
		status: 404,
		code: LOCATION_NOT_FOUND,
		detail: "The location does not exist in this project.",
	});

@Injectable()
export class StructureService {
	constructor(
		private readonly projects: ProjectsService,
		private readonly units: UnitsService,
		private readonly locations: StructureRepository,
		private readonly unitTypes: UnitTypesRepository,
	) {}

	@Transactional()
	async create(
		userId: string,
		projectId: string,
		request: CreateStructure,
	): Promise<CreateStructureResult> {
		await this.projects.beginStructureWrite(userId, projectId);

		const { unitTypes, locations } = request;
		const inProject = await this.locations.listForNaming(projectId);
		const storedUnitTypes = await this.unitTypes.list(projectId);
		const locationIdsElsewhere = await this.locations.findIdsInOtherProjects(
			projectId,
			locations.map(({ id }) => id),
		);
		const typesElsewhere = await this.unitTypes.findIdsInOtherProjects(
			projectId,
			unitTypes.map(({ id }) => id),
		);
		const storedRooms = await this.unitTypes.findRoomIds(
			unitTypes.flatMap(({ rooms }) => rooms.map(({ id }) => id)),
		);
		const { freshUnitTypes, fresh, newUnits, counts } = planCreation(request, {
			locations: inProject,
			unitTypes: storedUnitTypes,
			locationIdsElsewhere,
			unitTypeIdsInUse: { typesElsewhere, storedRooms },
		});

		await this.units.assertAvailable(projectId, newUnits);
		await this.unitTypes.insertAll(projectId, freshUnitTypes);
		await this.locations.insertAll(projectId, fresh);
		await this.unitTypes.giveUnitsTheirRooms(
			fresh.flatMap(({ id, unitTypeId }) =>
				unitTypeId === undefined ? [] : [{ id, unitTypeId }],
			),
		);

		return { counts };
	}

	@Transactional()
	async rename(
		userId: string,
		projectId: string,
		locationId: string,
		{ name }: RenameLocation,
	): Promise<LocationRef> {
		await this.projects.beginStructureWrite(userId, projectId);
		await this.units.lockEditable(projectId);

		const found = await this.locations.find(projectId, locationId);
		if (!found) throw locationNotFound();

		const inProject = await this.locations.listForNaming(projectId);
		const known = new Map(inProject.map((row) => [row.id, row]));
		const wanted = nameKey(found, name, known);
		const clashes = inProject.some(
			(row) => row.id !== found.id && nameKey(row, row.name, known) === wanted,
		);
		if (clashes) {
			throw new ProblemException({
				status: 409,
				code: LOCATION_NAME_TAKEN,
				detail: "The name is already in use where the location sits.",
				names: [name],
			});
		}

		await this.locations.rename(found.id, name);

		return toRef({ ...found, name });
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
		if (!found) throw locationNotFound();

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
