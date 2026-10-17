import { comparableLocationName } from "@bluprint/shared";
import type { LocationRow } from "./location-row";

export function nameScope(
	{ type, parentId }: Pick<LocationRow, "type" | "parentId">,
	known: ReadonlyMap<string, Pick<LocationRow, "parentId">>,
): string {
	if (type === "unit") {
		const floor = parentId === null ? undefined : known.get(parentId);
		return `unit|${floor?.parentId}`;
	}
	return `${type}|${type === "tower" ? "" : parentId}`;
}

export function nameKey(
	row: Pick<LocationRow, "type" | "parentId">,
	name: string,
	known: ReadonlyMap<string, Pick<LocationRow, "parentId">>,
): string {
	return `${nameScope(row, known)}|${comparableLocationName(name)}`;
}
