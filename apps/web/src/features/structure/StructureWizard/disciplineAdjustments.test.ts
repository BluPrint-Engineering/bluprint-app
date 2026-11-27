import {
	type DisciplineAdjustment,
	type DisciplineDefaults,
	type DisciplineLocation,
	disciplineExceptions,
	disciplinesByLocation,
	resolveTarget,
	tidyAdjustments,
} from "./disciplineAdjustments";

const discipline = (
	id: string,
	name: string,
	type: DisciplineDefaults["type"],
	appliesEverywhere: boolean,
): DisciplineDefaults => ({ id, name, type, appliesEverywhere });

const general = discipline("general", "Geral", "general", true);
const plumbing = discipline("plumbing", "Hidráulica", "base", true);
const electrical = discipline("electrical", "Elétrica", "base", true);
const painting = discipline("painting", "Pintura", "extra", true);
const pool = discipline("pool", "Piscina", "extra", false);
const plaster = discipline("plaster", "Gesso", "extra", true);

const garage: DisciplineLocation = {
	address: "garage",
	type: "common_area",
	tower: null,
	floor: null,
};
const entranceHall: DisciplineLocation = {
	address: "entrance-hall",
	type: "common_area",
	tower: "a",
	floor: "ground",
};
const unit101: DisciplineLocation = {
	address: "101",
	type: "unit",
	tower: "a",
	floor: "f1",
};
const unit201: DisciplineLocation = {
	address: "201",
	type: "unit",
	tower: "a",
	floor: "f2",
};
const unit202: DisciplineLocation = {
	address: "202",
	type: "unit",
	tower: "a",
	floor: "f2",
};
const unit203: DisciplineLocation = {
	address: "203",
	type: "unit",
	tower: "a",
	floor: "f2",
};
const unit204: DisciplineLocation = {
	address: "204",
	type: "unit",
	tower: "a",
	floor: "f2",
};
const hall2: DisciplineLocation = {
	address: "hall-2",
	type: "common_area",
	tower: "a",
	floor: "f2",
};
const partyRoom: DisciplineLocation = {
	address: "party-room",
	type: "common_area",
	tower: "a",
	floor: null,
};
const towerBUnit: DisciplineLocation = {
	address: "b-101",
	type: "unit",
	tower: "b",
	floor: "b-f1",
};

const names = (
	locations: readonly DisciplineLocation[],
	disciplines: readonly DisciplineDefaults[],
	adjustments: readonly DisciplineAdjustment[],
) => {
	const byId = new Map(disciplines.map(({ id, name }) => [id, name]));
	return Object.fromEntries(
		[...disciplinesByLocation(locations, disciplines, adjustments)].map(
			([address, ids]) => [address, ids.map((id) => byId.get(id))],
		),
	);
};

describe("a discipline at a location", () => {
	const locations = [unit101, garage];
	const disciplines = [general, plumbing, electrical, painting, pool];

	test("is on by the default of a discipline that applies everywhere", () => {
		expect(names(locations, disciplines, [])).toEqual({
			"101": ["Hidráulica", "Elétrica", "Pintura"],
			garage: ["Hidráulica", "Elétrica", "Pintura"],
		});
	});

	test("is off by the default of a discipline that applies only where turned on", () => {
		const result = names(locations, disciplines, []);
		expect(result["101"]).not.toContain("Piscina");
		expect(result.garage).not.toContain("Piscina");
	});

	test("is on by an adjustment that turns it on", () => {
		const adjustments = [{ addresses: ["101"], on: ["pool"], off: [] }];
		expect(names(locations, disciplines, adjustments)).toEqual({
			"101": ["Hidráulica", "Elétrica", "Pintura", "Piscina"],
			garage: ["Hidráulica", "Elétrica", "Pintura"],
		});
	});

	test("is off by an adjustment that turns it off", () => {
		const adjustments = [{ addresses: ["101"], on: [], off: ["electrical"] }];
		expect(names(locations, disciplines, adjustments)).toEqual({
			"101": ["Hidráulica", "Pintura"],
			garage: ["Hidráulica", "Elétrica", "Pintura"],
		});
	});

	test("never lists General, even when an adjustment names it", () => {
		const adjustments = [{ addresses: ["101"], on: ["general"], off: [] }];
		const result = disciplinesByLocation(locations, disciplines, adjustments);
		expect(result.get("101")).not.toContain("general");
		expect(result.get("garage")).not.toContain("general");
	});

	test("is decided by the last adjustment that names it", () => {
		const adjustments = [
			{ addresses: ["101"], on: [], off: ["painting"] },
			{ addresses: ["101", "garage"], on: ["painting"], off: [] },
			{ addresses: ["garage"], on: [], off: ["painting"] },
		];
		expect(names(locations, disciplines, adjustments)).toEqual({
			"101": ["Hidráulica", "Elétrica", "Pintura"],
			garage: ["Hidráulica", "Elétrica"],
		});
	});

	test("follows the default at a location an adjustment does not list", () => {
		const adjustments = [{ addresses: ["garage"], on: [], off: ["painting"] }];
		expect(names(locations, disciplines, adjustments)["101"]).toEqual([
			"Hidráulica",
			"Elétrica",
			"Pintura",
		]);
	});

	test("follows the default for a discipline an adjustment does not name, also at adjusted locations", () => {
		const adjustments = [
			{ addresses: ["101"], on: ["electrical"], off: ["plumbing"] },
		];
		const later = [...disciplines, plaster];
		expect(names(locations, later, adjustments)["101"]).toEqual([
			"Elétrica",
			"Pintura",
			"Gesso",
		]);
	});
});

describe("resolveTarget", () => {
	const locations = [
		garage,
		entranceHall,
		unit101,
		unit201,
		hall2,
		partyRoom,
		towerBUnit,
	];

	test("a floor is its units and common areas", () => {
		expect(resolveTarget(locations, { kind: "floor", floor: "f2" })).toEqual([
			"201",
			"hall-2",
		]);
	});

	test("a tower is the units and common areas of its floors plus its own common areas, without the common areas of the project", () => {
		expect(resolveTarget(locations, { kind: "tower", tower: "a" })).toEqual([
			"entrance-hall",
			"101",
			"201",
			"hall-2",
			"party-room",
		]);
	});
});

describe("disciplineExceptions", () => {
	const locations = [unit101, garage];
	const disciplines = [general, plumbing, electrical, painting, pool];

	test("a location without an adjustment has none", () => {
		expect(disciplineExceptions(locations, disciplines, [])).toEqual(
			new Map([
				["101", []],
				["garage", []],
			]),
		);
	});

	test("brings only what differs from the default of that location", () => {
		const adjustments = [
			{
				addresses: ["101"],
				on: ["pool", "electrical"],
				off: ["painting"],
			},
		];
		expect(disciplineExceptions(locations, disciplines, adjustments)).toEqual(
			new Map([
				[
					"101",
					[
						{ disciplineId: "painting", applies: false },
						{ disciplineId: "pool", applies: true },
					],
				],
				["garage", []],
			]),
		);
	});

	test("an adjustment that turns on what was already on, or off what was already off, makes no exception", () => {
		const adjustments = [
			{ addresses: ["101"], on: ["plumbing"], off: ["pool"] },
		];
		expect(
			disciplineExceptions(locations, disciplines, adjustments).get("101"),
		).toEqual([]);
	});

	test("an adjustment undone by a later one makes no exception", () => {
		const adjustments = [
			{ addresses: ["101"], on: [], off: ["painting"] },
			{ addresses: ["101"], on: ["painting"], off: [] },
		];
		expect(
			disciplineExceptions(locations, disciplines, adjustments).get("101"),
		).toEqual([]);
	});

	test("never brings General", () => {
		const adjustments = [{ addresses: ["101"], on: [], off: ["general"] }];
		expect(
			disciplineExceptions(locations, disciplines, adjustments).get("101"),
		).toEqual([]);
	});
});

describe("tidyAdjustments", () => {
	test("drops an address that no longer exists, a discipline that left the draft and an adjustment left without locations", () => {
		const adjustments = [
			{ addresses: ["101", "gone"], on: ["pool", "gone"], off: ["painting"] },
			{ addresses: ["gone"], on: ["pool"], off: [] },
		];
		expect(
			tidyAdjustments(adjustments, [unit101], [plumbing, painting, pool]),
		).toEqual([{ addresses: ["101"], on: ["pool"], off: ["painting"] }]);
	});
});

describe("a hostile sequence of changes", () => {
	const allDisciplines = [general, plumbing, electrical, painting, pool];
	const withPlaster = [...allDisciplines, plaster];

	test("keeps every location by discipline right at each step", () => {
		let disciplines = [general, plumbing, electrical, painting, pool];
		let locations = [garage, entranceHall, unit101, unit201, unit202, hall2];

		expect(names(locations, disciplines, [])).toEqual({
			garage: ["Hidráulica", "Elétrica", "Pintura"],
			"entrance-hall": ["Hidráulica", "Elétrica", "Pintura"],
			"101": ["Hidráulica", "Elétrica", "Pintura"],
			"201": ["Hidráulica", "Elétrica", "Pintura"],
			"202": ["Hidráulica", "Elétrica", "Pintura"],
			"hall-2": ["Hidráulica", "Elétrica", "Pintura"],
		});

		const secondFloor: DisciplineAdjustment = {
			addresses: resolveTarget(locations, { kind: "floor", floor: "f2" }),
			on: ["electrical"],
			off: ["plumbing", "painting", "pool"],
		};
		let adjustments = [secondFloor];
		expect(secondFloor.addresses).toEqual(["201", "202", "hall-2"]);
		expect(names(locations, disciplines, adjustments)).toEqual({
			garage: ["Hidráulica", "Elétrica", "Pintura"],
			"entrance-hall": ["Hidráulica", "Elétrica", "Pintura"],
			"101": ["Hidráulica", "Elétrica", "Pintura"],
			"201": ["Elétrica"],
			"202": ["Elétrica"],
			"hall-2": ["Elétrica"],
		});

		locations = [
			garage,
			entranceHall,
			unit101,
			unit201,
			unit202,
			unit203,
			unit204,
			hall2,
		];
		expect(names(locations, disciplines, adjustments)).toEqual({
			garage: ["Hidráulica", "Elétrica", "Pintura"],
			"entrance-hall": ["Hidráulica", "Elétrica", "Pintura"],
			"101": ["Hidráulica", "Elétrica", "Pintura"],
			"201": ["Elétrica"],
			"202": ["Elétrica"],
			"203": ["Hidráulica", "Elétrica", "Pintura"],
			"204": ["Hidráulica", "Elétrica", "Pintura"],
			"hall-2": ["Elétrica"],
		});

		disciplines = withPlaster;
		expect(names(locations, disciplines, adjustments)).toEqual({
			garage: ["Hidráulica", "Elétrica", "Pintura", "Gesso"],
			"entrance-hall": ["Hidráulica", "Elétrica", "Pintura", "Gesso"],
			"101": ["Hidráulica", "Elétrica", "Pintura", "Gesso"],
			"201": ["Elétrica", "Gesso"],
			"202": ["Elétrica", "Gesso"],
			"203": ["Hidráulica", "Elétrica", "Pintura", "Gesso"],
			"204": ["Hidráulica", "Elétrica", "Pintura", "Gesso"],
			"hall-2": ["Elétrica", "Gesso"],
		});

		const poolPlaces: DisciplineAdjustment = {
			addresses: ["garage", "entrance-hall"],
			on: ["pool"],
			off: [],
		};
		adjustments = [...adjustments, poolPlaces];
		expect(names(locations, disciplines, adjustments)).toEqual({
			garage: ["Hidráulica", "Elétrica", "Pintura", "Piscina", "Gesso"],
			"entrance-hall": [
				"Hidráulica",
				"Elétrica",
				"Pintura",
				"Piscina",
				"Gesso",
			],
			"101": ["Hidráulica", "Elétrica", "Pintura", "Gesso"],
			"201": ["Elétrica", "Gesso"],
			"202": ["Elétrica", "Gesso"],
			"203": ["Hidráulica", "Elétrica", "Pintura", "Gesso"],
			"204": ["Hidráulica", "Elétrica", "Pintura", "Gesso"],
			"hall-2": ["Elétrica", "Gesso"],
		});

		const towerA: DisciplineAdjustment = {
			addresses: resolveTarget(locations, { kind: "tower", tower: "a" }),
			on: [],
			off: ["painting"],
		};
		adjustments = [...adjustments, towerA];
		expect(towerA.addresses).not.toContain("garage");
		expect(names(locations, disciplines, adjustments)).toEqual({
			garage: ["Hidráulica", "Elétrica", "Pintura", "Piscina", "Gesso"],
			"entrance-hall": ["Hidráulica", "Elétrica", "Piscina", "Gesso"],
			"101": ["Hidráulica", "Elétrica", "Gesso"],
			"201": ["Elétrica", "Gesso"],
			"202": ["Elétrica", "Gesso"],
			"203": ["Hidráulica", "Elétrica", "Gesso"],
			"204": ["Hidráulica", "Elétrica", "Gesso"],
			"hall-2": ["Elétrica", "Gesso"],
		});

		adjustments = adjustments.filter(
			(adjustment) => adjustment !== secondFloor,
		);
		expect(names(locations, disciplines, adjustments)).toEqual({
			garage: ["Hidráulica", "Elétrica", "Pintura", "Piscina", "Gesso"],
			"entrance-hall": ["Hidráulica", "Elétrica", "Piscina", "Gesso"],
			"101": ["Hidráulica", "Elétrica", "Gesso"],
			"201": ["Hidráulica", "Elétrica", "Gesso"],
			"202": ["Hidráulica", "Elétrica", "Gesso"],
			"203": ["Hidráulica", "Elétrica", "Gesso"],
			"204": ["Hidráulica", "Elétrica", "Gesso"],
			"hall-2": ["Hidráulica", "Elétrica", "Gesso"],
		});

		disciplines = disciplines.filter(({ id }) => id !== "pool");
		adjustments = tidyAdjustments(adjustments, locations, disciplines);
		expect(adjustments.flatMap(({ on, off }) => [...on, ...off])).not.toContain(
			"pool",
		);
		expect(names(locations, disciplines, adjustments)).toEqual({
			garage: ["Hidráulica", "Elétrica", "Pintura", "Gesso"],
			"entrance-hall": ["Hidráulica", "Elétrica", "Gesso"],
			"101": ["Hidráulica", "Elétrica", "Gesso"],
			"201": ["Hidráulica", "Elétrica", "Gesso"],
			"202": ["Hidráulica", "Elétrica", "Gesso"],
			"203": ["Hidráulica", "Elétrica", "Gesso"],
			"204": ["Hidráulica", "Elétrica", "Gesso"],
			"hall-2": ["Hidráulica", "Elétrica", "Gesso"],
		});

		const secondFloorOnly: DisciplineAdjustment = {
			addresses: ["201", "202", "203", "204", "hall-2"],
			on: [],
			off: ["plaster"],
		};
		adjustments = [...adjustments, secondFloorOnly];
		expect(tidyAdjustments(adjustments, locations, disciplines)).toHaveLength(
			adjustments.length,
		);
		locations = [garage, entranceHall, unit101];
		const tidied = tidyAdjustments(adjustments, locations, disciplines);
		expect(tidied).toHaveLength(adjustments.length - 1);
		expect(tidied).toEqual([
			{ addresses: ["garage", "entrance-hall"], on: [], off: [] },
			{
				addresses: ["entrance-hall", "101"],
				on: [],
				off: ["painting"],
			},
		]);
		expect(names(locations, disciplines, tidied)).toEqual({
			garage: ["Hidráulica", "Elétrica", "Pintura", "Gesso"],
			"entrance-hall": ["Hidráulica", "Elétrica", "Gesso"],
			"101": ["Hidráulica", "Elétrica", "Gesso"],
		});
	});

	test("the exceptions of the sequence carry only what differs per location", () => {
		const locations = [garage, entranceHall, unit101, unit201];
		const adjustments = [
			{ addresses: ["201"], on: ["electrical"], off: ["plumbing", "pool"] },
			{ addresses: ["garage", "entrance-hall"], on: ["pool"], off: [] },
			{ addresses: ["entrance-hall", "101"], on: [], off: ["painting"] },
		];
		expect(disciplineExceptions(locations, withPlaster, adjustments)).toEqual(
			new Map([
				["garage", [{ disciplineId: "pool", applies: true }]],
				[
					"entrance-hall",
					[
						{ disciplineId: "painting", applies: false },
						{ disciplineId: "pool", applies: true },
					],
				],
				["101", [{ disciplineId: "painting", applies: false }]],
				["201", [{ disciplineId: "plumbing", applies: false }]],
			]),
		);
	});
});
