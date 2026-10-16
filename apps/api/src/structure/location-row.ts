import type { LocationType } from "@bluprint/shared";

export interface LocationRow {
	id: string;
	parentId: string | null;
	type: LocationType;
	name: string;
}
