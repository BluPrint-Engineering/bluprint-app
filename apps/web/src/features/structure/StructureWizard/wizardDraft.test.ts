import { buildPlan } from "./buildPlan";
import {
	type FloorAreaDraft,
	firstInvalidField,
	initialDraft,
	nextTowerName,
	type RangeDraft,
	restoreWizardDraft,
	ruleFieldId,
	storedWizardDraftSchema,
	storeWizardDraft,
	type TowerDraft,
	typologyFieldId,
	validateDraft,
	type WizardDraft,
	withNewRange,
	withNewRule,
	withNewTypology,
	withNumbering,
	withoutRange,
	withoutTypology,
	withRange,
	withTowerCount,
} from "./wizardDraft";

type RangeOf = Partial<Omit<RangeDraft, "key">>;

type TowerOf = Partial<Omit<TowerDraft, "ranges">> &
	RangeOf & { ranges?: RangeOf[] };

function draftOf(...towers: TowerOf[]): WizardDraft {
	return {
		...initialDraft(),
		towers: towers.map(
			({ ranges, first, last, finals, noUnits, ...tower }, index) => ({
				key: `tower-${index}`,
				name: `Torre ${String.fromCharCode(65 + index)}`,
				ground: true,
				hall: true,
				entranceTypology: null,
				hallTypology: null,
				...tower,
				ranges: (
					ranges ?? [
						{
							...(first !== undefined && { first }),
							...(last !== undefined && { last }),
							...(finals !== undefined && { finals }),
							...(noUnits !== undefined && { noUnits }),
						},
					]
				).map((range, at) => ({
					key: `range-${index}-${at}`,
					first: "1",
					last: "12",
					finals: "01, 04",
					noUnits: false,
					...range,
				})),
			}),
		),
	};
}

const finalsOf = (draft: WizardDraft) =>
	draft.towers.map((tower) => tower.ranges.map((range) => range.finals));

const unitNames = (draft: WizardDraft) =>
	buildPlan(draft, (key) => key)
		.locations.filter(({ type }) => type === "unit")
		.map(({ name }) => name);

function floorArea(
	floor: string,
	area: Partial<FloorAreaDraft> = {},
): FloorAreaDraft {
	return {
		key: `area-${floor}`,
		tower: 0,
		floor,
		name: "Terraço",
		typology: null,
		...area,
	};
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

describe("initialDraft", () => {
	test("starts one tower with one empty range, the ground floor and no hall on each floor", () => {
		const [tower] = initialDraft().towers;

		expect(tower).toMatchObject({ ground: true, hall: false });
		expect(tower?.ranges).toEqual([
			expect.objectContaining({
				first: "",
				last: "",
				finals: "",
				noUnits: false,
			}),
		]);
	});
});

describe("withTowerCount", () => {
	test("copies the previous tower's ranges and ground floor with the next letter, without the hall", () => {
		const draft = draftOf({
			name: "Torre A",
			hall: true,
			ground: false,
			ranges: [
				{ first: "2", last: "10", finals: "01, 02" },
				{ first: "11", last: "17", finals: "01", noUnits: false },
			],
		});

		const grown = withTowerCount(withTowerCount(draft, 2), 3);

		expect(grown.towers.map((tower) => tower.name)).toEqual([
			"Torre A",
			"Torre B",
			"Torre C",
		]);
		expect(grown.towers[2]).toMatchObject({ ground: false, hall: false });
		expect(
			grown.towers[2]?.ranges.map(({ first, last, finals }) => [
				first,
				last,
				finals,
			]),
		).toEqual([
			["2", "10", "01, 02"],
			["11", "17", "01"],
		]);
		const keys = grown.towers.flatMap((tower) =>
			tower.ranges.map(({ key }) => key),
		);
		expect(new Set(keys).size).toBe(keys.length);
	});

	test("keeps what the person already typed when the count goes down and up again", () => {
		const draft = withTowerCount(draftOf({}, { last: "8" }), 1);

		expect(draft.towers).toHaveLength(1);
		expect(withTowerCount(draft, 2).towers[1]?.ranges[0]?.last).toBe("12");
	});

	test("never goes below one tower", () => {
		expect(withTowerCount(draftOf({}), 0).towers).toHaveLength(1);
	});

	test("grows past a dozen towers", () => {
		expect(withTowerCount(draftOf({}), 30).towers).toHaveLength(30);
	});
});

describe("ranges in the draft", () => {
	test("starts a new range on the floor above the last one", () => {
		const draft = withNewRange(draftOf({ first: "2", last: "10" }), 0);

		expect(draft.towers[0]?.ranges[1]).toMatchObject({
			first: "11",
			last: "",
			finals: "",
			noUnits: false,
		});
	});

	test("leaves the first floor of a new range empty when the last one is not a floor", () => {
		const draft = withNewRange(draftOf({ first: "2", last: "1a" }), 0);

		expect(draft.towers[0]?.ranges[1]?.first).toBe("");
	});

	test("changes and takes out one range of one tower", () => {
		const draft = draftOf(
			{ ranges: [{ first: "1" }, { first: "13", last: "14" }] },
			{},
		);

		const changed = withRange(draft, 0, "range-0-1", { noUnits: true });
		expect(changed.towers[0]?.ranges[1]?.noUnits).toBe(true);
		expect(changed.towers[1]?.ranges[0]?.noUnits).toBe(false);

		const removed = withoutRange(changed, 0, "range-0-0");
		expect(removed.towers[0]?.ranges.map(({ key }) => key)).toEqual([
			"range-0-1",
		]);
	});
});

describe("withNumbering", () => {
	test("turns the typed finals into letters by position and back", () => {
		const draft = draftOf({
			ranges: [
				{ first: "2", last: "10", finals: "01, 02" },
				{ first: "11", last: "17", finals: "1 4" },
			],
		});

		const letters = withNumbering(draft, "letters").draft;
		if (!letters) throw new Error("refused");
		expect(letters.numbering).toBe("letters");
		expect(finalsOf(letters)).toEqual([["A, B", "A, D"]]);
		expect(unitNames(letters).slice(0, 2)).toEqual(["2A", "2B"]);

		const digits = withNumbering(letters, "digits").draft;
		if (!digits) throw new Error("refused");
		expect(finalsOf(digits)).toEqual([["01, 02", "01, 04"]]);
	});

	test("leaves finals that cannot be read as typed", () => {
		const draft = draftOf({ finals: "01, x" });

		expect(finalsOf(withNumbering(draft, "letters").draft ?? draft)).toEqual([
			["01, x"],
		]);
	});

	test("refuses letters when a range has more than 26 finals, naming the range", () => {
		const draft = draftOf(
			{ ranges: [{ finals: "01, 02" }, { first: "13", finals: "01, 28" }] },
			{},
		);

		expect(withNumbering(draft, "letters")).toEqual({
			refusal:
				"A faixa 2 da Torre A tem 28 finais. Com letras, o máximo é 26, de A a Z.",
		});
	});

	test("names the only tower Torre A in the refusal", () => {
		expect(
			withNumbering(draftOf({ name: "", finals: "01, 30" }), "letters").refusal,
		).toBe(
			"A faixa 1 da Torre A tem 30 finais. Com letras, o máximo é 26, de A a Z.",
		);
	});

	test.each([
		["27, 28", "28"],
		["05, 30", "30"],
	])(
		"refuses letters when finals %s go past Z, naming the highest final",
		(finals, highest) => {
			const draft = draftOf(
				{ ranges: [{ finals: "01, 02" }, { first: "13", finals }] },
				{},
			);

			expect(withNumbering(draft, "letters")).toEqual({
				refusal: `A faixa 2 da Torre A vai até o final ${highest}. Com letras, o máximo é 26, de A a Z.`,
			});
		},
	);

	test("keeps hidden finals past Z as typed through letters and back", () => {
		const draft = draftOf({
			ranges: [
				{ finals: "01, 02" },
				{ first: "13", finals: "05, 30", noUnits: true },
			],
		});

		const letters = withNumbering(draft, "letters").draft;
		if (!letters) throw new Error("refused");
		expect(finalsOf(letters)).toEqual([["A, B", "05, 30"]]);

		const digits = withNumbering(letters, "digits").draft;
		if (!digits) throw new Error("refused");
		expect(finalsOf(digits)).toEqual([["01, 02", "05, 30"]]);
	});
});

describe("validateDraft", () => {
	test("accepts a complete draft", () => {
		expect(validateDraft(draftOf({}, {}))).toEqual({});
	});

	test("asks for each empty field in portuguese", () => {
		expect(validateDraft(draftOf({ first: "", last: "", finals: "" }))).toEqual(
			{
				"range-0-0-first": "Informe o primeiro andar.",
				"range-0-0-last": "Informe o último andar.",
				"range-0-0-finals": "Informe os finais desta faixa.",
			},
		);
	});

	test.each([["2abc"], ["2.5"], ["0"], ["-1"]])(
		"refuses %s as a first floor",
		(first) => {
			expect(validateDraft(draftOf({ first }))).toEqual({
				"range-0-0-first": "Use um andar a partir do 1º.",
			});
		},
	);

	test("compares the last floor with the first and refuses one that is not a whole number", () => {
		expect(validateDraft(draftOf({ first: "5", last: "4" }))).toEqual({
			"range-0-0-last":
				"O último andar precisa ser igual ou maior que o primeiro.",
		});
		expect(validateDraft(draftOf({ last: "2.5" }))).toEqual({
			"range-0-0-last":
				"O último andar precisa ser igual ou maior que o primeiro.",
		});
		expect(validateDraft(draftOf({ first: "", last: "4" }))).toEqual({
			"range-0-0-first": "Informe o primeiro andar.",
		});
	});

	test.each([
		["digits", "01, x", "Use números de 1 a 30, como 01, 02."],
		["digits", "001", "Use números de 1 a 30, como 01, 02."],
		["digits", "00", "Use números de 1 a 30, como 01, 02."],
		["digits", "A, B", "Use números de 1 a 30, como 01, 02."],
		["letters", "01, 02", "Use letras de A a Z, como A, B."],
		["letters", "AB", "Use letras de A a Z, como A, B."],
		["digits", "01, 31", "De 1 a 30 unidades por andar."],
	] as const)("refuses %s finals %s", (numbering, finals, message) => {
		expect(validateDraft({ ...draftOf({ finals }), numbering })).toEqual({
			"range-0-0-finals": message,
		});
	});

	test("accepts finals separated by commas or spaces, in either case", () => {
		expect(validateDraft(draftOf({ finals: "1 3" }))).toEqual({});
		expect(
			validateDraft({ ...draftOf({ finals: "a,  c" }), numbering: "letters" }),
		).toEqual({});
	});

	test("needs no finals in a range without units", () => {
		expect(validateDraft(draftOf({ noUnits: true, finals: "" }))).toEqual({});
	});

	test("names the earlier range when two ranges share a floor", () => {
		const draft = draftOf({
			ranges: [
				{ first: "2", last: "10" },
				{ first: "10", last: "17" },
			],
		});

		expect(validateDraft(draft)).toEqual({
			"range-0-1-overlap":
				"O 10º andar já está na faixa 1. Cada andar fica numa faixa só.",
		});
		expect(firstInvalidField(draft, validateDraft(draft))).toEqual({
			id: "range-0-1-first",
			section: "towers",
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
});

describe("validateDraft on one-floor common areas", () => {
	test("accepts an area inside its tower's floors", () => {
		expect(validateDraft(withFloorAreas(draftOf({}), floorArea("12")))).toEqual(
			{},
		);
	});

	test("accepts an area on a floor without units", () => {
		const draft = withFloorAreas(
			draftOf({
				ranges: [{ last: "11" }, { first: "12", noUnits: true }],
			}),
			floorArea("12"),
		);

		expect(validateDraft(draft)).toEqual({});
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

	test("flags an area on a floor that falls between two ranges", () => {
		const draft = withFloorAreas(
			draftOf({
				ranges: [
					{ first: "2", last: "7" },
					{ first: "9", last: "10" },
				],
			}),
			floorArea("8", { key: "terrace" }),
		);

		expect(validateDraft(draft)).toEqual({
			"floor-area-terrace": "O 8º andar não está em nenhuma faixa da torre.",
		});
	});

	test("flags an area whose tower has no valid floors yet", () => {
		const draft = withFloorAreas(
			draftOf({ last: "" }),
			floorArea("5", { key: "terrace" }),
		);

		expect(validateDraft(draft)).toMatchObject({
			"range-0-0-last": "Informe o último andar.",
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

	test("points to a range field before a common area", () => {
		const draft = withFloorAreas(draftOf({ last: "" }), floorArea("5"));

		expect(firstInvalidField(draft, validateDraft(draft))).toEqual({
			id: "range-0-0-last",
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

describe("the team's hostile sequence", () => {
	test("keeps every step of the request true from typing to the overlap", () => {
		let draft = draftOf({
			ranges: [
				{ first: "2", last: "10", finals: "01, 02" },
				{ first: "11", last: "17", finals: "01" },
			],
		});
		draft = withTowerCount(draft, 2);
		draft = withRange(draft, 1, draft.towers[1]?.ranges[0]?.key ?? "", {
			finals: "01, 04",
		});
		draft = withoutRange(draft, 1, draft.towers[1]?.ranges[1]?.key ?? "");

		const letters = withNumbering(draft, "letters").draft;
		if (!letters) throw new Error("refused");
		expect(finalsOf(letters)).toEqual([["A, B", "A"], ["A, D"]]);
		expect(unitNames(letters).slice(0, 2)).toEqual(["2A", "2B"]);
		const back = withNumbering(letters, "digits").draft;
		if (!back) throw new Error("refused");
		expect(finalsOf(back)).toEqual([["01, 02", "01"], ["01, 04"]]);

		draft = withRange(back, 1, back.towers[1]?.ranges[0]?.key ?? "", {
			finals: "03, 04",
		});
		draft = {
			...draft,
			towers: draft.towers.map((tower, index) => ({
				...tower,
				ground: true,
				hall: index === 0,
			})),
		};
		let plan = buildPlan(draft, (key) => key);
		expect(plan.spend).toEqual({
			units: 25 + 18,
			floorHalls: 16,
			entranceHalls: 2,
			otherAreas: 0,
		});
		expect(unitNames(draft).filter((name) => name.startsWith("2"))).toEqual([
			"201",
			"202",
			"203",
			"204",
		]);

		draft = withNewRange(draft, 0);
		draft = withRange(draft, 0, draft.towers[0]?.ranges[2]?.key ?? "", {
			first: "10",
			last: "10",
			finals: "01",
		});
		plan = buildPlan(draft, (key) => key);
		expect(plan.towers[0]?.state).toBe("invalid");
		expect(plan.spend).toEqual({
			units: 18,
			floorHalls: 0,
			entranceHalls: 1,
			otherAreas: 0,
		});

		draft = withRange(draft, 0, draft.towers[0]?.ranges[2]?.key ?? "", {
			first: "18",
			last: "18",
			finals: "01, 28",
		});
		expect(withNumbering(draft, "letters").refusal).toBe(
			"A faixa 3 da Torre A tem 28 finais. Com letras, o máximo é 26, de A a Z.",
		);
	});
});

describe("typologies in the draft", () => {
	test("starts with one typology applied to every final and floor of the first tower", () => {
		const draft = initialDraft();

		expect(draft.typologies).toEqual([
			expect.objectContaining({ name: "Tipologia A", rooms: [] }),
		]);
		expect(draft.rules).toEqual([
			expect.objectContaining({
				tower: 0,
				finals: "todos",
				from: "",
				to: "",
				typology: draft.typologies[0]?.key,
			}),
		]);
	});

	test("copies the previous tower's rules to a new tower and drops them with the tower", () => {
		const draft = initialDraft();

		const three = withTowerCount(draft, 3);

		expect(three.rules.map((rule) => rule.tower)).toEqual([0, 1, 2]);
		expect(new Set(three.rules.map((rule) => rule.key)).size).toBe(3);
		expect(
			three.rules.every((rule) => rule.typology === draft.rules[0]?.typology),
		).toBe(true);
		expect(withTowerCount(three, 2).rules.map((rule) => rule.tower)).toEqual([
			0, 1,
		]);
		expect(withTowerCount(three, 1).rules.map((rule) => rule.tower)).toEqual([
			0,
		]);
	});

	test("adds a typology with the given name and kind", () => {
		const draft = withNewTypology(
			withNewTypology(initialDraft(), "Hall padrão", "common_area"),
			"Corredor",
			"common_area",
		);

		expect(
			draft.typologies.map(({ name, locationType }) => [name, locationType]),
		).toEqual([
			["Tipologia A", "unit"],
			["Hall padrão", "common_area"],
			["Corredor", "common_area"],
		]);
	});

	test("takes a typology out together with the rules that point at it", () => {
		const draft = withNewTypology(initialDraft(), "Tipologia B", "unit");
		const [first, second] = draft.typologies;

		const only = withoutTypology(draft, first?.key ?? "");

		expect(only.typologies).toEqual([second]);
		expect(only.rules).toEqual([]);
	});

	test("adds a rule for every final and floor of the first tower with the first typology", () => {
		const draft = withNewRule(initialDraft());

		expect(draft.rules).toHaveLength(2);
		expect(draft.rules[1]).toEqual(
			expect.objectContaining({
				tower: 0,
				finals: "todos",
				typology: draft.typologies[0]?.key,
			}),
		);
		expect(withNewRule({ ...draft, typologies: [] }).rules).toHaveLength(2);
	});

	test("asks for a typology's name and refuses one that repeats an earlier name", () => {
		const draft = withNewTypology(
			withNewTypology(initialDraft(), "Tipologia B", "unit"),
			"Tipologia C",
			"unit",
		);
		const [first, second, third] = draft.typologies;
		const named = {
			...draft,
			typologies: [
				first,
				{ ...second, name: "  " },
				{ ...third, name: " tipologia   a " },
			],
		} as WizardDraft;

		const errors = validateDraft(named);

		expect(errors[typologyFieldId(second?.key ?? "")]).toBe(
			"Informe o nome da tipologia.",
		);
		expect(errors[typologyFieldId(third?.key ?? "")]).toBe(
			"Esse nome já existe nesta obra.",
		);
		expect(errors[typologyFieldId(first?.key ?? "")]).toBeUndefined();
	});

	test("refuses finals that are not numbers and a last floor below the first", () => {
		const draft = initialDraft();
		const rule = draft.rules[0];
		const bad = {
			...draft,
			towers: draftOf({ last: "5" }).towers,
			rules: [{ ...rule, finals: "um", from: "5", to: "2" }],
		} as WizardDraft;

		const errors = validateDraft(bad);

		expect(errors[ruleFieldId(rule?.key ?? "", "finals")]).toBe(
			"Use números como 01, 03, ou escreva todos.",
		);
		expect(errors[ruleFieldId(rule?.key ?? "", "to")]).toBe(
			"O andar final precisa ser igual ou maior que o inicial.",
		);
		expect(errors[ruleFieldId(rule?.key ?? "", "from")]).toBeUndefined();
	});

	test("points firstInvalidField at the typologies section after the towers and areas", () => {
		const draft = withNewRule(initialDraft());
		const rule = draft.rules[1];
		const bad = {
			...draft,
			towers: draftOf({ last: "5" }).towers,
			rules: [draft.rules[0], { ...rule, finals: "x" }],
		} as WizardDraft;

		expect(firstInvalidField(bad, validateDraft(bad))).toEqual({
			id: ruleFieldId(rule?.key ?? "", "finals"),
			section: "types",
		});
	});

	test("accepts the starting draft once the first tower is described", () => {
		const draft = initialDraft();
		const [tower] = draft.towers;
		const filled = {
			...draft,
			towers: tower && [
				{
					...tower,
					ranges: tower.ranges.map((range) => ({
						...range,
						first: "1",
						last: "5",
						finals: "01, 02",
					})),
				},
			],
		} as WizardDraft;

		expect(validateDraft(filled)).toEqual({});
	});
});

describe("a draft restored after the tab reloaded", () => {
	const unique = (items: { key: string }[]) =>
		new Set(items.map(({ key }) => key)).size === items.length;

	test("gives new towers, typologies and rules keys it does not already hold", async () => {
		vi.resetModules();
		const firstPage = await import("./wizardDraft");
		const stored: unknown = JSON.parse(
			JSON.stringify(
				firstPage.storeWizardDraft(
					firstPage.withNewRule(firstPage.initialDraft()),
				),
			),
		);
		vi.resetModules();
		const reloaded = await import("./wizardDraft");

		const restored = reloaded.restoreWizardDraft(
			reloaded.storedWizardDraftSchema.parse(stored),
		);
		const grown = reloaded.withTowerCount(
			reloaded.withNewRange(
				reloaded.withNewRule(
					reloaded.withNewTypology(restored, "Tipologia B", "unit"),
				),
				0,
			),
			restored.towers.length + 1,
		);

		expect(unique(grown.towers)).toBe(true);
		expect(unique(grown.towers.flatMap((tower) => tower.ranges))).toBe(true);
		expect(unique(grown.typologies)).toBe(true);
		expect(unique(grown.rules)).toBe(true);
	});
});

describe("a stored draft", () => {
	test("reads back the ranges, finals as typed, the box without units and the numbering", () => {
		const draft = {
			...draftOf({
				ranges: [
					{ first: "2", last: "10", finals: "a, b" },
					{ first: "11", last: "11", finals: "", noUnits: true },
				],
			}),
			numbering: "letters" as const,
		};

		expect(
			restoreWizardDraft(
				storedWizardDraftSchema.parse(
					JSON.parse(JSON.stringify(storeWizardDraft(draft))),
				),
			),
		).toEqual(draft);
	});

	test("drops a draft of the format before floor ranges whole", () => {
		const draft = JSON.parse(JSON.stringify(draftOf({}))) as {
			towers: Record<string, unknown>[];
		};
		const old = {
			...draft,
			towers: draft.towers.map(({ ranges: _ranges, ...tower }) => ({
				...tower,
				first: "1",
				last: "12",
				perFloor: "4",
			})),
		};

		expect(storedWizardDraftSchema.safeParse(old).success).toBe(false);
	});

	test("drops a draft that kept the project's typologies whole", () => {
		const stored = {
			...storeWizardDraft(draftOf({})),
			typologies: [
				{
					key: "server-type-c",
					name: "Tipologia C",
					rooms: ["Sala"],
					locationType: "unit",
					existing: true,
				},
			],
		};

		expect(storedWizardDraftSchema.safeParse(stored).success).toBe(false);
	});

	test("reads back the typologies of the entrance, the floor hall and the common areas", () => {
		const draft: WizardDraft = {
			...draftOf({
				entranceTypology: "type-hall",
				hallTypology: "server-hall",
			}),
			projectAreas: [{ name: "Salão de festas", typology: "type-hall" }],
			towerAreas: [{ name: "Garagem", typology: null }],
			floorAreas: [
				{
					key: "area-1",
					tower: 0,
					floor: "3",
					name: "Lavanderia",
					typology: "server-hall",
				},
			],
			typologies: [
				{
					key: "type-hall",
					name: "Hall social",
					rooms: ["Piso"],
					locationType: "common_area",
				},
			],
		};

		expect(
			restoreWizardDraft(
				storedWizardDraftSchema.parse(
					JSON.parse(JSON.stringify(storeWizardDraft(draft))),
				),
			),
		).toEqual(draft);
	});

	test("drops a draft with a tower without ranges", () => {
		const draft = JSON.parse(JSON.stringify(draftOf({}))) as {
			towers: Record<string, unknown>[];
		};

		expect(
			storedWizardDraftSchema.safeParse({
				...draft,
				towers: draft.towers.map((tower) => ({ ...tower, ranges: [] })),
			}).success,
		).toBe(false);
	});
});
