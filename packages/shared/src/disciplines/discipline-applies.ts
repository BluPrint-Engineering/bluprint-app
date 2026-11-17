import type { LocationType } from "../structure/location-type.js";
import type { Discipline } from "./discipline.js";

export type DisciplineDefault = Pick<Discipline, "type" | "appliesEverywhere">;

export function disciplineApplies(
	locationType: LocationType,
	discipline: DisciplineDefault,
	exception: boolean | null,
): boolean {
	if (exception !== null) return exception;
	if (locationType === "unit" || locationType === "common_area") {
		return discipline.appliesEverywhere;
	}
	return discipline.type === "base";
}
