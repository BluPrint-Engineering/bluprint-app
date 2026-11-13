import {
	DISCIPLINE_ID_TAKEN,
	DISCIPLINE_LIMIT_REACHED,
	DISCIPLINE_NAME_TAKEN,
	type CreateDiscipline,
	type Discipline,
	type DisciplineList,
	EXTRA_DISCIPLINE_COLORS,
	MAX_EXTRA_DISCIPLINES,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { ProjectsService } from "../projects/projects.service";
import { UnitsService } from "../units/units.service";
import {
	type DisciplineRow,
	DisciplinesRepository,
} from "./disciplines.repository";

function toDiscipline(row: DisciplineRow): Discipline {
	return {
		id: row.id,
		name: row.name,
		color: row.color,
		type: row.type,
		hasOwnPlan: row.hasOwnPlan,
		appliesEverywhere: row.appliesEverywhere,
	};
}

@Injectable()
export class DisciplinesService {
	constructor(
		private readonly projects: ProjectsService,
		private readonly units: UnitsService,
		private readonly disciplines: DisciplinesRepository,
	) {}

	async list(userId: string, projectId: string): Promise<DisciplineList> {
		await this.projects.findVisible(userId, projectId);

		return {
			items: (await this.disciplines.list(projectId)).map(toDiscipline),
		};
	}

	@Transactional()
	async create(
		userId: string,
		projectId: string,
		{ id, name, appliesEverywhere }: CreateDiscipline,
	): Promise<Discipline> {
		await this.projects.beginStructureWrite(userId, projectId);
		await this.units.lockEditable(projectId);

		const existing = await this.disciplines.find(id);
		if (existing) {
			if (existing.projectId !== projectId) {
				throw new ProblemException({
					status: 409,
					code: DISCIPLINE_ID_TAKEN,
					detail: "The discipline id is already taken.",
				});
			}

			return toDiscipline(existing);
		}

		const sameName = await this.disciplines.findByName(projectId, name);
		if (sameName) {
			throw new ProblemException({
				status: 409,
				code: DISCIPLINE_NAME_TAKEN,
				detail: "A discipline of this name already exists in the project.",
				name: sameName.name,
			});
		}

		const limitReached = new ProblemException({
			status: 409,
			code: DISCIPLINE_LIMIT_REACHED,
			detail: `A project holds at most ${MAX_EXTRA_DISCIPLINES} extra disciplines.`,
		});
		if (
			(await this.disciplines.countExtras(projectId)) >= MAX_EXTRA_DISCIPLINES
		) {
			throw limitReached;
		}

		const used = await this.disciplines.usedColors(projectId);
		const color = EXTRA_DISCIPLINE_COLORS.find(
			(candidate) => !used.has(candidate),
		);
		if (!color) throw limitReached;

		return toDiscipline(
			await this.disciplines.insertExtra({
				id,
				projectId,
				name,
				color,
				appliesEverywhere,
			}),
		);
	}
}
