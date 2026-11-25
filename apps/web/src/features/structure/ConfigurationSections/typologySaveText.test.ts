import type { Typology } from "@bluprint/shared";
import { describe, expect, test } from "vitest";
import {
	deleteInUseText,
	followersText,
	savedText,
	saveFailedText,
	unitsChangedText,
} from "./typologySaveText";

function typology(
	locationCount: number,
	changedLocationCount: number,
	locationType: Typology["locationType"] = "unit",
): Typology {
	return {
		id: "0190b000-0000-7000-8000-000000000001",
		name: locationType === "unit" ? "Tipologia B" : "Hall padrão",
		locationType,
		version: 1,
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
	test("says how many units change and that a changed location keeps its changes", () => {
		expect(unitsChangedText(typology(18, 0))).toBe(
			"Salvar muda as 18 unidades da Tipologia B. Um local com alterações mantém o que foi mudado nele.",
		);
		expect(unitsChangedText(typology(18, 3))).toBe(
			"Salvar muda as 18 unidades da Tipologia B. Um local com alterações mantém o que foi mudado nele.",
		);
	});

	test("agrees with a single unit and with none", () => {
		expect(unitsChangedText(typology(1, 0))).toBe(
			"Salvar muda 1 unidade da Tipologia B. Um local com alterações mantém o que foi mudado nele.",
		);
		expect(unitsChangedText(typology(0, 0))).toBe(
			"Nenhuma unidade usa a Tipologia B ainda.",
		);
	});

	test("speaks of common areas for a common-area typology", () => {
		expect(unitsChangedText(typology(16, 2, "common_area"))).toBe(
			"Salvar muda as 16 áreas comuns da Hall padrão. Um local com alterações mantém o que foi mudado nele.",
		);
		expect(unitsChangedText(typology(1, 1, "common_area"))).toBe(
			"Salvar muda 1 área comum da Hall padrão. Um local com alterações mantém o que foi mudado nele.",
		);
		expect(unitsChangedText(typology(0, 0, "common_area"))).toBe(
			"Nenhuma área comum usa a Hall padrão ainda.",
		);
	});
});

describe("savedText", () => {
	test("counts the units updated", () => {
		expect(savedText(typology(18, 0), 18)).toBe(
			"Tipologia B salva. 18 unidades atualizadas.",
		);
		expect(savedText(typology(18, 0), 1)).toBe(
			"Tipologia B salva. 1 unidade atualizada.",
		);
	});

	test("counts the common areas updated", () => {
		expect(savedText(typology(16, 0, "common_area"), 16)).toBe(
			"Hall padrão salva. 16 áreas comuns atualizadas.",
		);
		expect(savedText(typology(16, 0, "common_area"), 1)).toBe(
			"Hall padrão salva. 1 área comum atualizada.",
		);
	});

	test("says only that it saved when no unit changed", () => {
		expect(savedText(typology(18, 0), 0)).toBe("Tipologia B salva.");
	});
});

describe("saveFailedText", () => {
	test("says the typology did not change", () => {
		expect(saveFailedText(typology(18, 0))).toBe(
			"A Tipologia B não mudou. Confira a conexão e tente de novo.",
		);
	});
});

describe("deleteInUseText", () => {
	test("names the kind of location that began to use it", () => {
		expect(deleteInUseText(typology(0, 0))).toBe(
			"Não foi possível excluir a Tipologia B: unidades passaram a usá-la.",
		);
		expect(deleteInUseText(typology(0, 0, "common_area"))).toBe(
			"Não foi possível excluir a Hall padrão: áreas comuns passaram a usá-la.",
		);
	});
});
