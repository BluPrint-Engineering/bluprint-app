import {
	disciplineApplies,
	LOCATION_KIND_INVALID,
	LOCATION_NOT_FOUND,
	type DisciplineBatch,
	type DisciplineBatchResult,
	type DisciplineBatchTarget,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { ProjectsService } from "../projects/projects.service";
import { UnitsService } from "../units/units.service";
import { DisciplineBatchesRepository } from "./discipline-batches.repository";
import { assertSpecific } from "./discipline-problems";
import { DisciplinesRepository } from "./disciplines.repository";

const kindInvalid = (detail: string) =>
	new ProblemException({ status: 409, code: LOCATION_KIND_INVALID, detail });

@Injectable()
export class DisciplineBatchesService {
	constructor(
		private readonly projects: ProjectsService,
		private readonly units: UnitsService,
		private readonly disciplines: DisciplinesRepository,
		private readonly batches: DisciplineBatchesRepository,
	) {}

	@Transactional()
	async apply(
		userId: string,
		projectId: string,
		{ target, on, off }: DisciplineBatch,
	): Promise<DisciplineBatchResult> {
		await this.projects.beginStructureWrite(userId, projectId);
		await this.units.lockEditable(projectId);

		await this.assertTarget(projectId, target);

		const catalog = new Map(
			(await this.disciplines.list(projectId)).map((row) => [row.id, row]),
		);
		const named = [
			...on.map((id) => ({ id, applies: true })),
			...off.map((id) => ({ id, applies: false })),
		];
		for (const { id } of named) assertSpecific(catalog.get(id), projectId, 404);

		const scope = this.batches.scopeOf(projectId, target);
		const locations = await this.batches.count(scope);
		if (locations === 0) return { locations };

		await this.batches.clearExceptions(
			scope,
			named.map(({ id }) => id),
		);
		for (const applies of [true, false]) {
			const toStore = named
				.filter(
					(entry) =>
						entry.applies === applies &&
						entry.applies !==
							disciplineApplies("unit", catalog.get(entry.id)!, null),
				)
				.map(({ id }) => id);
			await this.batches.setExceptions(projectId, scope, toStore, applies);
		}

		return { locations };
	}

	private async assertTarget(
		projectId: string,
		target: DisciplineBatchTarget,
	): Promise<void> {
		const ids =
			target.type === "locations" ? target.locationIds : [target.locationId];
		const found = new Map(
			(await this.batches.findLocations(projectId, ids)).map((row) => [
				row.id,
				row.type,
			]),
		);

		const missing = ids.filter((id) => !found.has(id));
		if (missing.length > 0) {
			throw new ProblemException({
				status: 404,
				code: LOCATION_NOT_FOUND,
				detail: "A location does not exist in this project.",
				ids: missing,
			});
		}

		if (target.type === "locations") {
			if (
				[...found.values()].some(
					(type) => type !== "unit" && type !== "common_area",
				)
			) {
				throw kindInvalid(
					"A batch over chosen locations takes units and common areas only.",
				);
			}
			return;
		}

		const expected = target.type === "floor" ? "floor" : "tower";
		if (found.get(target.locationId) !== expected) {
			throw kindInvalid(`The target of this batch is not a ${expected}.`);
		}
	}
}
