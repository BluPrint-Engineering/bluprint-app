import {
	parseFinals,
	parseFloorBound,
	type RuleDraft,
	typologyKeyFor,
} from "./typologyRules";

const rule = (rest: Partial<RuleDraft> = {}): RuleDraft => ({
	key: "rule",
	tower: 0,
	finals: "todos",
	from: "",
	to: "",
	typology: "a",
	...rest,
});

describe("parseFinals", () => {
	test.each(["", "  ", "todos", "TODOS", " Todos "])(
		"reads %j as every stack",
		(typed) => {
			expect(parseFinals(typed)).toBe("all");
		},
	);

	test.each([
		["01, 03", [1, 3]],
		["2", [2]],
		["1 2 3", [1, 2, 3]],
		["04;02", [4, 2]],
		["1,,3", [1, 3]],
	])("reads %j as the stacks %j", (typed, expected) => {
		expect(parseFinals(typed)).toEqual(expected);
	});

	test.each(["um", "0", "00", "1, x", "1.5", "-1"])(
		"does not read %j",
		(typed) => {
			expect(parseFinals(typed)).toBeUndefined();
		},
	);
});

describe("parseFloorBound", () => {
	test("reads digits and leaves anything else open", () => {
		expect(parseFloorBound("12")).toBe(12);
		expect(parseFloorBound(" 3 ")).toBe(3);
		expect(parseFloorBound("")).toBeUndefined();
		expect(parseFloorBound("x")).toBeUndefined();
	});
});

describe("typologyKeyFor", () => {
	test("returns null without rules", () => {
		expect(typologyKeyFor([], 0, 1, 1)).toBeNull();
	});

	test("takes the typology of the first rule that reaches the tower, floor and stack", () => {
		const rules = [
			rule({ typology: "odd", finals: "1, 3", from: "1", to: "11" }),
			rule({ typology: "even", finals: "2, 4", from: "1", to: "11" }),
			rule({ typology: "top", from: "12", to: "12" }),
		];

		expect(typologyKeyFor(rules, 0, 5, 1)).toBe("odd");
		expect(typologyKeyFor(rules, 0, 5, 4)).toBe("even");
		expect(typologyKeyFor(rules, 0, 12, 3)).toBe("top");
		expect(typologyKeyFor(rules, 0, 13, 1)).toBeNull();
		expect(typologyKeyFor(rules, 1, 5, 1)).toBeNull();
	});

	test("includes both ends of the floor range", () => {
		const rules = [rule({ from: "3", to: "5" })];

		expect(
			[2, 3, 5, 6].map((floor) => typologyKeyFor(rules, 0, floor, 1)),
		).toEqual([null, "a", "a", null]);
	});
});
