import { type LocationType, locationTypes } from "@bluprint/shared";
import { canHoldChild } from "./location-pairs";

const allowedPairs: [LocationType | null, LocationType][] = [
	[null, "tower"],
	[null, "common_area"],
	["tower", "floor"],
	["tower", "common_area"],
	["floor", "unit"],
	["floor", "common_area"],
];

const allPairs = [null, ...locationTypes].flatMap((parentType) =>
	locationTypes.map((childType): [LocationType | null, LocationType] => [
		parentType,
		childType,
	]),
);

const isAllowed = ([parentType, childType]: [
	LocationType | null,
	LocationType,
]) =>
	allowedPairs.some(
		([allowedParent, allowedChild]) =>
			allowedParent === parentType && allowedChild === childType,
	);

describe("canHoldChild", () => {
	test.each(allowedPairs)("lets %s hold a %s", (parentType, childType) => {
		expect(canHoldChild(parentType, childType)).toBe(true);
	});

	test.each(allPairs.filter((pair) => !isAllowed(pair)))(
		"refuses %s holding a %s",
		(parentType, childType) => {
			expect(canHoldChild(parentType, childType)).toBe(false);
		},
	);
});
