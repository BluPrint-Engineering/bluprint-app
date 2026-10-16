import type { LocationType } from "@bluprint/shared";

const childTypesOf: Record<
	LocationType | "projectRoot",
	readonly LocationType[]
> = {
	projectRoot: ["tower", "common_area"],
	tower: ["floor", "common_area"],
	floor: ["unit", "common_area"],
	unit: [],
	common_area: [],
};

export function canHoldChild(
	parentType: LocationType | null,
	childType: LocationType,
): boolean {
	return childTypesOf[parentType ?? "projectRoot"].includes(childType);
}
