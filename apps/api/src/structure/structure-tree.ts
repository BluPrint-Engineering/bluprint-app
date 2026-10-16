import type {
	Structure,
	StructureCommonArea,
	StructureFloor,
	StructureTower,
} from "@bluprint/shared";
import type { LocationRow } from "./location-row";

export function buildStructure(rowsInStoredOrder: LocationRow[]): Structure {
	const childrenOf = new Map<string | null, LocationRow[]>();
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

	const floorOf = ({ id, name }: LocationRow): StructureFloor => ({
		id,
		name,
		units: childrenOfType(id, "unit").map((unit) => ({
			id: unit.id,
			name: unit.name,
		})),
		commonAreas: commonAreasOf(id),
	});

	const towerOf = ({ id, name }: LocationRow): StructureTower => ({
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
