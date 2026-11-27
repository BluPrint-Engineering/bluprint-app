import {
	type AssignmentRule,
	assignUnits,
	blockedRules,
	cleanRules,
	type DraftTowerShape,
	type DraftUnit,
	ruleOptions,
	type UnitOutcome,
} from "./assignmentRules";

const rule = (rest: Partial<AssignmentRule> = {}): AssignmentRule => ({
	key: "r1",
	towers: ["A"],
	finals: "all",
	fromFloor: null,
	toFloor: null,
	typology: "a",
	...rest,
});

const shape = (
	key: string,
	finals: number[],
	floors: number[] = [1, 2],
): DraftTowerShape => ({ key, finals, floors });

const unitsOf = (draft: DraftTowerShape[]): DraftUnit[] =>
	draft.flatMap((tower) =>
		tower.floors.flatMap((floor) =>
			tower.finals.map((final) => ({ tower: tower.key, floor, final })),
		),
	);

const label = (outcome: UnitOutcome): string => {
	if (outcome.kind === "none") return "none";
	if (outcome.kind === "typology") return outcome.typology;
	return `conflict(${outcome.ruleKeys.join("+")})`;
};

const tableOf = (units: DraftUnit[], rules: AssignmentRule[]) => {
	const table: Record<string, Record<string, string>> = {};
	for (const { unit, outcome } of assignUnits(units, rules).units) {
		const row = table[unit.tower] ?? {};
		table[unit.tower] = row;
		const stack = String(unit.final).padStart(2, "0");
		const seen = row[stack];
		row[stack] =
			seen === undefined || seen === label(outcome)
				? label(outcome)
				: `${seen}/${label(outcome)}`;
	}
	return table;
};

const towerA = shape("A", [1, 2]);
const towerB = shape("B", [1, 2, 3, 4]);
const towerC = shape("C", [1]);

describe("what one unit receives", () => {
	const unit: DraftUnit = { tower: "A", floor: 3, final: 2 };

	test.each([
		[
			"no rule reaches it",
			[rule({ key: "r1", towers: ["B"] })],
			{ kind: "none" },
		],
		[
			"one rule reaches it",
			[rule({ key: "r1", typology: "studio" })],
			{ kind: "typology", typology: "studio" },
		],
		[
			"two rules with different typologies reach it",
			[
				rule({ key: "r1", typology: "studio" }),
				rule({ key: "r2", typology: "loft" }),
			],
			{ kind: "conflict", ruleKeys: ["r1", "r2"] },
		],
		[
			"two rules with the same typology reach it",
			[
				rule({ key: "r1", typology: "studio" }),
				rule({ key: "r2", typology: "studio" }),
			],
			{ kind: "conflict", ruleKeys: ["r1", "r2"] },
		],
	])("%s", (_name, rules, expected) => {
		expect(assignUnits([unit], rules).units[0]?.outcome).toEqual(expected);
	});

	test.each([
		["a tower that is not in the rule", rule({ towers: ["B"] }), false],
		["a stack that is not in the rule", rule({ finals: [1] }), false],
		["a stack in the rule", rule({ finals: [1, 2] }), true],
		["a floor below the first floor", rule({ fromFloor: 4 }), false],
		["a floor above the last floor", rule({ toFloor: 2 }), false],
		["the first floor itself", rule({ fromFloor: 3 }), true],
		["the last floor itself", rule({ toFloor: 3 }), true],
		["an open range", rule({ fromFloor: null, toFloor: null }), true],
	])("%s", (_name, candidate, reached) => {
		expect(assignUnits([unit], [candidate]).reach.r1).toBe(reached ? 1 : 0);
	});
});

describe("the hostile sequence", () => {
	const everyTower = (typology: string, key = "r1") =>
		rule({ key, towers: ["A", "B"], finals: "all", typology });

	test("1. a rule for every tower and stack gives every unit its typology", () => {
		expect(tableOf(unitsOf([towerA, towerB]), [everyTower("a")])).toEqual({
			A: { "01": "a", "02": "a" },
			B: { "01": "a", "02": "a", "03": "a", "04": "a" },
		});
	});

	test("2. a tower that enters the draft without entering the rule gets nothing", () => {
		expect(
			tableOf(unitsOf([towerA, towerB, towerC]), [everyTower("a")]),
		).toEqual({
			A: { "01": "a", "02": "a" },
			B: { "01": "a", "02": "a", "03": "a", "04": "a" },
			C: { "01": "none" },
		});
	});

	const rule2 = rule({
		key: "r2",
		towers: ["B"],
		finals: [3, 4],
		typology: "b",
	});
	const draft = [towerA, towerB, towerC];
	const expectedConflict = {
		A: { "01": "a", "02": "a" },
		B: {
			"01": "a",
			"02": "a",
			"03": "conflict(r1+r2)",
			"04": "conflict(r1+r2)",
		},
		C: { "01": "none" },
	};

	test("3. a second rule conflicts only on stacks 03 and 04 of tower B", () => {
		expect(tableOf(unitsOf(draft), [everyTower("a"), rule2])).toEqual(
			expectedConflict,
		);
	});

	test("4. reversing the order of the rules changes nothing", () => {
		expect(tableOf(unitsOf(draft), [rule2, everyTower("a")])).toEqual(
			expectedConflict,
		);
		expect(
			assignUnits(unitsOf(draft), [rule2, everyTower("a")]).conflicts,
		).toEqual(assignUnits(unitsOf(draft), [everyTower("a"), rule2]).conflicts);
	});

	test("5. taking tower B out of rule 1 ends the conflict and leaves stacks 01 and 02 of B without typology", () => {
		const first = rule({
			key: "r1",
			towers: ["A"],
			finals: "all",
			typology: "a",
		});
		const result = assignUnits(unitsOf(draft), [first, rule2]);
		expect(result.conflicts).toEqual([]);
		expect(tableOf(unitsOf(draft), [first, rule2])).toEqual({
			A: { "01": "a", "02": "a" },
			B: { "01": "none", "02": "none", "03": "b", "04": "b" },
			C: { "01": "none" },
		});
	});

	test("6. a rule for tower A at stack 04 reaches no unit and does not block", () => {
		const rule3 = rule({
			key: "r3",
			towers: ["A"],
			finals: [4],
			typology: "c",
		});
		const rules = [rule({ key: "r1", towers: ["A"] }), rule2, rule3];
		expect(assignUnits(unitsOf(draft), rules).reach.r3).toBe(0);
		expect(blockedRules(rules, unitsOf(draft))).toEqual([]);
	});

	test("7. cleaning with tower B cut to stacks 01 and 02 leaves rule 2 without a stack and blocked", () => {
		const shortB = [towerA, shape("B", [1, 2]), towerC];
		const cleaned = cleanRules([everyTower("a"), rule2], shortB);
		expect(cleaned).toEqual([everyTower("a"), { ...rule2, finals: [] }]);
		expect(blockedRules(cleaned, unitsOf(shortB))).toEqual([
			{ ruleKey: "r2", reason: "no-final" },
		]);
	});

	test("8. cleaning without tower B takes it out of every rule and blocks rule 2 for having no tower", () => {
		const withoutB = [towerA, towerC];
		const cleaned = cleanRules([everyTower("a"), rule2], withoutB);
		expect(cleaned.map((each) => each.towers)).toEqual([["A"], []]);
		expect(blockedRules(cleaned, unitsOf(withoutB))).toEqual([
			{ ruleKey: "r2", reason: "no-tower" },
		]);
	});

	test("9. the same two rules fighting in towers A and B give one conflict per tower", () => {
		const first = rule({ key: "r1", towers: ["A", "B"], typology: "a" });
		const second = rule({
			key: "r2",
			towers: ["A", "B"],
			finals: [2, 3],
			typology: "b",
		});
		expect(assignUnits(unitsOf(draft), [first, second]).conflicts).toEqual([
			{ ruleKeys: ["r1", "r2"], tower: "A", finals: [2], floors: [1, 2] },
			{ ruleKeys: ["r1", "r2"], tower: "B", finals: [2, 3], floors: [1, 2] },
		]);
	});
});

describe("conflicts", () => {
	test("list the floors and stacks in conflict, not every floor of the tower", () => {
		const draft = [shape("A", [1, 2], [1, 2, 3, 4])];
		const rules = [
			rule({ key: "r1", typology: "a" }),
			rule({ key: "r2", finals: [2], fromFloor: 3, toFloor: 4, typology: "b" }),
		];
		expect(assignUnits(unitsOf(draft), rules).conflicts).toEqual([
			{ ruleKeys: ["r1", "r2"], tower: "A", finals: [2], floors: [3, 4] },
		]);
	});

	test("three rules on one unit give one entry per pair of rules", () => {
		const draft = [shape("A", [1], [1])];
		const rules = [
			rule({ key: "r3" }),
			rule({ key: "r1" }),
			rule({ key: "r2" }),
		];
		expect(
			assignUnits(unitsOf(draft), rules).conflicts.map((c) => c.ruleKeys),
		).toEqual([
			["r1", "r2"],
			["r1", "r3"],
			["r2", "r3"],
		]);
	});

	test("a unit in conflict counts for every rule that reaches it", () => {
		const draft = [towerA];
		const rules = [
			rule({ key: "r1" }),
			rule({ key: "r2", finals: [1] }),
			rule({ key: "r3", towers: ["B"] }),
		];
		expect(assignUnits(unitsOf(draft), rules).reach).toEqual({
			r1: 4,
			r2: 2,
			r3: 0,
		});
	});

	test("block the rules that take part in one, even with the same typology", () => {
		const rules = [
			rule({ key: "r1", typology: "a" }),
			rule({ key: "r2", typology: "a" }),
			rule({ key: "r3", towers: ["B"] }),
		];
		expect(blockedRules(rules, unitsOf([towerA, towerB]))).toEqual([
			{ ruleKey: "r1", reason: "conflict" },
			{ ruleKey: "r2", reason: "conflict" },
		]);
	});
});

describe("cleanRules", () => {
	test("send a floor bound that no tower of the rule has back to open", () => {
		const cleaned = cleanRules(
			[rule({ fromFloor: 12, toFloor: 8 })],
			[shape("A", [1, 2], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])],
		);
		expect(cleaned[0]?.fromFloor).toBeNull();
		expect(cleaned[0]?.toFloor).toBe(8);
	});

	test("keep a floor bound that one of the towers of the rule still has", () => {
		const cleaned = cleanRules(
			[rule({ towers: ["A", "B"], fromFloor: 12 })],
			[shape("A", [1], [1, 2]), shape("B", [1], [11, 12])],
		);
		expect(cleaned[0]?.fromFloor).toBe(12);
	});

	test("keep every stack for a rule that is for all of them", () => {
		const cleaned = cleanRules([rule({ finals: "all" })], [shape("A", [1])]);
		expect(cleaned[0]?.finals).toBe("all");
	});

	test("drop a stack that no tower of the rule has, and keep one that some tower has", () => {
		const cleaned = cleanRules(
			[rule({ towers: ["A", "B"], finals: [1, 3, 4] })],
			[shape("A", [1, 2]), shape("B", [1, 2, 3]), shape("C", [4])],
		);
		expect(cleaned[0]?.finals).toEqual([1, 3]);
	});

	test("leave the rules as they are when the draft still has everything", () => {
		const rules = [
			rule({ towers: ["A", "B"], finals: [1, 2], fromFloor: 1, toFloor: 2 }),
		];
		expect(cleanRules(rules, [towerA, towerB])).toEqual(rules);
	});
});

describe("blockedRules", () => {
	test("do not block a complete rule that reaches no unit", () => {
		expect(blockedRules([rule({ fromFloor: 50 })], unitsOf([towerA]))).toEqual(
			[],
		);
	});

	test("do not block a stack that one of the towers of the rule lacks", () => {
		const rules = [rule({ towers: ["A", "B"], finals: [3] })];
		expect(blockedRules(rules, unitsOf([towerA, towerB]))).toEqual([]);
		expect(assignUnits(unitsOf([towerA, towerB]), rules).reach.r1).toBe(2);
	});

	test("name the missing tower before the missing stack", () => {
		expect(
			blockedRules([rule({ towers: [], finals: [] })], unitsOf([towerA])),
		).toEqual([{ ruleKey: "r1", reason: "no-tower" }]);
	});
});

describe("ruleOptions", () => {
	test("are the union of the stacks and floors of the towers of the rule", () => {
		expect(
			ruleOptions(
				["A", "B"],
				[
					shape("A", [1, 2], [1, 2, 3]),
					shape("B", [1, 2, 3, 4], [2, 3, 4, 5]),
					shape("C", [9], [9]),
				],
			),
		).toEqual({ finals: [1, 2, 3, 4], floors: [1, 2, 3, 4, 5] });
	});

	test("are empty for a rule without towers", () => {
		expect(ruleOptions([], [towerA])).toEqual({ finals: [], floors: [] });
	});
});
