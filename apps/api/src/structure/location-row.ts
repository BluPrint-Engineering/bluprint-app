import type { LocationType, NewLocation, TypologyRef } from "@bluprint/shared";

export interface LocationRow {
	id: string;
	parentId: string | null;
	type: LocationType;
	name: string;
}

export interface StructureRow extends LocationRow {
	typology: TypologyRef | null;
}

export interface PlacedRow extends StructureRow {
	position: number;
}

export interface SiblingRow {
	id: string;
	type: LocationType;
	position: number;
}

export type PlacedLocation = NewLocation & { position: number };
