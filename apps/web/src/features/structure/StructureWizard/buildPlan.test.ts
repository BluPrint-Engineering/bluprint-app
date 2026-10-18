import { buildPlan } from "./buildPlan";
import { initialDraft, unitName, type WizardDraft } from "./wizardDraft";

const identity = (key: string) => key;

function draftOf(
	towers: Partial<WizardDraft["towers"][number]>[],
	rest: Partial<WizardDraft> = {},
): WizardDraft {
	return {
		...initialDraft(),
		towers: towers.map((tower, index) => ({
			key: `tower-${index}`,
			name: `Torre ${String.fromCharCode(65 + index)}`,
			first: "1",
			last: "3",
			perFloor: "2",
			ground: false,
			hall: false,
			...tower,
		})),
		...rest,
	};
}

const namesOf = (
	plan: ReturnType<typeof buildPlan>,
	type: "tower" | "floor" | "unit" | "common_area",
) =>
	plan.locations
		.filter((location) => location.type === type)
		.map((location) => location.name);

describe("unitName", () => {
	test("joins the floor and the stack with two digits", () => {
		expect(unitName(1, 0, "digits")).toBe("101");
		expect(unitName(12, 3, "digits")).toBe("1204");
		expect(unitName(9, 29, "digits")).toBe("930");
	});

	test("joins the floor and a letter", () => {
		expect(unitName(1, 0, "letters")).toBe("1A");
		expect(unitName(12, 3, "letters")).toBe("12D");
		expect(unitName(2, 25, "letters")).toBe("2Z");
		expect(unitName(2, 26, "letters")).toBe("2AA");
	});
});

describe("buildPlan", () => {
	test("names a single tower Torre A whatever the draft says", () => {
		const plan = buildPlan(draftOf([{ name: "Qualquer" }]), identity);

		expect(namesOf(plan, "tower")).toEqual(["Torre A"]);
		expect(plan.towers[0]?.name).toBe("Torre A");
	});

	test("names several towers as typed", () => {
		const plan = buildPlan(
			draftOf([{ name: "Norte" }, { name: " Sul " }]),
			identity,
		);

		expect(namesOf(plan, "tower")).toEqual(["Norte", "Sul"]);
	});

	test("names floors and numbers units by floor and stack", () => {
		const plan = buildPlan(
			draftOf([{ first: "9", last: "10", perFloor: "3" }]),
			identity,
		);

		expect(namesOf(plan, "floor")).toEqual(["9º andar", "10º andar"]);
		expect(namesOf(plan, "unit")).toEqual([
			"901",
			"902",
			"903",
			"1001",
			"1002",
			"1003",
		]);
	});

	test("numbers units with letters", () => {
		const plan = buildPlan(
			draftOf([{ first: "1", last: "2", perFloor: "2" }], {
				numbering: "letters",
			}),
			identity,
		);

		expect(namesOf(plan, "unit")).toEqual(["1A", "1B", "2A", "2B"]);
	});

	test("puts a ground floor with an entrance hall below the first floor", () => {
		const plan = buildPlan(draftOf([{ ground: true }]), identity);

		expect(namesOf(plan, "floor")).toEqual([
			"Térreo",
			"1º andar",
			"2º andar",
			"3º andar",
		]);
		expect(plan.towers[0]?.floors[0]).toMatchObject({
			label: "Térreo",
			units: [],
			areas: [{ name: "Hall de entrada" }],
		});
		const ground = plan.locations.find(
			(location) => location.name === "Térreo",
		);
		const entrance = plan.locations.find(
			(location) => location.name === "Hall de entrada",
		);
		expect(entrance?.parentId).toBe(ground?.id);
		expect(ground?.position).toBe(0);
	});

	test("puts a hall on every numbered floor but not twice on the ground floor", () => {
		const plan = buildPlan(draftOf([{ ground: true, hall: true }]), identity);

		expect(namesOf(plan, "common_area")).toEqual([
			"Hall de entrada",
			"Hall",
			"Hall",
			"Hall",
		]);
	});

	test("adds the areas of the project, of each tower and of one floor", () => {
		const plan = buildPlan(
			draftOf([{ last: "2" }, { last: "2" }], {
				projectAreas: ["Guarita"],
				towerAreas: ["Salão de festas"],
				floorAreas: [{ key: "a", tower: 1, floor: "2", name: "Terraço" }],
			}),
			identity,
		);

		const areas = plan.locations.filter(
			(location) => location.type === "common_area",
		);
		expect(areas.map((area) => area.name).sort()).toEqual([
			"Guarita",
			"Salão de festas",
			"Salão de festas",
			"Terraço",
		]);
		const terrace = areas.find((area) => area.name === "Terraço");
		const floor = plan.locations.find(
			(location) => location.id === terrace?.parentId,
		);
		expect(floor).toMatchObject({ name: "2º andar", type: "floor" });
		expect(
			plan.locations.find((location) => location.id === floor?.parentId)?.name,
		).toBe("Torre B");
		expect(
			plan.towers[1]?.floors.at(-1)?.areas.map((area) => area.name),
		).toEqual(["Terraço"]);
	});

	test("drops the areas of each tower when there is a single tower", () => {
		const plan = buildPlan(
			draftOf([{}], { towerAreas: ["Salão de festas"] }),
			identity,
		);

		expect(namesOf(plan, "common_area")).toEqual([]);
	});

	test("ignores a floor area whose tower or floor is not in the plan", () => {
		const plan = buildPlan(
			draftOf([{ last: "2" }], {
				floorAreas: [
					{ key: "a", tower: 3, floor: "1", name: "Fantasma" },
					{ key: "b", tower: 0, floor: "9", name: "Longe" },
				],
			}),
			identity,
		);

		expect(namesOf(plan, "common_area")).toEqual([]);
	});

	test("lists a parent before its children and keeps positions per parent", () => {
		const plan = buildPlan(
			draftOf([{ ground: true, hall: true }], { projectAreas: ["Guarita"] }),
			identity,
		);

		const seen = new Set<string>();
		for (const location of plan.locations) {
			if (location.parentId !== null)
				expect(seen.has(location.parentId)).toBe(true);
			seen.add(location.id);
		}
		const floor = plan.locations.find(
			(location) => location.name === "1º andar",
		);
		const children = plan.locations
			.filter((location) => location.parentId === floor?.id)
			.map((location) => [location.name, location.position]);
		expect(children).toEqual([
			["101", 0],
			["102", 1],
			["Hall", 2],
		]);
		const roots = plan.locations
			.filter((location) => location.parentId === null)
			.map((location) => [location.name, location.position]);
		expect(roots).toEqual([
			["Torre A", 0],
			["Guarita", 1],
		]);
	});

	test("counts towers, floors, units and common areas", () => {
		const plan = buildPlan(
			draftOf(
				[
					{ ground: true, hall: true },
					{ ground: true, hall: true },
				],
				{
					projectAreas: ["Guarita"],
					towerAreas: ["Salão de festas"],
				},
			),
			identity,
		);

		expect(plan.counts).toEqual({
			towers: 2,
			floors: 8,
			units: 12,
			commonAreas: 11,
		});
		expect(plan.locations).toHaveLength(2 + 8 + 12 + 11);
	});

	test("leaves out a tower whose fields are not valid yet", () => {
		const plan = buildPlan(draftOf([{}, { last: "" }]), identity);

		expect(plan.towers.map((tower) => tower.valid)).toEqual([true, false]);
		expect(namesOf(plan, "tower")).toEqual(["Torre A"]);
	});

	test("asks for one id per location and reuses the same id for the same key", () => {
		const ids = new Map<string, string>();
		let next = 0;
		const idFor = (key: string) => {
			let id = ids.get(key);
			if (!id) {
				id = `id-${next++}`;
				ids.set(key, id);
			}
			return id;
		};

		const draft = draftOf([{ hall: true }]);
		const first = buildPlan(draft, idFor);
		const again = buildPlan(draft, idFor);

		expect(again.locations).toEqual(first.locations);
		expect(again.unitTypes).toEqual(first.unitTypes);
		expect(new Set(first.locations.map((location) => location.id)).size).toBe(
			first.locations.length,
		);
	});
});

const typeOf = (key: string, name: string, rooms: string[] = []) => ({
	key,
	name,
	rooms,
});

const ruleOf = (
	unitType: string,
	rest: Partial<WizardDraft["rules"][number]> = {},
) => ({
	key: `rule-${unitType}-${Math.random()}`,
	tower: 0,
	finals: "todos",
	from: "",
	to: "",
	unitType,
	...rest,
});

const typesOfUnits = (plan: ReturnType<typeof buildPlan>) =>
	plan.towers.flatMap((tower) =>
		tower.floors.flatMap((floor) =>
			floor.units.map((unit) => `${unit.name}:${unit.unitType ?? "-"}`),
		),
	);

describe("buildPlan unit types", () => {
	test("applies the starting unit type to every unit of every floor", () => {
		const plan = buildPlan(draftOf([{ last: "2", perFloor: "2" }]), identity);

		expect(typesOfUnits(plan)).toEqual([
			"101:Tipologia A",
			"102:Tipologia A",
			"201:Tipologia A",
			"202:Tipologia A",
		]);
		expect(plan.untyped).toBe(0);
		expect(plan.unitTypeCounts).toEqual([
			expect.objectContaining({ name: "Tipologia A", units: 4 }),
		]);
		const [type] = plan.unitTypes;
		expect(plan.locations.filter((l) => l.type === "unit")).toSatisfy(
			(units: typeof plan.locations) =>
				units.every((unit) => unit.unitTypeId === type?.id),
		);
	});

	test("gives odd and even stacks their own unit type", () => {
		const plan = buildPlan(
			draftOf([{ last: "2", perFloor: "4" }], {
				unitTypes: [typeOf("a", "A"), typeOf("b", "B")],
				rules: [
					ruleOf("a", { finals: "01, 03" }),
					ruleOf("b", { finals: "02, 04" }),
				],
			}),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual([
			"101:A",
			"102:B",
			"103:A",
			"104:B",
			"201:A",
			"202:B",
			"203:A",
			"204:B",
		]);
		expect(plan.unitTypeCounts.map(({ name, units }) => [name, units])).toEqual(
			[
				["A", 4],
				["B", 4],
			],
		);
	});

	test("applies a rule only inside its floor range and leaves the rest without a unit type", () => {
		const plan = buildPlan(
			draftOf([{ first: "1", last: "4", perFloor: "1" }], {
				unitTypes: [typeOf("a", "A")],
				rules: [ruleOf("a", { from: "2", to: "3" })],
			}),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual(["101:-", "201:A", "301:A", "401:-"]);
		expect(plan.untyped).toBe(2);
		expect(
			plan.locations.filter((l) => l.type === "unit").map((l) => l.unitTypeId),
		).toEqual([undefined, "unit-type:a", "unit-type:a", undefined]);
	});

	test("reads a blank bound as open and a floor past the last as covered by an open end", () => {
		const plan = buildPlan(
			draftOf([{ first: "1", last: "3", perFloor: "1" }], {
				unitTypes: [typeOf("a", "A"), typeOf("c", "Cobertura")],
				rules: [ruleOf("c", { from: "3" }), ruleOf("a", { to: "2" })],
			}),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual(["101:A", "201:A", "301:Cobertura"]);
	});

	test("lets the first rule that matches win", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", perFloor: "2" }], {
				unitTypes: [typeOf("a", "A"), typeOf("b", "B")],
				rules: [ruleOf("b", { finals: "2" }), ruleOf("a")],
			}),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual(["101:A", "102:B"]);
	});

	test("keeps each tower's rules to that tower", () => {
		const plan = buildPlan(
			draftOf(
				[
					{ last: "1", perFloor: "1" },
					{ last: "1", perFloor: "1" },
				],
				{
					unitTypes: [typeOf("a", "A"), typeOf("b", "B")],
					rules: [ruleOf("a", { tower: 0 }), ruleOf("b", { tower: 1 })],
				},
			),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual(["101:A", "101:B"]);
	});

	test("leaves a unit without a unit type when no rule reaches its stack", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", perFloor: "3" }], {
				unitTypes: [typeOf("a", "A")],
				rules: [ruleOf("a", { finals: "1" })],
			}),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual(["101:A", "102:-", "103:-"]);
		expect(plan.untyped).toBe(2);
		expect(plan.unitTypeCounts).toHaveLength(1);
	});

	test("ignores a rule whose finals cannot be read", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", perFloor: "1" }], {
				unitTypes: [typeOf("a", "A")],
				rules: [ruleOf("a", { finals: "um" })],
			}),
			identity,
		);

		expect(plan.untyped).toBe(1);
	});

	test("sends every unit type with its rooms in order, including one no unit uses", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", perFloor: "1" }], {
				unitTypes: [
					typeOf("a", " Tipologia  A ", ["Sala", "Cozinha"]),
					typeOf("b", "Cobertura", ["Terraço"]),
				],
				rules: [ruleOf("a")],
			}),
			identity,
		);

		expect(plan.unitTypes).toEqual([
			{
				id: "unit-type:a",
				name: "Tipologia A",
				rooms: [
					{ id: "unit-type:a:room:0", name: "Sala" },
					{ id: "unit-type:a:room:1", name: "Cozinha" },
				],
			},
			{
				id: "unit-type:b",
				name: "Cobertura",
				rooms: [{ id: "unit-type:b:room:0", name: "Terraço" }],
			},
		]);
		expect(plan.unitTypeCounts.map(({ name }) => name)).toEqual([
			"Tipologia A",
		]);
	});

	test("leaves a unit without a unit type when its rule points at a unit type that is gone", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", perFloor: "1" }], {
				unitTypes: [],
				rules: [ruleOf("gone")],
			}),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual(["101:-"]);
	});

	test("keeps the ground floor and the halls without a unit type", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", perFloor: "1", ground: true, hall: true }]),
			identity,
		);

		expect(plan.untyped).toBe(0);
		expect(
			plan.locations
				.filter((l) => l.type !== "unit")
				.every((location) => location.unitTypeId === undefined),
		).toBe(true);
	});
});
