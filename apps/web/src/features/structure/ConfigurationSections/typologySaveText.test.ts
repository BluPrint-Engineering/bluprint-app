import type { Typology } from "@bluprint/shared";
import { describe, expect, test } from "vitest";
import { followersText, savedText, unitsChangedText } from "./typologySaveText";

function typology(
	locationCount: number,
	changedLocationCount: number,
	locationType: Typology["locationType"] = "unit",
): Typology {
	return {
		id: "0190b000-0000-7000-8000-000000000001",
		name: locationType === "unit" ? "Tipologia A" : "Hall padrão",
		locationType,
		rooms: [],
		locationCount,
		changedLocationCount,
	};
}

describe("followersText", () => {
	test("counts units for a unit typology and common areas for a common-area one", () => {
		expect(followersText("unit", 1)).toBe("1 unidade");
		expect(followersText("unit", 44)).toBe("44 unidades");
		expect(followersText("common_area", 1)).toBe("1 área comum");
		expect(followersText("common_area", 0)).toBe("0 áreas comuns");
	});
});

describe("unitsChangedText", () => {
	test("says how many units change and that changed units keep their changes", () => {
		expect(unitsChangedText(typology(44, 1))).toBe(
			"Salvar muda as 44 unidades da Tipologia A. 1 unidade com alterações mantém o que foi mudado nela.",
		);
		expect(unitsChangedText(typology(44, 3))).toBe(
			"Salvar muda as 44 unidades da Tipologia A. 3 unidades com alterações mantêm o que foi mudado nelas.",
		);
	});

	test("leaves the changes out when no unit has any", () => {
		expect(unitsChangedText(typology(44, 0))).toBe(
			"Salvar muda as 44 unidades da Tipologia A.",
		);
	});

	test("agrees with a single unit and with none", () => {
		expect(unitsChangedText(typology(1, 0))).toBe(
			"Salvar muda 1 unidade da Tipologia A.",
		);
		expect(unitsChangedText(typology(0, 0))).toBe(
			"Nenhuma unidade usa a Tipologia A ainda.",
		);
	});

	test("speaks of common areas for a common-area typology", () => {
		expect(unitsChangedText(typology(12, 2, "common_area"))).toBe(
			"Salvar muda as 12 áreas comuns da Hall padrão. 2 áreas comuns com alterações mantêm o que foi mudado nelas.",
		);
		expect(unitsChangedText(typology(1, 1, "common_area"))).toBe(
			"Salvar muda 1 área comum da Hall padrão. 1 área comum com alterações mantém o que foi mudado nela.",
		);
		expect(unitsChangedText(typology(0, 0, "common_area"))).toBe(
			"Nenhuma área comum usa a Hall padrão ainda.",
		);
	});
});

describe("savedText", () => {
	test("counts the units updated", () => {
		expect(savedText(typology(44, 0), 44)).toBe(
			"Tipologia A salva. 44 unidades atualizadas.",
		);
		expect(savedText(typology(44, 0), 1)).toBe(
			"Tipologia A salva. 1 unidade atualizada.",
		);
	});

	test("counts the common areas updated", () => {
		expect(savedText(typology(12, 0, "common_area"), 12)).toBe(
			"Hall padrão salva. 12 áreas comuns atualizadas.",
		);
		expect(savedText(typology(12, 0, "common_area"), 1)).toBe(
			"Hall padrão salva. 1 área comum atualizada.",
		);
	});

	test("says only that it saved when no unit changed", () => {
		expect(savedText(typology(44, 0), 0)).toBe("Tipologia A salva.");
	});
});
