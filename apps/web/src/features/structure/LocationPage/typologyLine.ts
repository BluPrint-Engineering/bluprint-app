import type { TypologyRef } from "@bluprint/shared";
import { plural } from "../plural";

export function changesLabel(changes: number): string {
	return plural(changes, "alteração", "alterações");
}

export function typologyLine({
	typology,
	changes,
}: {
	typology: TypologyRef | null;
	changes: number;
}): string {
	if (!typology) return "Sem tipologia";
	return changes > 0
		? `${typology.name} · ${changesLabel(changes)}`
		: typology.name;
}
