import type { LocationType, UnitTypeRef } from "@bluprint/shared";

export interface LocationRow {
	id: string;
	parentId: string | null;
	type: LocationType;
	name: string;
}

export interface StructureRow extends LocationRow {
	unitType: UnitTypeRef | null;
}
