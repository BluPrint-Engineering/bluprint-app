import { organizations } from "./fixture";
import {
	type SeedStructure,
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
