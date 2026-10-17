import type { UnitTypeRef } from "@bluprint/shared";
import { plural } from "../plural";

export function changesLabel(changes: number): string {
	return plural(changes, "alteração", "alterações");
}

export function unitTypeLine({
	unitType,
	changes,
}: {
	unitType: UnitTypeRef | null;
	changes: number;
}): string {
	if (!unitType) return "Sem tipologia";
	return changes > 0
		? `${unitType.name} · ${changesLabel(changes)}`
		: unitType.name;
}
