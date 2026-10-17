import type { UnitType } from "@bluprint/shared";
import { describe, expect, test } from "vitest";
import { savedText, unitsChangedText } from "./unitTypeSaveText";

function unitType(unitCount: number, changedUnitCount: number): UnitType {
	return {
		id: "0190b000-0000-7000-8000-000000000001",
		name: "Tipologia A",
		rooms: [],
		unitCount,
		changedUnitCount,
	};
}

describe("unitsChangedText", () => {
	test("says how many units change and that changed units keep their changes", () => {
		expect(unitsChangedText(unitType(44, 1))).toBe(
			"Salvar muda as 44 unidades da Tipologia A. 1 unidade com alterações mantém o que foi mudado nela.",
		);
		expect(unitsChangedText(unitType(44, 3))).toBe(
			"Salvar muda as 44 unidades da Tipologia A. 3 unidades com alterações mantêm o que foi mudado nelas.",
		);
	});

	test("leaves the changes out when no unit has any", () => {
		expect(unitsChangedText(unitType(44, 0))).toBe(
			"Salvar muda as 44 unidades da Tipologia A.",
		);
	});

	test("agrees with a single unit and with none", () => {
		expect(unitsChangedText(unitType(1, 0))).toBe(
			"Salvar muda 1 unidade da Tipologia A.",
		);
		expect(unitsChangedText(unitType(0, 0))).toBe(
			"Nenhuma unidade usa a Tipologia A ainda.",
		);
	});
});

describe("savedText", () => {
	test("counts the units updated", () => {
		expect(savedText("Tipologia A", 44)).toBe(
			"Tipologia A salva. 44 unidades atualizadas.",
		);
		expect(savedText("Tipologia A", 1)).toBe(
			"Tipologia A salva. 1 unidade atualizada.",
		);
	});

	test("says only that it saved when no unit changed", () => {
		expect(savedText("Tipologia A", 0)).toBe("Tipologia A salva.");
	});
});
