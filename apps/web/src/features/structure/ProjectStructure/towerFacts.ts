import type { StructureTower } from "@bluprint/shared";
import { floorSummary } from "../floorLabel";

function usualUnitsPerFloor(tower: StructureTower): number | undefined {
	const floorsWith = new Map<number, number>();
	for (const floor of tower.floors) {
		const units = floor.units.length;
		if (units > 0) floorsWith.set(units, (floorsWith.get(units) ?? 0) + 1);
	}

	let usual: { units: number; floors: number } | undefined;
	for (const [units, floors] of floorsWith) {
		if (
			!usual ||
			floors > usual.floors ||
			(floors === usual.floors && units < usual.units)
		) {
			usual = { units, floors };
		}
	}
	return usual?.units;
}

export function towerFacts(
	tower: StructureTower,
): [label: string, value: string][] {
	const units = tower.floors.reduce(
		(sum, floor) => sum + floor.units.length,
		0,
	);
	const usual = usualUnitsPerFloor(tower);
	const commonAreas =
		tower.commonAreas.length +
		tower.floors.reduce((sum, floor) => sum + floor.commonAreas.length, 0);

	return [
		["Andares", floorSummary(tower.floors.map((floor) => floor.name))],
		[
			"Unidades",
			usual === undefined ? String(units) : `${units} · ${usual} por andar`,
		],
		["Áreas comuns", String(commonAreas)],
	];
}
