import { nth } from "@/test/nth";
import {
	firstInvalidFieldId,
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
		[{ last: "201" }],
		[{ last: "1a" }],
	])("rejects %j", (change) => {
		expect(parseTower(nth(draftOf(change).towers, 0))).toBeUndefined();
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

describe("firstInvalidFieldId", () => {
	test("finds the first field in reading order", () => {
		const draft = draftOf({}, { last: "", name: "" });

		expect(firstInvalidFieldId(draft, validateDraft(draft))).toBe(
			"tower-1-name",
		);
	});

	test("finds nothing in a valid draft", () => {
		const draft = draftOf({});

		expect(firstInvalidFieldId(draft, validateDraft(draft))).toBeUndefined();
	});
});
