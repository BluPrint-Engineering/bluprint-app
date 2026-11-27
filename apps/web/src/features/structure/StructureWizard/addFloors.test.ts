import { describe, expect, test } from "vitest";
import { floor, numberedFloors, tower, typologyOf } from "@/test/structureApi";
import { buildPlan } from "./buildPlan";
import { positionsForNewFloors } from "./floorPosition";
import {
	describeTower,
	extendFacts,
	newFloorsLead,
	towerNowLine,
} from "./towerNow";
import { extendedDraft, validateDraft } from "./wizardDraft";

const identity = (key: string) => key;

const withCobertura = () =>
	tower("Torre B", [
		floor("Térreo", [], ["Hall de entrada"]),
		...numberedFloors(1, 3, 2),
		floor("Cobertura", ["401", "402"]),
	]);

describe("describeTower", () => {
	test("finds the highest numbered floor even when a renamed floor sits above it", () => {
		const now = describeTower(withCobertura());

		expect(now.numbered).toEqual([1, 2, 3]);
		expect(now.lastFloor?.name).toBe("3º andar");
		expect(now.floors).toBe(5);
	});

	test("starts from nothing on a tower without floors", () => {
		const now = describeTower(tower("Torre A"));

		expect(now).toMatchObject({ floors: 0, numbered: [] });
		expect(now.lastFloor).toBeUndefined();
	});

	test("reads the lettered numbering from the units", () => {
		expect(
			describeTower(tower("Torre A", [floor("1º andar", ["1A", "1B"])]))
				.lettered,
		).toBe(true);
		expect(describeTower(withCobertura()).lettered).toBe(false);
	});
});

describe("towerNowLine", () => {
	test("says what the tower has today", () => {
		expect(towerNowLine(tower("Torre B", numberedFloors(1, 10, 4)), true)).toBe(
			"A Torre B tem hoje do 1º ao 10º andar. Use andares que ela ainda não tem.",
		);
	});

	test("drops the tower name when it is the only one", () => {
		expect(towerNowLine(tower("Torre A", numberedFloors(1, 1, 1)), false)).toBe(
			"A obra tem hoje o 1º andar. Use andares que ela ainda não tem.",
		);
	});

	test("repeats the article for each run of a tower with gaps", () => {
		expect(
			towerNowLine(
				tower("Torre A", [
					...numberedFloors(2, 7, 1),
					...numberedFloors(9, 10, 1),
				]),
				true,
			),
		).toBe(
			"A Torre A tem hoje do 2º ao 7º e do 9º ao 10º andar. Use andares que ela ainda não tem.",
		);
		expect(
			towerNowLine(
				tower("Torre A", [
					...numberedFloors(5, 5, 1),
					...numberedFloors(7, 7, 1),
				]),
				true,
			),
		).toBe(
			"A Torre A tem hoje o 5º e o 7º andar. Use andares que ela ainda não tem.",
		);
		expect(
			towerNowLine(
				tower("Torre A", [
					...numberedFloors(2, 3, 1),
					...numberedFloors(5, 5, 1),
				]),
				true,
			),
		).toBe(
			"A Torre A tem hoje do 2º ao 3º e o 5º andar. Use andares que ela ainda não tem.",
		);
	});

	test("says a tower without floors has none", () => {
		expect(towerNowLine(tower("Torre C"), true)).toBe(
			"A Torre C ainda não tem andares.",
		);
	});

	test("leaves the range out when no floor is numbered", () => {
		expect(
			towerNowLine(tower("Torre C", [floor("Térreo", [], ["Hall"])]), true),
		).toBe("A Torre C ainda não tem andares numerados.");
	});
});

describe("newFloorsLead", () => {
	test("tells where the floors enter", () => {
		expect(newFloorsLead(withCobertura(), true)).toBe(
			"Os andares novos entram na Torre B pela ordem do número, com as suas faixas e finais.",
		);
		expect(newFloorsLead(withCobertura(), false)).toBe(
			"Os andares novos entram na obra pela ordem do número, com as suas faixas e finais.",
		);
		expect(newFloorsLead(tower("Torre C"), true)).toBe(
			"Os andares novos entram na Torre C pela ordem do número, com as suas faixas e finais.",
		);
	});
});

describe("extendedDraft", () => {
	test("continues from the last numbered floor, with the units and the hall of that floor", () => {
		const draft = extendedDraft(
			tower("Torre B", [
				...numberedFloors(1, 2, 3).map((each) => ({
					...each,
					commonAreas: [
						{ id: `hall-${each.name}`, name: "Hall", typology: null },
					],
				})),
				floor("Cobertura", ["301"]),
			]),
			[],
		);

		expect(draft.towers).toHaveLength(1);
		expect(draft.towers[0]).toMatchObject({
			name: "Torre B",
			ground: false,
			hall: true,
		});
		expect(draft.towers[0]?.ranges).toEqual([
			expect.objectContaining({
				first: "3",
				last: "",
				finals: "",
				noUnits: false,
			}),
		]);
		expect(draft.extend).toEqual({ towerId: draft.extend?.towerId });
		expect(draft.numbering).toBe("digits");
	});

	test("starts at the 1º on a tower without floors", () => {
		const empty = tower("Torre A");
		const draft = extendedDraft(empty, []);

		expect(draft.towers[0]).toMatchObject({ hall: true });
		expect(draft.towers[0]?.ranges[0]).toMatchObject({
			first: "1",
			finals: "",
		});
		expect(draft.extend).toEqual({ towerId: empty.id });
	});

	test("selects the typology the highest numbered floor's Hall already follows", () => {
		const hall = typologyOf("Hall padrão", ["Circulação"], {
			locationType: "common_area",
		});
		const other = typologyOf("Corredor", [], { locationType: "common_area" });
		const draft = extendedDraft(
			tower("Torre B", [
				floor("1º andar", ["101"], [{ name: "Hall", typology: "Corredor" }]),
				floor("2º andar", ["201"], [{ name: "Hall", typology: "Hall padrão" }]),
			]),
			[hall, other],
		);

		expect(draft.towers[0]?.hall).toBe(true);
		expect(draft.towers[0]?.hallTypology).toBe(hall.id);
		expect(draft.typologies).toEqual([]);
	});

	test("leaves the hall out when the last floor has none", () => {
		const draft = extendedDraft(tower("Torre A", numberedFloors(1, 2, 2)), []);

		expect(draft.towers[0]?.hall).toBe(false);
	});

	test("keeps the project's tipologias and mirrors the finals of the last floor", () => {
		const a = typologyOf("Tipologia A", ["Sala", "Quarto"]);
		const b = typologyOf("Tipologia B", ["Sala"]);
		const draft = extendedDraft(
			tower("Torre B", [
				floor("1º andar", [
					{ name: "101", typology: "Tipologia A" },
					{ name: "102", typology: "Tipologia B" },
					{ name: "103", typology: "Tipologia A" },
					{ name: "104", typology: "Tipologia B" },
				]),
			]),
			[a, b],
		);

		expect(draft.typologies).toEqual([]);
		expect(
			draft.rules.map(({ finals, typology }) => [finals, typology]),
		).toEqual([
			["01, 03", a.id],
			["02, 04", b.id],
		]);
	});

	test("types every unit with the one tipologia the last floor uses", () => {
		const a = typologyOf("Tipologia A", []);
		const draft = extendedDraft(
			tower("Torre B", [
				floor("1º andar", [
					{ name: "101", typology: "Tipologia A" },
					{ name: "102", typology: "Tipologia A" },
				]),
			]),
			[a],
		);

		expect(draft.rules).toMatchObject([{ finals: "todos", typology: a.id }]);
	});

	test("leaves the new units without tipologia when the last floor has none", () => {
		const draft = extendedDraft(tower("Torre B", numberedFloors(1, 2, 2)), [
			typologyOf("Tipologia A", []),
		]);

		expect(draft.rules).toEqual([]);
	});

	test("falls back to the first tipologia when the tower has no floor to mirror", () => {
		const a = typologyOf("Tipologia A", []);
		const b = typologyOf("Tipologia B", []);
		const draft = extendedDraft(tower("Torre A"), [a, b]);

		expect(draft.rules).toMatchObject([{ finals: "todos", typology: a.id }]);
	});

	test("starts a new Tipologia A when the project has none", () => {
		const draft = extendedDraft(tower("Torre A"), []);

		expect(draft.typologies).toMatchObject([
			{ name: "Tipologia A", rooms: [], locationType: "unit" },
		]);
		expect(draft.rules).toHaveLength(1);
	});

	test("keeps the lettered numbering the tower already uses", () => {
		const draft = extendedDraft(
			tower("Torre A", [floor("1º andar", ["1A", "1B"])]),
			[],
		);

		expect(draft.numbering).toBe("letters");
		expect(draft.towers[0]?.ranges[0]?.finals).toBe("");
	});

	test("writes a single stack once", () => {
		const draft = extendedDraft(tower("Torre A", numberedFloors(1, 2, 1)), []);

		expect(draft.towers[0]?.ranges[0]).toMatchObject({
			first: "3",
			finals: "",
		});
	});
});

type Extended = ReturnType<typeof extendedDraft>;

function withTyped(
	draft: Extended,
	typed: { first?: string; last?: string; finals?: string },
): Extended {
	return {
		...draft,
		towers: draft.towers.map((one) => ({
			...one,
			ranges: one.ranges.map((range) => ({
				...range,
				finals: range.finals === "" ? "01, 02" : range.finals,
				...typed,
			})),
		})),
	};
}

const firstFieldOf = (draft: Extended) =>
	`${draft.towers[0]?.ranges[0]?.key}-first`;

describe("buildPlan for added floors", () => {
	const typed = (name: string) => ({ name, typology: "Tipologia A" });
	const existing = tower("Torre B", [
		floor("1º andar", [typed("101"), typed("102")]),
		floor("2º andar", [typed("201"), typed("202")]),
		floor("Cobertura", ["301"]),
	]);
	const type = typologyOf("Tipologia A", ["Sala"]);

	function plan(
		last: string,
		edit?: (draft: ReturnType<typeof extendedDraft>) => void,
	) {
		const draft = withTyped(extendedDraft(existing, [type]), { last });
		edit?.(draft);
		return {
			draft,
			plan: buildPlan(draft, identity, extendFacts(existing, true), [type]),
		};
	}

	test("hangs the new floors under the tower that exists, numbered on from its last floor", () => {
		const { plan: built } = plan("4");

		const floors = built.locations.filter(({ type: kind }) => kind === "floor");
		expect(
			floors.map(({ name, parentId, position }) => [name, parentId, position]),
		).toEqual([
			["3º andar", existing.id, 2],
			["4º andar", existing.id, 3],
		]);
		expect(built.locations.some(({ type: kind }) => kind === "tower")).toBe(
			false,
		);
	});

	test("numbers the units from the new floor and gives them the existing tipologia", () => {
		const { plan: built } = plan("3");

		const units = built.locations.filter(({ type: kind }) => kind === "unit");
		expect(units.map(({ name, typologyId }) => [name, typologyId])).toEqual([
			["301", type.id],
			["302", type.id],
		]);
		expect(built.typologies).toEqual([]);
		expect(built.counts).toEqual({
			towers: 0,
			floors: 1,
			units: 2,
			commonAreas: 0,
		});
	});

	test("creates a tipologia that is new and refers to the existing one by its id", () => {
		const { plan: built, draft } = plan("3", (each) => {
			each.typologies.push({
				key: "novo",
				name: "Cobertura",
				rooms: ["Sala"],
				locationType: "unit",
			});
			each.rules = [
				{
					key: "r1",
					tower: 0,
					finals: "01",
					from: "",
					to: "",
					typology: type.id,
				},
				{
					key: "r2",
					tower: 0,
					finals: "02",
					from: "",
					to: "",
					typology: "novo",
				},
			];
		});

		expect(draft.typologies).toHaveLength(1);
		expect(built.typologies.map(({ name }) => name)).toEqual(["Cobertura"]);
		const units = built.locations.filter(({ type: kind }) => kind === "unit");
		expect(units.map(({ typologyId }) => typologyId)).toEqual([
			type.id,
			built.typologies[0]?.id,
		]);
		expect(
			built.typologyCounts.map(({ name, units: count }) => [name, count]),
		).toEqual([
			["Tipologia A", 1],
			["Cobertura", 1],
		]);
	});

	test("puts a common area of one floor under the new floor and the hall in each new floor", () => {
		const { plan: built } = plan("4", (each) => {
			each.towers = each.towers.map((one) => ({ ...one, hall: true }));
			each.towers[0]?.ranges.forEach((range) => {
				range.finals = "01, 02";
			});
			each.floorAreas = [
				{ key: "a", tower: 0, floor: "4", name: "Terraço", typology: null },
			];
		});

		const areas = built.locations.filter(
			({ type: kind }) => kind === "common_area",
		);
		expect(areas.map(({ name }) => name)).toEqual(["Hall", "Hall", "Terraço"]);
		expect(
			built.towers[0]?.floors.map(({ label, added }) => [label, added]),
		).toEqual([
			["3º", true],
			["4º", true],
		]);
	});

	test("lists the tower under its real name", () => {
		expect(plan("3").plan.towers[0]?.name).toBe("Torre B");
	});
});

describe("validateDraft for added floors", () => {
	const existing = tower("Torre B", numberedFloors(1, 4, 2));

	function errorsFor(first: string, last: string, named = true) {
		const draft = withTyped(extendedDraft(existing, []), {
			first,
			last,
		});
		return {
			errors: validateDraft(draft, extendFacts(existing, named)),
			first: firstFieldOf(draft),
		};
	}

	test("accepts floors above the last one", () => {
		expect(errorsFor("5", "6").errors).toEqual({});
	});

	test("refuses a floor the tower already has, by name", () => {
		const { errors, first } = errorsFor("4", "6");

		expect(errors).toEqual({ [first]: "A Torre B já tem o 4º andar." });
	});

	test("refuses a range that crosses an existing floor", () => {
		expect(Object.values(errorsFor("0", "9").errors)).toEqual([
			"Use um andar a partir do 1º.",
		]);
		const { errors, first } = errorsFor("3", "5");
		expect(errors[first]).toBe("A Torre B já tem o 3º andar.");
	});

	test("speaks of the obra when the tower is the only one", () => {
		const { errors, first } = errorsFor("2", "6", false);

		expect(errors[first]).toBe("A obra já tem o 2º andar.");
	});

	test("refuses floors whose units a renamed top floor already has", () => {
		const draft = withTyped(extendedDraft(withCobertura(), []), {
			last: "5",
		});

		expect(draft.towers[0]?.ranges[0]?.first).toBe("4");
		expect(validateDraft(draft, extendFacts(withCobertura(), true))).toEqual({
			[firstFieldOf(draft)]:
				"A Torre B já tem a unidade 401. Use outro andar ou outros finais.",
		});
	});

	test("speaks of the obra when a unit clashes on the only tower", () => {
		const draft = withTyped(extendedDraft(withCobertura(), []), {
			last: "4",
		});

		expect(
			validateDraft(draft, extendFacts(withCobertura(), false))[
				firstFieldOf(draft)
			],
		).toBe("A obra já tem a unidade 401. Use outro andar ou outros finais.");
	});

	test("accepts floors above the units of a renamed top floor", () => {
		const draft = withTyped(extendedDraft(withCobertura(), []), {
			first: "5",
			last: "6",
		});

		expect(validateDraft(draft, extendFacts(withCobertura(), true))).toEqual(
			{},
		);
	});
});

describe("a new floor's place among the ones the tower has", () => {
	const stored = tower("Torre A", [
		floor("Térreo", [], ["Hall de entrada"], 0),
		floor("2º andar", ["201"], [], 1),
		floor("3º andar", ["301"], [], 2),
		floor("4º andar", ["401"], [], 3),
		floor("5º andar", ["501"], [], 4),
		floor("6º andar", ["601"], [], 5),
		floor("7º andar", ["701"], [], 6),
		floor("9º andar", ["901"], [], 7),
		floor("10º andar", ["1001"], [], 8),
		floor("Cobertura", ["Cob 1"], [], 9),
	]);

	function added(ranges: { first: string; last: string; finals: string }[]) {
		const draft = extendedDraft(stored, []);
		const one = draft.towers[0];
		if (!one) throw new Error("no tower");
		one.ranges = ranges.map((range) => ({
			key: `r-${range.first}`,
			...range,
			noUnits: range.finals === "",
		}));
		return buildPlan(draft, identity, extendFacts(stored, true));
	}

	test("puts the 1º before the 2º and the 8º between the 7º and the 9º", () => {
		const built = added([
			{ first: "8", last: "8", finals: "01" },
			{ first: "1", last: "1", finals: "01" },
		]);

		expect(
			built.locations
				.filter(({ type }) => type === "floor")
				.map(({ name, position }) => [name, position]),
		).toEqual([
			["1º andar", 1],
			["8º andar", 8],
		]);
	});

	test("uses the same positions when a removed floor left a gap", () => {
		const holed = tower("Torre A", [
			floor("Térreo", [], ["Hall de entrada"], 0),
			floor("2º andar", ["201"], [], 1),
			floor("3º andar", ["301"], [], 2),
			floor("5º andar", ["501"], [], 4),
			floor("6º andar", ["601"], [], 5),
			floor("7º andar", ["701"], [], 6),
			floor("9º andar", ["901"], [], 7),
			floor("10º andar", ["1001"], [], 8),
			floor("Cobertura", ["Cob 1"], [], 9),
		]);
		const draft = extendedDraft(holed, []);
		const one = draft.towers[0];
		if (!one) throw new Error("no tower");
		one.ranges = [
			{ key: "low", first: "1", last: "1", finals: "01", noUnits: false },
			{ key: "mid", first: "8", last: "8", finals: "01", noUnits: false },
		];

		expect(
			positionsForNewFloors(extendFacts(holed, true).storedFloors, [8, 1]),
		).toEqual(
			new Map([
				[1, 1],
				[8, 8],
			]),
		);
		expect(
			buildPlan(draft, identity, extendFacts(holed, true))
				.locations.filter(({ type }) => type === "floor")
				.map(({ name, position }) => [name, position]),
		).toEqual([
			["1º andar", 1],
			["8º andar", 8],
		]);
	});

	test("aims at the floor after the gap so a floor filling a hole still pushes the ones above", () => {
		const holed = tower("Torre A", [
			floor("Térreo", [], ["Hall de entrada"], 0),
			floor("1º andar", ["101"], [], 1),
			floor("2º andar", ["201"], [], 2),
			floor("3º andar", ["301"], [], 3),
			floor("5º andar", ["501"], [], 5),
			floor("6º andar", ["601"], [], 6),
			floor("7º andar", ["701"], [], 7),
			floor("8º andar", ["801"], [], 8),
			floor("9º andar", ["901"], [], 9),
			floor("10º andar", ["1001"], [], 10),
			floor("Cobertura", ["Cob 1"], [], 11),
		]);
		const draft = extendedDraft(holed, []);
		const one = draft.towers[0];
		if (!one) throw new Error("no tower");
		one.ranges = [
			{ key: "hole", first: "4", last: "4", finals: "01", noUnits: false },
			{ key: "top", first: "11", last: "11", finals: "01", noUnits: false },
		];

		expect(
			buildPlan(draft, identity, extendFacts(holed, true))
				.locations.filter(({ type }) => type === "floor")
				.map(({ name, position }) => [name, position]),
		).toEqual([
			["4º andar", 5],
			["11º andar", 12],
		]);
	});

	test("refuses the 9º the tower already has and a final a renamed unit already uses", () => {
		const draft = extendedDraft(stored, []);
		const one = draft.towers[0];
		if (!one) throw new Error("no tower");
		one.ranges = [
			{ key: "nine", first: "9", last: "9", finals: "01", noUnits: false },
		];

		expect(validateDraft(draft, extendFacts(stored, true))).toEqual({
			"nine-first": "A Torre A já tem o 9º andar.",
		});

		const renamed = tower("Torre A", [floor("10º andar", ["1101"], [], 0)]);
		const again = extendedDraft(renamed, []);
		const range = again.towers[0]?.ranges[0];
		if (!range) throw new Error("no range");
		range.last = "11";
		range.finals = "01";

		expect(validateDraft(again, extendFacts(renamed, true))).toEqual({
			[`${range.key}-first`]:
				"A Torre A já tem a unidade 1101. Use outro andar ou outros finais.",
		});
	});

	test("speaks of the obra when the only tower already has the unit", () => {
		const renamed = tower("Torre A", [floor("12º andar", ["1301"], [], 0)]);
		const draft = extendedDraft(renamed, []);
		const range = draft.towers[0]?.ranges[0];
		if (!range) throw new Error("no range");
		range.last = "13";
		range.finals = "01";

		expect(validateDraft(draft, extendFacts(renamed, false))).toEqual({
			[`${range.key}-first`]:
				"A obra já tem a unidade 1301. Use outro andar ou outros finais.",
		});
	});
});
