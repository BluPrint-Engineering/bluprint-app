import type { LocationRow } from "./location-row";
import { buildStructure } from "./structure-tree";

function row(
	id: string,
	type: LocationRow["type"],
	name: string,
	parentId: string | null,
): LocationRow {
	return { id, type, name, parentId };
}

describe("buildStructure", () => {
	test("is empty for a project without locations", () => {
		expect(buildStructure([])).toEqual({
			towers: [],
			commonAreas: [],
			counts: { towers: 0, floors: 0, units: 0, commonAreas: 0 },
		});
	});

	test("nests floors, units and common areas at each level and keeps the stored order", () => {
		const structure = buildStructure([
			row("a", "tower", "Torre A", null),
			row("guarita", "common_area", "Guarita", null),
			row("b", "tower", "Torre B", null),
			row("a-ground", "floor", "Térreo", "a"),
			row("a-1", "floor", "1º andar", "a"),
			row("a-salao", "common_area", "Salão de festas", "a"),
			row("a-hall", "common_area", "Hall de entrada", "a-ground"),
			row("a-102", "unit", "102", "a-1"),
			row("a-101", "unit", "101", "a-1"),
			row("a-1-hall", "common_area", "Hall", "a-1"),
		]);

		expect(structure.towers.map((tower) => tower.name)).toEqual([
			"Torre A",
			"Torre B",
		]);
		expect(structure.commonAreas).toEqual([{ id: "guarita", name: "Guarita" }]);
		const [towerA, towerB] = structure.towers;
		expect(towerA!.floors.map((floor) => floor.name)).toEqual([
			"Térreo",
			"1º andar",
		]);
		expect(towerA!.commonAreas).toEqual([
			{ id: "a-salao", name: "Salão de festas" },
		]);
		expect(towerA!.floors[0]).toEqual({
			id: "a-ground",
			name: "Térreo",
			units: [],
			commonAreas: [{ id: "a-hall", name: "Hall de entrada" }],
		});
		expect(towerA!.floors[1]!.units.map((unit) => unit.name)).toEqual([
			"102",
			"101",
		]);
		expect(towerB).toEqual({
			id: "b",
			name: "Torre B",
			floors: [],
			commonAreas: [],
		});
	});

	test("counts every location of each kind, common areas at any level", () => {
		const { counts } = buildStructure([
			row("a", "tower", "Torre A", null),
			row("guarita", "common_area", "Guarita", null),
			row("f", "floor", "1º andar", "a"),
			row("f-hall", "common_area", "Hall", "f"),
			row("u1", "unit", "101", "f"),
			row("u2", "unit", "102", "f"),
		]);

		expect(counts).toEqual({ towers: 1, floors: 1, units: 2, commonAreas: 2 });
	});
});
