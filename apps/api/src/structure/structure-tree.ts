import type {
	Structure,
	StructureCommonArea,
	StructureFloor,
	StructureTower,
} from "@bluprint/shared";
import type { LocationRow, StructureRow } from "./location-row";

export function buildStructure(
	rowsInStoredOrder: StructureRow[],
	changesByUnit: ReadonlyMap<string, number>,
): Structure {
	const childrenOf = new Map<string | null, StructureRow[]>();
	for (const row of rowsInStoredOrder) {
		const siblings = childrenOf.get(row.parentId);
		if (siblings) siblings.push(row);
		else childrenOf.set(row.parentId, [row]);
	}

	const childrenOfType = (parentId: string | null, type: LocationRow["type"]) =>
		(childrenOf.get(parentId) ?? []).filter((child) => child.type === type);

	const commonAreasOf = (parentId: string | null): StructureCommonArea[] =>
		childrenOfType(parentId, "common_area").map(({ id, name }) => ({
			id,
			name,
		}));

	const floorOf = ({ id, name }: StructureRow): StructureFloor => ({
		id,
		name,
		units: childrenOfType(id, "unit").map((unit) => ({
			id: unit.id,
			name: unit.name,
			unitType: unit.unitType,
			changes: changesByUnit.get(unit.id) ?? 0,
		})),
		commonAreas: commonAreasOf(id),
	});

	const towerOf = ({ id, name }: StructureRow): StructureTower => ({
		id,
		name,
		floors: childrenOfType(id, "floor").map(floorOf),
		commonAreas: commonAreasOf(id),
	});

	const count = (type: LocationRow["type"]) =>
		rowsInStoredOrder.filter((row) => row.type === type).length;

	return {
		towers: childrenOfType(null, "tower").map(towerOf),
		commonAreas: commonAreasOf(null),
		counts: {
			towers: count("tower"),
			floors: count("floor"),
			units: count("unit"),
			commonAreas: count("common_area"),
		},
	};
}
