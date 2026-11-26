import { buildPlan, reserveUsed } from "./buildPlan";
import {
	initialDraft,
	type RangeDraft,
	type TowerDraft,
	type WizardDraft,
} from "./wizardDraft";

const identity = (key: string) => key;

type RangeOf = Partial<Omit<RangeDraft, "key">>;

type TowerOf = Partial<Omit<TowerDraft, "ranges">> &
	RangeOf & { ranges?: RangeOf[] };

const rangeOf = (range: RangeOf, at: number): RangeDraft => ({
	key: `range-${at}`,
	first: "1",
	last: "3",
	finals: "01, 02",
	noUnits: false,
	...range,
});

function draftOf(
	towers: TowerOf[],
	rest: Partial<WizardDraft> = {},
): WizardDraft {
	return {
		...initialDraft(),
		towers: towers.map(
			({ ranges, first, last, finals, noUnits, ...tower }, index) => ({
				key: `tower-${index}`,
				name: `Torre ${String.fromCharCode(65 + index)}`,
				ground: false,
				hall: false,
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
				).map(rangeOf),
			}),
		),
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
			draftOf([{ first: "9", last: "10", finals: "01, 03" }]),
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
			draftOf([{ first: "1", last: "2", finals: "A, B" }], {
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
				projectAreas: [{ name: "Guarita", typology: null }],
				towerAreas: [{ name: "Salão de festas", typology: null }],
				floorAreas: [
					{ key: "a", tower: 1, floor: "2", name: "Terraço", typology: null },
				],
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
			draftOf([{}], {
				towerAreas: [{ name: "Salão de festas", typology: null }],
			}),
			identity,
		);

		expect(namesOf(plan, "common_area")).toEqual([]);
	});

	test("ignores a floor area whose tower or floor is not in the plan", () => {
		const plan = buildPlan(
			draftOf([{ last: "2" }], {
				floorAreas: [
					{ key: "a", tower: 3, floor: "1", name: "Fantasma", typology: null },
					{ key: "b", tower: 0, floor: "9", name: "Longe", typology: null },
				],
			}),
			identity,
		);

		expect(namesOf(plan, "common_area")).toEqual([]);
	});

	test("lists a parent before its children and keeps positions per parent", () => {
		const plan = buildPlan(
			draftOf([{ ground: true, hall: true }], {
				projectAreas: [{ name: "Guarita", typology: null }],
			}),
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
					projectAreas: [{ name: "Guarita", typology: null }],
					towerAreas: [{ name: "Salão de festas", typology: null }],
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

		expect(plan.towers.map((tower) => tower.state)).toEqual([
			"valid",
			"invalid",
		]);
		expect(namesOf(plan, "tower")).toEqual(["Torre A"]);
		expect(plan.complete).toBe(false);
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
		expect(again.typologies).toEqual(first.typologies);
		expect(new Set(first.locations.map((location) => location.id)).size).toBe(
			first.locations.length,
		);
	});
});

const typeOf = (
	key: string,
	name: string,
	rooms: string[] = [],
	locationType: "unit" | "common_area" = "unit",
) => ({
	key,
	name,
	rooms,
	locationType,
});

const ruleOf = (
	typology: string,
	rest: Partial<WizardDraft["rules"][number]> = {},
) => ({
	key: `rule-${typology}-${Math.random()}`,
	tower: 0,
	finals: "todos",
	from: "",
	to: "",
	typology,
	...rest,
});

const typesOfUnits = (plan: ReturnType<typeof buildPlan>) =>
	plan.towers.flatMap((tower) =>
		tower.floors.flatMap((floor) =>
			floor.units.map((unit) => `${unit.name}:${unit.typology ?? "-"}`),
		),
	);

describe("buildPlan typologies", () => {
	test("applies the starting typology to every unit of every floor", () => {
		const plan = buildPlan(
			draftOf([{ last: "2", finals: "01, 02" }]),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual([
			"101:Tipologia A",
			"102:Tipologia A",
			"201:Tipologia A",
			"202:Tipologia A",
		]);
		expect(plan.untyped).toBe(0);
		expect(plan.typologyCounts).toEqual([
			expect.objectContaining({ name: "Tipologia A", units: 4 }),
		]);
		const [type] = plan.typologies;
		expect(plan.locations.filter((l) => l.type === "unit")).toSatisfy(
			(units: typeof plan.locations) =>
				units.every((unit) => unit.typologyId === type?.id),
		);
	});

	test("gives odd and even stacks their own typology", () => {
		const plan = buildPlan(
			draftOf([{ last: "2", finals: "01, 04" }], {
				typologies: [typeOf("a", "A"), typeOf("b", "B")],
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
		expect(plan.typologyCounts.map(({ name, units }) => [name, units])).toEqual(
			[
				["A", 4],
				["B", 4],
			],
		);
	});

	test("applies a rule only inside its floor range and leaves the rest without a typology", () => {
		const plan = buildPlan(
			draftOf([{ first: "1", last: "4", finals: "01" }], {
				typologies: [typeOf("a", "A")],
				rules: [ruleOf("a", { from: "2", to: "3" })],
			}),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual(["101:-", "201:A", "301:A", "401:-"]);
		expect(plan.untyped).toBe(2);
		expect(
			plan.locations.filter((l) => l.type === "unit").map((l) => l.typologyId),
		).toEqual([undefined, "typology:a", "typology:a", undefined]);
	});

	test("reads a blank bound as open and a floor past the last as covered by an open end", () => {
		const plan = buildPlan(
			draftOf([{ first: "1", last: "3", finals: "01" }], {
				typologies: [typeOf("a", "A"), typeOf("c", "Cobertura")],
				rules: [ruleOf("c", { from: "3" }), ruleOf("a", { to: "2" })],
			}),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual(["101:A", "201:A", "301:Cobertura"]);
	});

	test("lets the first rule that matches win", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", finals: "01, 02" }], {
				typologies: [typeOf("a", "A"), typeOf("b", "B")],
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
					{ last: "1", finals: "01" },
					{ last: "1", finals: "01" },
				],
				{
					typologies: [typeOf("a", "A"), typeOf("b", "B")],
					rules: [ruleOf("a", { tower: 0 }), ruleOf("b", { tower: 1 })],
				},
			),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual(["101:A", "101:B"]);
	});

	test("leaves a unit without a typology when no rule reaches its stack", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", finals: "01, 03" }], {
				typologies: [typeOf("a", "A")],
				rules: [ruleOf("a", { finals: "1" })],
			}),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual(["101:A", "102:-", "103:-"]);
		expect(plan.untyped).toBe(2);
		expect(plan.typologyCounts).toHaveLength(1);
	});

	test("ignores a rule whose finals cannot be read", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", finals: "01" }], {
				typologies: [typeOf("a", "A")],
				rules: [ruleOf("a", { finals: "um" })],
			}),
			identity,
		);

		expect(plan.untyped).toBe(1);
	});

	test("sends every typology with its rooms in order, including one no unit uses", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", finals: "01" }], {
				typologies: [
					typeOf("a", " Tipologia  A ", ["Sala", "Cozinha"]),
					typeOf("b", "Cobertura", ["Terraço"]),
				],
				rules: [ruleOf("a")],
			}),
			identity,
		);

		expect(plan.typologies).toEqual([
			{
				id: "typology:a",
				name: "Tipologia A",
				locationType: "unit",
				rooms: [
					{ id: "typology:a:room:0", name: "Sala" },
					{ id: "typology:a:room:1", name: "Cozinha" },
				],
			},
			{
				id: "typology:b",
				name: "Cobertura",
				locationType: "unit",
				rooms: [{ id: "typology:b:room:0", name: "Terraço" }],
			},
		]);
		expect(plan.typologyCounts.map(({ name }) => name)).toEqual([
			"Tipologia A",
		]);
	});

	test("leaves a unit without a typology when its rule points at a typology that is gone", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", finals: "01" }], {
				typologies: [],
				rules: [ruleOf("gone")],
			}),
			identity,
		);

		expect(typesOfUnits(plan)).toEqual(["101:-"]);
	});

	test("gives the entrance hall, the floor halls and a common area the chosen common-area typology", () => {
		const plan = buildPlan(
			draftOf(
				[
					{
						last: "1",
						finals: "01",
						ground: true,
						hall: true,
						entranceTypology: "hall",
						hallTypology: "hall",
					},
				],
				{
					typologies: [
						typeOf("a", "Tipologia A"),
						typeOf("hall", "Hall padrão", ["Circulação"], "common_area"),
					],
					projectAreas: [{ name: "Guarita", typology: "hall" }],
					rules: [ruleOf("a")],
				},
			),
			identity,
		);

		expect(
			plan.typologies.map(({ name, locationType }) => [name, locationType]),
		).toEqual([
			["Tipologia A", "unit"],
			["Hall padrão", "common_area"],
		]);
		const hallId = "typology:hall";
		expect(
			plan.locations
				.filter((location) => location.type === "common_area")
				.map(({ name, typologyId }) => [name, typologyId]),
		).toEqual([
			["Hall de entrada", hallId],
			["Hall", hallId],
			["Guarita", hallId],
		]);
	});

	test("keeps the ground floor and the halls without a typology", () => {
		const plan = buildPlan(
			draftOf([{ last: "1", finals: "01", ground: true, hall: true }]),
			identity,
		);

		expect(plan.untyped).toBe(0);
		expect(
			plan.locations
				.filter((l) => l.type !== "unit")
				.every((location) => location.typologyId === undefined),
		).toBe(true);
	});
});

const unitsOf = (plan: ReturnType<typeof buildPlan>, tower = 0) =>
	plan.towers[tower]?.floors.flatMap((floor) =>
		floor.units.map((unit) => unit.name),
	);

describe("buildPlan from floor ranges", () => {
	const teamRequest = () =>
		draftOf([
			{
				ranges: [
					{ first: "2", last: "10", finals: "01, 02" },
					{ first: "11", last: "17", finals: "01" },
				],
			},
		]);

	test("builds the team's tower: 2º to 10º with 01 and 02, 11º to 17º with 01", () => {
		const plan = buildPlan(teamRequest(), identity);

		expect(namesOf(plan, "unit")).toEqual([
			"201",
			"202",
			"301",
			"302",
			"401",
			"402",
			"501",
			"502",
			"601",
			"602",
			"701",
			"702",
			"801",
			"802",
			"901",
			"902",
			"1001",
			"1002",
			"1101",
			"1201",
			"1301",
			"1401",
			"1501",
			"1601",
			"1701",
		]);
		expect(namesOf(plan, "floor")).not.toContain("1º andar");
		expect(namesOf(plan, "floor")).toHaveLength(16);
		expect(plan.towers[0]).toMatchObject({ units: 25, numberedFloors: 16 });
	});

	test("fills every stack between the lowest and the highest typed", () => {
		const plan = buildPlan(
			draftOf([{ first: "1", last: "1", finals: "01, 04" }]),
			identity,
		);

		expect(unitsOf(plan)).toEqual(["101", "102", "103", "104"]);
	});

	test("reads 1, 3 as 01, 03", () => {
		const draft = draftOf([{ first: "1", last: "2", finals: "01, 03" }]);
		const withFinals = (finals: string) => ({
			...draft,
			towers: draft.towers.map((tower) => ({
				...tower,
				ranges: tower.ranges.map((range) => ({ ...range, finals })),
			})),
		});
		const short = buildPlan(withFinals("1, 3"), identity);
		const padded = buildPlan(withFinals("01, 03"), identity);

		expect(short.locations).toEqual(padded.locations);
		expect(unitsOf(short)).toEqual(["101", "102", "103", "201", "202", "203"]);
	});

	test("fills letters from the lowest to the highest typed", () => {
		const plan = buildPlan(
			draftOf([{ first: "2", last: "2", finals: "A, C" }], {
				numbering: "letters",
			}),
			identity,
		);

		expect(unitsOf(plan)).toEqual(["2A", "2B", "2C"]);
	});

	test("starts at the lowest stack typed instead of 01", () => {
		const plan = buildPlan(
			draftOf([{ first: "2", last: "3", finals: "03, 04" }]),
			identity,
		);

		expect(unitsOf(plan)).toEqual(["203", "204", "303", "304"]);
		expect(
			plan.locations
				.filter(({ type }) => type === "unit")
				.map(({ name, position }) => [name, position]),
		).toEqual([
			["203", 0],
			["204", 1],
			["303", 0],
			["304", 1],
		]);
	});

	test("creates the floors of a range without units, with the hall when it is on", () => {
		const plan = buildPlan(
			draftOf([
				{
					hall: true,
					ranges: [
						{ first: "1", last: "2", finals: "01" },
						{ first: "3", last: "3", noUnits: true, finals: "" },
					],
				},
			]),
			identity,
		);

		expect(namesOf(plan, "floor")).toEqual([
			"1º andar",
			"2º andar",
			"3º andar",
		]);
		expect(plan.towers[0]?.floors.at(-1)).toMatchObject({
			label: "3º",
			units: [],
			areas: [{ name: "Hall" }],
		});
		expect(namesOf(plan, "unit")).toEqual(["101", "201"]);
	});

	test.each([
		["a range without finals", [{ first: "2", last: "4", finals: "" }]],
		[
			"two ranges on the 10º",
			[
				{ first: "2", last: "10", finals: "01, 02" },
				{ first: "10", last: "17", finals: "01" },
			],
		],
		["more than 30 stacks", [{ first: "1", last: "2", finals: "01, 31" }]],
		["an incomplete range", [{ first: "2", last: "", finals: "01" }]],
	])(
		"builds nothing for a tower with %s and counts nothing of it",
		(_name, ranges) => {
			const plan = buildPlan(
				draftOf([{ ranges }, { first: "1", last: "1", finals: "01" }], {
					towerAreas: [{ name: "Salão de festas", typology: null }],
				}),
				identity,
			);

			expect(plan.towers[0]).toMatchObject({ state: "invalid", floors: [] });
			expect(namesOf(plan, "tower")).toEqual(["Torre B"]);
			expect(plan.spend).toEqual({
				units: 1,
				floorHalls: 0,
				entranceHalls: 0,
				otherAreas: 1,
			});
			expect(plan.complete).toBe(false);
		},
	);

	test("tells a tower left blank from one left incomplete", () => {
		const plan = buildPlan(
			draftOf([
				{ ranges: [{ first: "", last: "", finals: "" }] },
				{ ranges: [{ first: "2", last: "", finals: "" }] },
			]),
			identity,
		);

		expect(plan.towers.map(({ state }) => state)).toEqual(["blank", "invalid"]);
	});

	test("orders the floors by number whatever the order of the ranges", () => {
		const plan = buildPlan(
			draftOf([
				{
					ground: true,
					ranges: [
						{ first: "3", last: "4", finals: "01" },
						{ first: "1", last: "2", finals: "01, 02" },
					],
				},
			]),
			identity,
		);

		expect(
			plan.locations
				.filter(({ type }) => type === "floor")
				.map(({ name, position }) => [name, position]),
		).toEqual([
			["Térreo", 0],
			["1º andar", 1],
			["2º andar", 2],
			["3º andar", 3],
			["4º andar", 4],
		]);
	});

	test("counts units, floor halls, entrance halls and the other common areas against the reserve", () => {
		const plan = buildPlan(
			draftOf(
				[
					{
						ground: true,
						hall: true,
						ranges: [
							{ first: "2", last: "10", finals: "01, 02" },
							{ first: "11", last: "17", finals: "01" },
						],
					},
					{ ground: true, first: "2", last: "10", finals: "01, 04" },
				],
				{
					projectAreas: [{ name: "Guarita", typology: null }],
					towerAreas: [{ name: "Salão de festas", typology: null }],
					floorAreas: [
						{
							key: "a",
							tower: 1,
							floor: "10",
							name: "Terraço",
							typology: null,
						},
					],
				},
			),
			identity,
		);

		expect(plan.spend).toEqual({
			units: 61,
			floorHalls: 16,
			entranceHalls: 2,
			otherAreas: 4,
		});
		expect(reserveUsed(plan.spend)).toBe(83);
		expect(reserveUsed(plan.spend)).toBe(
			plan.counts.units + plan.counts.commonAreas,
		);
	});

	test("keys each location by the tower, the floor number and the stack position", () => {
		const draft = teamRequest();
		const plan = buildPlan(draft, identity);
		const reordered = buildPlan(
			{
				...draft,
				towers: draft.towers.map((tower) => ({
					...tower,
					ranges: [...tower.ranges].reverse(),
				})),
			},
			identity,
		);

		expect(plan.locations.find(({ name }) => name === "1002")?.id).toBe(
			"tower:tower-0:floor:10:unit:2",
		);
		expect(reordered.locations).toEqual(plan.locations);
	});
});
