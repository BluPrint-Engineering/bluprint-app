import type { StructureFloor, StructureTower } from "@bluprint/shared";
import { towerFacts } from "./towerFacts";

let next = 0;
const id = () => `id-${next++}`;

function floor(
	name: string,
	units: number,
	commonAreas: string[] = [],
	unitTypes: (string | null)[] = [],
): StructureFloor {
	return {
		id: id(),
		name,
		units: Array.from({ length: units }, (_, i) => {
			const typeName = unitTypes[i % Math.max(unitTypes.length, 1)] ?? null;
			return {
				id: id(),
				name: `${name}-${i}`,
				unitType: typeName ? { id: `type-${typeName}`, name: typeName } : null,
				changes: 0,
			};
		}),
		commonAreas: commonAreas.map((area) => ({ id: id(), name: area })),
	};
}

function tower(
	floors: StructureFloor[],
	commonAreas: string[] = [],
): StructureTower {
	return {
		id: id(),
		name: "Torre A",
		floors,
		commonAreas: commonAreas.map((area) => ({ id: id(), name: area })),
	};
}

describe("towerFacts", () => {
	test("summarises floors, units with the usual count per floor, and common areas at every level", () => {
		const facts = towerFacts(
			tower(
				[
					floor("Térreo", 0, ["Hall de entrada"]),
					floor("1º andar", 4, ["Hall"]),
					floor("2º andar", 4, ["Hall"]),
					floor("Cobertura", 2, ["Terraço"]),
				],
				["Salão de festas"],
			),
		);

		expect(facts).toEqual([
			["Andares", "Térreo, 1º ao 2º e Cobertura"],
			["Unidades", "10 · 4 por andar"],
			["Áreas comuns", "5"],
			["Tipologias", "Sem tipologia"],
		]);
	});

	test("leaves the per-floor count out of a tower with no units", () => {
		expect(towerFacts(tower([floor("Térreo", 0)]))).toEqual([
			["Andares", "Térreo"],
			["Unidades", "0"],
			["Áreas comuns", "0"],
			["Tipologias", "Sem tipologia"],
		]);
	});

	test("reads a tower without floors as having none", () => {
		expect(towerFacts(tower([], ["Salão de festas"]))).toEqual([
			["Andares", "nenhum"],
			["Unidades", "0"],
			["Áreas comuns", "1"],
			["Tipologias", "Sem tipologia"],
		]);
	});

	test("breaks a tie between per-floor counts toward the smaller one", () => {
		const facts = towerFacts(
			tower([floor("1º andar", 4), floor("2º andar", 2)]),
		);

		expect(facts[1]).toEqual(["Unidades", "6 · 2 por andar"]);
	});

	test("lists each unit type of the tower once, in the order they first appear", () => {
		const facts = towerFacts(
			tower([
				floor("1º andar", 4, [], ["Tipologia A", "Tipologia B"]),
				floor("2º andar", 4, [], ["Tipologia A", "Tipologia B"]),
				floor("Cobertura", 2, [], ["Cobertura"]),
			]),
		);

		expect(facts[3]).toEqual([
			"Tipologias",
			"Tipologia A, Tipologia B, Cobertura",
		]);
	});

	test("ignores the units without a unit type when others have one", () => {
		const facts = towerFacts(
			tower([floor("1º andar", 3, [], ["Tipologia A", null, null])]),
		);

		expect(facts[3]).toEqual(["Tipologias", "Tipologia A"]);
	});
});
