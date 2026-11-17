import { disciplineApplies } from "@bluprint/shared";

type Kind = "tower" | "floor" | "unit" | "common_area";
type Exception = boolean | null;

const BASE = { type: "base", appliesEverywhere: true } as const;
const EVERYWHERE = { type: "extra", appliesEverywhere: true } as const;
const WHERE_TURNED_ON = { type: "extra", appliesEverywhere: false } as const;

describe("disciplineApplies", () => {
	test.each<
		[
			string,
			Kind,
			typeof BASE | typeof EVERYWHERE | typeof WHERE_TURNED_ON,
			Exception,
			boolean,
		]
	>([
		["base on a unit", "unit", BASE, null, true],
		["base on a common area", "common_area", BASE, null, true],
		["base on a floor", "floor", BASE, null, true],
		["base on a tower", "tower", BASE, null, true],
		["everywhere extra on a unit", "unit", EVERYWHERE, null, true],
		[
			"everywhere extra on a common area",
			"common_area",
			EVERYWHERE,
			null,
			true,
		],
		["everywhere extra on a floor", "floor", EVERYWHERE, null, false],
		["everywhere extra on a tower", "tower", EVERYWHERE, null, false],
		["turned-on-only extra on a unit", "unit", WHERE_TURNED_ON, null, false],
		[
			"turned-on-only extra on a common area",
			"common_area",
			WHERE_TURNED_ON,
			null,
			false,
		],
		["turned-on-only extra on a floor", "floor", WHERE_TURNED_ON, null, false],
		["turned-on-only extra on a tower", "tower", WHERE_TURNED_ON, null, false],
		["base turned off on a floor", "floor", BASE, false, false],
		["base turned off on a unit", "unit", BASE, false, false],
		["everywhere extra turned off on a unit", "unit", EVERYWHERE, false, false],
		["everywhere extra turned on on a floor", "floor", EVERYWHERE, true, true],
		["everywhere extra turned on on a tower", "tower", EVERYWHERE, true, true],
		[
			"turned-on-only extra turned on on a common area",
			"common_area",
			WHERE_TURNED_ON,
			true,
			true,
		],
		[
			"turned-on-only extra turned on on a tower",
			"tower",
			WHERE_TURNED_ON,
			true,
			true,
		],
	])(
		"%s, exception %s",
		(_name, locationType, discipline, exception, expected) => {
			expect(disciplineApplies(locationType, discipline, exception)).toBe(
				expected,
			);
		},
	);
});
