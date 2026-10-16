import { organizations } from "./fixture";
import {
	type SeedStructure,
	type SeedUnitRef,
	countUnits,
	numberedFloors,
	unitNames,
} from "./seed-structure";

function normalize(name: string): string {
	return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function duplicates(names: string[]): string[] {
	const seen = new Set<string>();
	return names.filter((name) => {
		const key = normalize(name);
		const repeated = seen.has(key);
		seen.add(key);
		return repeated;
	});
}

function seededStructures() {
	return organizations.flatMap((organization) =>
		organization.projects.flatMap((project) =>
			project.structure ? [[project.name, project.structure] as const] : [],
		),
	);
}

function namesOf(structure: SeedStructure) {
	return structure.towers.flatMap((tower) => ({
		tower: tower.name,
		floors: tower.floors.map((floor) => floor.name),
		units: tower.floors.flatMap((floor) => floor.units),
		areas: [
			tower.commonAreas ?? [],
			...tower.floors.map((floor) => floor.commonAreas ?? []),
		],
	}));
}

describe("unitNames", () => {
	test("numbers units by floor and two digits", () => {
		expect(unitNames(9, 4, "digits")).toEqual(["901", "902", "903", "904"]);
	});

	test("numbers units by floor and letter", () => {
		expect(unitNames(1, 3, "letters")).toEqual(["1A", "1B", "1C"]);
	});
});

describe("numberedFloors", () => {
	test("makes one floor per number with its units and an optional hall", () => {
		expect(
			numberedFloors({ from: 2, to: 3, unitsPerFloor: 2, hall: true }),
		).toEqual([
			{ name: "2º andar", units: ["201", "202"], commonAreas: ["Hall"] },
			{ name: "3º andar", units: ["301", "302"], commonAreas: ["Hall"] },
		]);
	});
});

describe("the seeded structures", () => {
	test.each(seededStructures())(
		"%s repeats no name where the database would refuse it",
		(_project, structure) => {
			expect(duplicates(structure.towers.map((tower) => tower.name))).toEqual(
				[],
			);
			expect(duplicates(structure.commonAreas ?? [])).toEqual([]);
			for (const tower of namesOf(structure)) {
				expect(duplicates(tower.floors)).toEqual([]);
				expect(duplicates(tower.units)).toEqual([]);
				for (const areas of tower.areas) expect(duplicates(areas)).toEqual([]);
			}
		},
	);

	test.each(seededStructures())(
		"%s keeps every name within 60 characters",
		(_project, structure) => {
			const all = [
				...structure.towers.map((tower) => tower.name),
				...(structure.commonAreas ?? []),
				...namesOf(structure).flatMap((tower) => [
					...tower.floors,
					...tower.units,
					...tower.areas.flat(),
				]),
			];

			expect(
				all.filter((name) => name.length === 0 || name.length > 60),
			).toEqual([]);
		},
	);

	test("a project of about 500 units exists for the scale case", () => {
		const largest = Math.max(
			...seededStructures().map(([, structure]) => countUnits(structure)),
		);

		expect(largest).toBeGreaterThanOrEqual(480);
	});

	test("a tower without floors exists in a project with several towers", () => {
		expect(
			seededStructures().some(
				([, structure]) =>
					structure.towers.length > 1 &&
					structure.towers.some((tower) => tower.floors.length === 0),
			),
		).toBe(true);
	});
});

function unitsOf(structure: SeedStructure): SeedUnitRef[] {
	return structure.towers.flatMap((tower) =>
		tower.floors.flatMap((floor) =>
			floor.units.map((name, stack) => ({
				tower: tower.name,
				floor: floor.name,
				name,
				stack,
			})),
		),
	);
}

function typedStructures() {
	return seededStructures().filter(([, structure]) => structure.unitTypes);
}

function jardins(): SeedStructure {
	const found = seededStructures().find(
		([project, structure]) =>
			project === "Residencial Jardins" && structure.unitChanges,
	);
	if (!found)
		throw new Error("Residencial Jardins is not seeded with changes.");
	return found[1];
}

describe("the seeded unit types", () => {
	test.each(typedStructures())(
		"%s gives every unit a unit type it defines",
		(_project, structure) => {
			const defined = new Set(structure.unitTypes?.map((type) => type.name));

			const unknown = unitsOf(structure)
				.map((unit) => structure.unitTypeOf?.(unit))
				.filter((name) => name !== undefined && !defined.has(name));

			expect(unknown).toEqual([]);
		},
	);

	test.each(typedStructures())(
		"%s repeats no room name in a unit type or in a common area",
		(_project, structure) => {
			for (const type of structure.unitTypes ?? []) {
				expect(duplicates(type.rooms)).toEqual([]);
			}
			for (const rooms of Object.values(structure.commonAreaRooms ?? {})) {
				expect(duplicates(rooms)).toEqual([]);
			}
		},
	);

	test.each(typedStructures())(
		"%s keeps every room name within 60 characters",
		(_project, structure) => {
			const names = [
				...(structure.unitTypes ?? []).flatMap((type) => [
					type.name,
					...type.rooms,
				]),
				...Object.values(structure.commonAreaRooms ?? {}).flat(),
			];

			expect(
				names.filter((name) => name.length === 0 || name.length > 60),
			).toEqual([]);
		},
	);

	test("Residencial Jardins has A, B and Cobertura applied, and a type no unit follows", () => {
		const structure = jardins();
		const used = new Set(
			unitsOf(structure).map((unit) => structure.unitTypeOf?.(unit)),
		);

		expect(
			["Tipologia A", "Tipologia B", "Cobertura"].every((name) =>
				used.has(name),
			),
		).toBe(true);
		expect(
			structure.unitTypes?.filter((type) => !used.has(type.name)),
		).toHaveLength(1);
	});

	test("Residencial Jardins applies A and B to odd and even stacks of the same floor", () => {
		const structure = jardins();
		const ninth = unitsOf(structure).filter(
			(unit) => unit.tower === "Torre A" && unit.floor === "9º andar",
		);

		expect(ninth.map((unit) => structure.unitTypeOf?.(unit))).toEqual([
			"Tipologia A",
			"Tipologia B",
			"Tipologia A",
			"Tipologia B",
		]);
	});

	test("Residencial Jardins has a unit without a unit type", () => {
		const structure = jardins();

		expect(
			unitsOf(structure).filter((unit) => !structure.unitTypeOf?.(unit)),
		).toHaveLength(1);
	});

	test("Residencial Jardins has a unit with a room added, one dropped and one renamed", () => {
		const structure = jardins();
		const changes = structure.unitChanges ?? [];

		expect(changes.some((change) => change.addedRooms?.length)).toBe(true);
		expect(changes.some((change) => change.droppedRooms?.length)).toBe(true);
		expect(changes.some((change) => change.renamedRooms)).toBe(true);
	});

	test("every change names a unit that exists, and the rooms it drops or renames belong to its unit type", () => {
		for (const [, structure] of seededStructures()) {
			for (const change of structure.unitChanges ?? []) {
				const unit = unitsOf(structure).find(
					(candidate) =>
						candidate.tower === change.tower && candidate.name === change.unit,
				);
				const type = structure.unitTypes?.find(
					(candidate) => candidate.name === structure.unitTypeOf?.(unit!),
				);

				expect(unit).toBeDefined();
				for (const name of [
					...(change.droppedRooms ?? []),
					...Object.keys(change.renamedRooms ?? {}),
				]) {
					expect(type?.rooms).toContain(name);
				}
			}
		}
	});

	test("Residencial Jardins gives the Salão de festas rooms", () => {
		expect(
			jardins().commonAreaRooms?.["Salão de festas"]?.length,
		).toBeGreaterThan(0);
	});
});
