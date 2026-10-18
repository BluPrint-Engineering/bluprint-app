import {
	type CreateStructure,
	type CreateStructureResult,
	LOCATION_NAME_TAKEN,
	LOCATION_NOT_FOUND,
	type LocationDetail,
	type LocationRef,
	type MoveLocation,
	type NewLocation,
	type RemoveLocationResult,
	type RenameLocation,
	type Structure,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { ProjectsService } from "../projects/projects.service";
import { UnitsService } from "../units/units.service";
import { LocationContent } from "./location-content";
import { nameKey } from "./location-names";
import type { LocationRow } from "./location-row";
import { planCompaction, planInsertion, planMove } from "./sibling-order";
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
		private readonly content: LocationContent,
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
		const storedUnitTypeRooms = new Map<string, Set<string>>();
		for (const { id, unitTypeId } of await this.unitTypes.listRooms(
			projectId,
		)) {
			storedUnitTypeRooms.set(
				unitTypeId,
				(storedUnitTypeRooms.get(unitTypeId) ?? new Set()).add(id),
			);
		}
		const roomIdsInUse = await this.locations.findRoomIds(
			locations.flatMap(({ rooms }) => rooms?.map(({ id }) => id) ?? []),
		);
		const { freshUnitTypes, fresh, newUnits, counts } = planCreation(request, {
			locations: inProject,
			unitTypes: storedUnitTypes,
			locationIdsElsewhere,
			unitTypeIdsInUse: { typesElsewhere, storedRooms },
			storedUnitTypeRooms,
			roomIdsInUse,
		});

		await this.units.assertAvailable(projectId, newUnits);
		await this.unitTypes.insertAll(projectId, freshUnitTypes);
		await this.locations.insertAll(
			projectId,
			await this.placeAmongSiblings(projectId, inProject, fresh),
		);
		await this.unitTypes.giveUnitsTheirRooms(
			fresh.flatMap(({ id, unitTypeId, rooms }) =>
				unitTypeId === undefined || rooms !== undefined
					? []
					: [{ id, unitTypeId }],
			),
		);
		await this.locations.insertRooms(
			fresh.flatMap(({ id: locationId, rooms }) =>
				(rooms ?? []).map((entry, position) => ({
					id: entry.id,
					locationId,
					name: entry.name,
					position,
					unitTypeRoomId: entry.unitTypeRoomId ?? null,
					renamed: entry.renamed ?? false,
				})),
			),
		);
		await this.locations.insertDroppedRooms(
			fresh.flatMap(({ id: locationId, droppedRooms }) =>
				(droppedRooms ?? []).map((unitTypeRoomId) => ({
					locationId,
					unitTypeRoomId,
				})),
			),
		);

		return { counts };
	}

	private async placeAmongSiblings(
		projectId: string,
		inProject: LocationRow[],
		fresh: NewLocation[],
	): Promise<NewLocation[]> {
		const storedIds = new Set(inProject.map(({ id }) => id));
		const freshByParent = new Map<string | null, NewLocation[]>();
		for (const entry of fresh) {
			const children = freshByParent.get(entry.parentId);
			if (children) children.push(entry);
			else freshByParent.set(entry.parentId, [entry]);
		}

		const freshPositions = new Map<string, number>();
		for (const [parentId, children] of freshByParent) {
			const siblings =
				parentId === null || storedIds.has(parentId)
					? await this.locations.listSiblings(projectId, parentId)
					: [];
			for (const { id, position } of planInsertion(siblings, children)) {
				if (storedIds.has(id)) await this.locations.setPosition(id, position);
				else freshPositions.set(id, position);
			}
		}

		return fresh.map((entry) => ({
			...entry,
			position: freshPositions.get(entry.id) ?? entry.position,
		}));
	}

	@Transactional()
	async move(
		userId: string,
		projectId: string,
		locationId: string,
		{ direction }: MoveLocation,
	): Promise<LocationRef> {
		await this.projects.beginStructureWrite(userId, projectId);
		await this.units.lockEditable(projectId);

		const found = await this.locations.find(projectId, locationId);
		if (!found) throw locationNotFound();

		const siblings = await this.locations.listSiblings(
			projectId,
			found.parentId,
		);
		for (const { id, position } of planMove(siblings, found.id, direction)) {
			await this.locations.setPosition(id, position);
		}

		return toRef(found);
	}

	@Transactional()
	async remove(
		userId: string,
		projectId: string,
		locationId: string,
	): Promise<RemoveLocationResult> {
		await this.projects.beginStructureWrite(userId, projectId);
		await this.units.lockEditable(projectId);

		const found = await this.locations.find(projectId, locationId);
		if (!found) throw locationNotFound();

		const subtree = await this.locations.listSubtree(projectId, found.id);
		const subtreeIds = subtree.map(({ id }) => id);
		if (await this.content.hasContent(subtreeIds)) {
			// TODO(#7): archive a subtree with content instead of failing here
			throw new Error("A location with content is archived, not deleted.");
		}
		await this.locations.delete(found.id);
		const siblings = await this.locations.listSiblings(
			projectId,
			found.parentId,
		);
		for (const { id, position } of planCompaction(siblings)) {
			await this.locations.setPosition(id, position);
		}

		const count = (type: LocationRow["type"]) =>
			subtree.filter((row) => row.type === type).length;

		return {
			outcome: "deleted",
			removed: {
				floors: count("floor"),
				units: count("unit"),
				commonAreas: count("common_area"),
			},
		};
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
			position: found.position,
			ancestors: ancestors.map(toRef),
			children: children.map(toRef),
			unitType: found.unitType,
			changes: changes.get(found.id) ?? 0,
			rooms,
			droppedRooms,
		};
	}
}
