import { DISCIPLINE_IS_GENERAL, DISCIPLINE_NOT_FOUND } from "@bluprint/shared";
import { ProblemException } from "../common/problems/problem.exception";
import type { DisciplineRow } from "./disciplines.repository";

export const disciplineNotFound = (status: 400 | 404) =>
	new ProblemException({
		status,
		code: DISCIPLINE_NOT_FOUND,
		detail: "The discipline does not exist in this project.",
	});

export const disciplineIsGeneral = () =>
	new ProblemException({
		status: 409,
		code: DISCIPLINE_IS_GENERAL,
		detail: "General applies at every location and cannot be changed.",
	});

export function assertSpecific(
	target: DisciplineRow | undefined,
	projectId: string,
	missingStatus: 400 | 404,
): asserts target is DisciplineRow {
	if (!target || target.projectId !== projectId) {
		throw disciplineNotFound(missingStatus);
	}
	if (target.type === "general") throw disciplineIsGeneral();
}
