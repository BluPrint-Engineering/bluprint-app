import { describe, expect, test } from "vitest";
import { floor, numberedFloors, tower, unitTypeOf } from "@/test/structureApi";
import { buildPlan } from "./buildPlan";
import { describeTower, newFloorsLead, towerNowLine } from "./towerNow";
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

		expect(now).toMatchObject({ floors: 0, numbered: [], position: 0 });
		expect(now.lastFloor).toBeUndefined();
	});

	test("sits the new floors after every floor and common area the tower has", () => {
		const now = describeTower(
			tower("Torre A", numberedFloors(1, 2, 2), ["Salão de festas"]),
		);

		expect(now.position).toBe(3);
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
			"A Torre B tem hoje 10 andares, do 1º ao 10º, com 4 unidades por andar.",
		);
	});

	test("drops the tower name when it is the only one", () => {
		expect(towerNowLine(tower("Torre A", numberedFloors(1, 1, 1)), false)).toBe(
			"A obra tem hoje 1 andar, do 1º ao 1º, com 1 unidade por andar.",
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
		).toBe("A Torre C tem hoje 1 andar.");
	});
});

describe("newFloorsLead", () => {
	test("tells where the floors enter", () => {
		expect(newFloorsLead(withCobertura(), true)).toBe(
			"Os andares entram acima do último andar da Torre B, com a mesma numeração.",
		);
		expect(newFloorsLead(withCobertura(), false)).toBe(
			"Os andares entram acima do último andar, com a mesma numeração.",
		);
		expect(newFloorsLead(tower("Torre C"), true)).toBe(
			"Os andares entram na Torre C, a partir do 1º.",
		);
	});
});

describe("extendedDraft", () => {
	test("continues from the last numbered floor, with the units and the hall of that floor", () => {
		const draft = extendedDraft(
			tower("Torre B", [
				...numberedFloors(1, 2, 3).map((each) => ({
					...each,
					commonAreas: [{ id: `hall-${each.name}`, name: "Hall" }],
				})),
				floor("Cobertura", ["301"]),
			]),
			[],
			true,
		);

		expect(draft.towers).toHaveLength(1);
		expect(draft.towers[0]).toMatchObject({
			name: "Torre B",
			first: "3",
			last: "",
			perFloor: "3",
			ground: false,
			hall: true,
		});
		expect(draft.numbering).toBe("digits");
	});

	test("starts at the 1º on a tower without floors", () => {
		const draft = extendedDraft(tower("Torre A"), [], false);

		expect(draft.towers[0]).toMatchObject({
			first: "1",
			perFloor: "",
			hall: true,
		});
		expect(draft.extend).toMatchObject({ takenFloors: [], named: false });
	});

	test("leaves the hall out when the last floor has none", () => {
		const draft = extendedDraft(
			tower("Torre A", numberedFloors(1, 2, 2)),
			[],
			true,
		);

		expect(draft.towers[0]?.hall).toBe(false);
	});

	test("keeps the project's tipologias and mirrors the finals of the last floor", () => {
		const a = unitTypeOf("Tipologia A", ["Sala", "Quarto"]);
		const b = unitTypeOf("Tipologia B", ["Sala"]);
		const draft = extendedDraft(
			tower("Torre B", [
				floor("1º andar", [
					{ name: "101", unitType: "Tipologia A" },
					{ name: "102", unitType: "Tipologia B" },
					{ name: "103", unitType: "Tipologia A" },
					{ name: "104", unitType: "Tipologia B" },
				]),
			]),
			[a, b],
			true,
		);

		expect(draft.unitTypes).toEqual([
			{
				key: a.id,
				name: "Tipologia A",
				rooms: ["Sala", "Quarto"],
				existing: true,
			},
			{ key: b.id, name: "Tipologia B", rooms: ["Sala"], existing: true },
		]);
		expect(
			draft.rules.map(({ finals, unitType }) => [finals, unitType]),
		).toEqual([
			["01, 03", a.id],
			["02, 04", b.id],
		]);
	});

	test("types every unit with the one tipologia the last floor uses", () => {
		const a = unitTypeOf("Tipologia A", []);
		const draft = extendedDraft(
			tower("Torre B", [
				floor("1º andar", [
					{ name: "101", unitType: "Tipologia A" },
					{ name: "102", unitType: "Tipologia A" },
				]),
			]),
			[a],
			true,
		);

		expect(draft.rules).toMatchObject([{ finals: "todos", unitType: a.id }]);
	});

	test("leaves the new units without tipologia when the last floor has none", () => {
		const draft = extendedDraft(
			tower("Torre B", numberedFloors(1, 2, 2)),
			[unitTypeOf("Tipologia A", [])],
			true,
		);

		expect(draft.rules).toEqual([]);
	});

	test("falls back to the first tipologia when the tower has no floor to mirror", () => {
		const a = unitTypeOf("Tipologia A", []);
		const b = unitTypeOf("Tipologia B", []);
		const draft = extendedDraft(tower("Torre A"), [a, b], false);

		expect(draft.rules).toMatchObject([{ finals: "todos", unitType: a.id }]);
	});

	test("starts a new Tipologia A when the project has none", () => {
		const draft = extendedDraft(tower("Torre A"), [], false);

		expect(draft.unitTypes).toMatchObject([{ name: "Tipologia A", rooms: [] }]);
		expect(draft.unitTypes[0]?.existing).toBeUndefined();
		expect(draft.rules).toHaveLength(1);
	});

	test("keeps the lettered numbering the tower already uses", () => {
		const draft = extendedDraft(
			tower("Torre A", [floor("1º andar", ["1A", "1B"])]),
			[],
			false,
		);

		expect(draft.numbering).toBe("letters");
	});
});

describe("buildPlan for added floors", () => {
	const typed = (name: string) => ({ name, unitType: "Tipologia A" });
	const existing = tower("Torre B", [
		floor("1º andar", [typed("101"), typed("102")]),
		floor("2º andar", [typed("201"), typed("202")]),
		floor("Cobertura", ["301"]),
	]);
	const type = unitTypeOf("Tipologia A", ["Sala"]);

	function plan(
		last: string,
		edit?: (draft: ReturnType<typeof extendedDraft>) => void,
	) {
		const draft = extendedDraft(existing, [type], true);
		draft.towers = draft.towers.map((each) => ({ ...each, last }));
		edit?.(draft);
		return { draft, plan: buildPlan(draft, identity) };
	}

	test("hangs the new floors under the tower that exists, numbered on from its last floor", () => {
		const { plan: built } = plan("4");

		const floors = built.locations.filter(({ type: kind }) => kind === "floor");
		expect(
			floors.map(({ name, parentId, position }) => [name, parentId, position]),
		).toEqual([
			["3º andar", existing.id, 3],
			["4º andar", existing.id, 4],
		]);
		expect(built.locations.some(({ type: kind }) => kind === "tower")).toBe(
			false,
		);
	});

	test("numbers the units from the new floor and gives them the existing tipologia", () => {
		const { plan: built } = plan("3");

		const units = built.locations.filter(({ type: kind }) => kind === "unit");
		expect(units.map(({ name, unitTypeId }) => [name, unitTypeId])).toEqual([
			["301", type.id],
			["302", type.id],
		]);
		expect(built.unitTypes).toEqual([]);
		expect(built.counts).toEqual({
			towers: 0,
			floors: 1,
			units: 2,
			commonAreas: 0,
		});
	});

	test("creates a tipologia that is new and refers to the existing one by its id", () => {
		const { plan: built, draft } = plan("3", (each) => {
			each.unitTypes.push({ key: "novo", name: "Cobertura", rooms: ["Sala"] });
			each.rules = [
				{
					key: "r1",
					tower: 0,
					finals: "01",
					from: "",
					to: "",
					unitType: type.id,
				},
				{
					key: "r2",
					tower: 0,
					finals: "02",
					from: "",
					to: "",
					unitType: "novo",
				},
			];
		});

		expect(draft.unitTypes).toHaveLength(2);
		expect(built.unitTypes.map(({ name }) => name)).toEqual(["Cobertura"]);
		const units = built.locations.filter(({ type: kind }) => kind === "unit");
		expect(units.map(({ unitTypeId }) => unitTypeId)).toEqual([
			type.id,
			built.unitTypes[0]?.id,
		]);
		expect(
			built.unitTypeCounts.map(({ name, units: count }) => [name, count]),
		).toEqual([
			["Tipologia A", 1],
			["Cobertura", 1],
		]);
	});

	test("puts a common area of one floor under the new floor and the hall in each new floor", () => {
		const { plan: built } = plan("4", (each) => {
			each.towers = each.towers.map((one) => ({ ...one, hall: true }));
			each.floorAreas = [{ key: "a", tower: 0, floor: "4", name: "Terraço" }];
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
		const draft = extendedDraft(existing, [], named);
		draft.towers = draft.towers.map((one) => ({ ...one, first, last }));
		return validateDraft(draft);
	}

	test("accepts floors above the last one", () => {
		expect(errorsFor("5", "6")).toEqual({});
	});

	test("refuses a floor the tower already has, by name", () => {
		expect(errorsFor("4", "6")).toEqual({
			"tower-0-first": "A Torre B já tem o 4º andar.",
		});
	});

	test("refuses a range that crosses an existing floor", () => {
		expect(Object.values(errorsFor("0", "9"))).toEqual([
			"O primeiro andar começa no 1º.",
		]);
		expect(errorsFor("3", "5")["tower-0-first"]).toBe(
			"A Torre B já tem o 3º andar.",
		);
	});

	test("speaks of the obra when the tower is the only one", () => {
		expect(errorsFor("2", "6", false)["tower-0-first"]).toBe(
			"A obra já tem o 2º andar.",
		);
	});
});
