import { nth } from "@/test/nth";
import {
	type FloorAreaDraft,
	firstInvalidField,
	initialDraft,
	nextTowerName,
	parseTower,
	validateDraft,
	type WizardDraft,
	withTowerCount,
} from "./wizardDraft";

function draftOf(
	...towers: Partial<WizardDraft["towers"][number]>[]
): WizardDraft {
	return {
		...initialDraft(),
		towers: towers.map((tower, index) => ({
			key: `tower-${index}`,
			name: `Torre ${String.fromCharCode(65 + index)}`,
			first: "1",
			last: "12",
			perFloor: "4",
			ground: true,
			hall: true,
			...tower,
		})),
	};
}

function floorArea(
	floor: string,
	area: Partial<FloorAreaDraft> = {},
): FloorAreaDraft {
	return { key: `area-${floor}`, tower: 0, floor, name: "Terraço", ...area };
}

function withFloorAreas(
	draft: WizardDraft,
	...floorAreas: FloorAreaDraft[]
): WizardDraft {
	return { ...draft, floorAreas };
}

describe("nextTowerName", () => {
	test.each([
		["Torre A", "Torre B"],
		["Torre B", "Torre C"],
		["Bloco Y", "Bloco Z"],
		["Torre Z", "Torre AA"],
		["A", "B"],
		["Torre 1", "Torre 2"],
		["  Torre B  ", "Torre C"],
		["Residencial", ""],
	])("follows %s with %s", (previous, next) => {
		expect(nextTowerName(previous)).toBe(next);
	});
});

describe("withTowerCount", () => {
	test("copies the previous tower with the next letter", () => {
		const draft = draftOf({
			name: "Torre A",
			last: "10",
			perFloor: "2",
			hall: false,
		});

		const grown = withTowerCount(withTowerCount(draft, 2), 3);

		expect(grown.towers.map((tower) => tower.name)).toEqual([
			"Torre A",
			"Torre B",
			"Torre C",
		]);
		expect(grown.towers[2]).toMatchObject({
			last: "10",
			perFloor: "2",
			hall: false,
		});
	});

	test("keeps what the person already typed when the count goes down and up again", () => {
		const draft = withTowerCount(draftOf({}, { last: "8" }), 1);

		expect(draft.towers).toHaveLength(1);
		expect(withTowerCount(draft, 2).towers[1]?.last).toBe("12");
	});

	test("never goes below one tower", () => {
		expect(withTowerCount(draftOf({}), 0).towers).toHaveLength(1);
	});

	test("grows past a dozen towers", () => {
		expect(withTowerCount(draftOf({}), 30).towers).toHaveLength(30);
	});
});

describe("parseTower", () => {
	test("reads a valid tower", () => {
		expect(parseTower(nth(draftOf({}).towers, 0))).toEqual({
			first: 1,
			last: 12,
			perFloor: 4,
		});
	});

	test.each([
		[{ last: "" }],
		[{ first: "" }],
		[{ first: "0" }],
		[{ first: "5", last: "4" }],
		[{ perFloor: "0" }],
		[{ perFloor: "31" }],
		[{ last: "1a" }],
	])("rejects %j", (change) => {
		expect(parseTower(nth(draftOf(change).towers, 0))).toBeUndefined();
	});

	test("reads a tower taller than 200 floors", () => {
		expect(parseTower(nth(draftOf({ last: "350" }).towers, 0))).toEqual({
			first: 1,
			last: 350,
			perFloor: 4,
		});
	});
});

describe("validateDraft", () => {
	test("accepts a complete draft", () => {
		expect(validateDraft(draftOf({}, {}))).toEqual({});
	});

	test("asks for each empty field in portuguese", () => {
		const errors = validateDraft(
			draftOf({ first: "", last: "", perFloor: "" }),
		);

		expect(errors).toEqual({
			"tower-0-first": "Informe o primeiro andar.",
			"tower-0-last": "Informe o último andar.",
			"tower-0-perFloor": "De 1 a 30 unidades por andar.",
		});
	});

	test("compares the last floor with the first only when both are filled", () => {
		expect(validateDraft(draftOf({ first: "5", last: "4" }))).toEqual({
			"tower-0-last":
				"O último andar precisa ser igual ou maior que o primeiro.",
		});
		expect(validateDraft(draftOf({ first: "", last: "4" }))).toEqual({
			"tower-0-first": "Informe o primeiro andar.",
		});
	});

	test("asks for the name only with several towers", () => {
		expect(validateDraft(draftOf({ name: "" }))).toEqual({});
		expect(validateDraft(draftOf({ name: "" }, {}))).toEqual({
			"tower-0-name": "Informe o nome da torre.",
		});
	});

	test("refuses two towers with the same name, ignoring case and spacing", () => {
		expect(
			validateDraft(draftOf({ name: "Torre A" }, { name: " torre   a " })),
		).toEqual({
			"tower-1-name": "Já existe outra torre com esse nome.",
		});
	});

	test("refuses more than 30 units per floor", () => {
		expect(validateDraft(draftOf({ perFloor: "31" }))).toEqual({
			"tower-0-perFloor": "De 1 a 30 unidades por andar.",
		});
	});
});

describe("validateDraft on one-floor common areas", () => {
	test("accepts an area inside its tower's floors", () => {
		expect(validateDraft(withFloorAreas(draftOf({}), floorArea("12")))).toEqual(
			{},
		);
	});

	test("flags an area whose floor is now above the tower's last floor", () => {
		const draft = withFloorAreas(
			draftOf({ last: "15" }),
			floorArea("20", { key: "terrace" }),
		);

		expect(validateDraft(draft)).toEqual({
			"floor-area-terrace": "O andar precisa estar entre o 1º e o 15º.",
		});
	});

	test("flags an area whose floor is now below the tower's first floor", () => {
		const draft = withFloorAreas(
			draftOf({ first: "3" }),
			floorArea("2", { key: "terrace" }),
		);

		expect(validateDraft(draft)).toMatchObject({
			"floor-area-terrace": "O andar precisa estar entre o 3º e o 12º.",
		});
	});

	test("flags an area whose tower has no valid floors yet", () => {
		const draft = withFloorAreas(
			draftOf({ last: "" }),
			floorArea("5", { key: "terrace" }),
		);

		expect(validateDraft(draft)).toMatchObject({
			"tower-0-last": "Informe o último andar.",
			"floor-area-terrace": "Confira os andares da torre primeiro.",
		});
	});

	test("checks each area against its own tower", () => {
		const draft = withFloorAreas(
			draftOf({}, { last: "20" }),
			floorArea("20", { key: "on-a", tower: 0 }),
			floorArea("20", { key: "on-b", tower: 1 }),
		);

		expect(validateDraft(draft)).toEqual({
			"floor-area-on-a": "O andar precisa estar entre o 1º e o 12º.",
		});
	});

	test("flags a second area with the same name on one floor, ignoring case and spacing", () => {
		const draft = withFloorAreas(
			draftOf({}),
			floorArea("12", { key: "first" }),
			floorArea("12", { key: "second", name: " terraço " }),
			floorArea("11", { key: "other-floor" }),
		);

		expect(validateDraft(draft)).toEqual({
			"floor-area-second": "Esse andar já tem uma área comum com esse nome.",
		});
	});

	test("flags an area named like the floor's hall only while the hall is on", () => {
		const hall = floorArea("5", { key: "hall", name: "hall" });

		expect(validateDraft(withFloorAreas(draftOf({}), hall))).toEqual({
			"floor-area-hall": "Esse andar já tem uma área comum com esse nome.",
		});
		expect(
			validateDraft(withFloorAreas(draftOf({ hall: false }), hall)),
		).toEqual({});
	});

	test("ignores an area kept for a tower removed from the count", () => {
		const draft = withFloorAreas(draftOf({}), floorArea("99", { tower: 1 }));

		expect(validateDraft(draft)).toEqual({});
	});
});

describe("firstInvalidField", () => {
	test("finds the first field in reading order", () => {
		const draft = draftOf({}, { last: "", name: "" });

		expect(firstInvalidField(draft, validateDraft(draft))).toEqual({
			id: "tower-1-name",
			section: "towers",
		});
	});

	test("points to a tower field before a common area", () => {
		const draft = withFloorAreas(draftOf({ last: "" }), floorArea("5"));

		expect(firstInvalidField(draft, validateDraft(draft))).toEqual({
			id: "tower-0-last",
			section: "towers",
		});
	});

	test("points to the common area row when the towers are valid", () => {
		const draft = withFloorAreas(
			draftOf({ last: "15" }),
			floorArea("20", { key: "terrace" }),
		);

		expect(firstInvalidField(draft, validateDraft(draft))).toEqual({
			id: "floor-area-terrace",
			section: "areas",
		});
	});

	test("finds nothing in a valid draft", () => {
		const draft = draftOf({});

		expect(firstInvalidField(draft, validateDraft(draft))).toBeUndefined();
	});
});
