import { describe, expect, test } from "vitest";
import {
	nameProblem,
	nextTowerName,
	nextUnitName,
	renameLabel,
	renameTitle,
	takenText,
	uniqueHint,
} from "./naming";

describe("nextTowerName", () => {
	test("starts at Torre A on a project without towers", () => {
		expect(nextTowerName([])).toBe("Torre A");
	});

	test("takes the next letter after the towers that exist", () => {
		expect(nextTowerName(["Torre A"])).toBe("Torre B");
		expect(nextTowerName(["Torre A", "Torre B"])).toBe("Torre C");
	});

	test("fills a letter that was freed by a rename", () => {
		expect(nextTowerName(["Torre B", "Bloco Azul"])).toBe("Torre A");
	});

	test("ignores capital letters and repeated spaces in the names that exist", () => {
		expect(nextTowerName(["torre  a"])).toBe("Torre B");
	});

	test("suggests nothing once the alphabet is spent", () => {
		const all = Array.from(
			{ length: 26 },
			(_, i) => `Torre ${String.fromCharCode(65 + i)}`,
		);
		expect(nextTowerName(all)).toBe("");
	});
});

describe("nextUnitName", () => {
	test("continues the number of the last unit on the floor", () => {
		expect(nextUnitName("9º andar", ["901", "902", "903", "904"], [])).toBe(
			"905",
		);
	});

	test("continues a lettered floor", () => {
		expect(nextUnitName("1º andar", ["1A", "1B"], [])).toBe("1C");
	});

	test("keeps the zeros of the number it continues", () => {
		expect(nextUnitName("1º andar", ["Loja 08", "Loja 09"], [])).toBe(
			"Loja 10",
		);
	});

	test("starts a floor without units from its number", () => {
		expect(nextUnitName("9º andar", [], [])).toBe("901");
	});

	test("starts a lettered tower's empty floor on the letter A", () => {
		expect(nextUnitName("9º andar", [], ["1A", "1B"])).toBe("9A");
	});

	test("suggests nothing for a floor that has no number", () => {
		expect(nextUnitName("Cobertura", [], ["101"])).toBe("");
	});

	test("skips a name another floor of the tower already took", () => {
		expect(nextUnitName("9º andar", ["901", "902"], ["903", "904"])).toBe(
			"905",
		);
	});

	test("suggests nothing after the last letter", () => {
		expect(nextUnitName("1º andar", ["1Z"], [])).toBe("");
	});

	test("suggests nothing when the last name has no number to continue", () => {
		expect(nextUnitName("1º andar", ["Loja"], [])).toBe("");
	});
});

describe("nameProblem", () => {
	test("asks for a name when it is empty or blank", () => {
		expect(nameProblem("")).toBe("Informe o nome.");
		expect(nameProblem("   ")).toBe("Informe o nome.");
	});

	test("refuses a name past 60 characters once trimmed", () => {
		expect(nameProblem("x".repeat(61))).toBe("Use até 60 caracteres.");
		expect(nameProblem(` ${"x".repeat(60)} `)).toBeUndefined();
	});
});

describe("takenText", () => {
	test("names the unit and its tower", () => {
		expect(takenText("unit", "903", "tower", "Torre A")).toBe(
			"Já existe a unidade 903 na Torre A.",
		);
	});

	test("hides the tower's name when the obra has a single tower", () => {
		expect(takenText("unit", "903", "tower")).toBe(
			"Já existe a unidade 903 nesta torre.",
		);
	});

	test("says the floor with its own word, once", () => {
		expect(takenText("floor", "12º andar", "tower", "Torre A")).toBe(
			"Já existe o 12º andar na Torre A.",
		);
		expect(takenText("floor", "Cobertura", "tower", "Torre A")).toBe(
			"Já existe o andar Cobertura na Torre A.",
		);
	});

	test("places a common area under the obra, a tower or a floor", () => {
		expect(takenText("common_area", "Guarita", "project")).toBe(
			"Já existe uma área comum Guarita na obra.",
		);
		expect(takenText("common_area", "Salão", "tower", "Torre A")).toBe(
			"Já existe uma área comum Salão na Torre A.",
		);
		expect(takenText("common_area", "Hall", "floor")).toBe(
			"Já existe uma área comum Hall neste andar.",
		);
	});

	test("needs no place for a tower", () => {
		expect(takenText("tower", "Torre B", "project")).toBe(
			"Já existe uma torre com o nome Torre B.",
		);
	});
});

describe("wording per kind", () => {
	test("titles the rename dialog and labels its menu item", () => {
		expect(renameTitle("unit")).toBe("Renomear a unidade");
		expect(renameTitle("floor")).toBe("Renomear o andar");
		expect(renameLabel("tower")).toBe("Renomear torre");
		expect(renameLabel("common_area")).toBe("Renomear");
	});

	test("tells where a name has to be unique", () => {
		expect(uniqueHint("tower")).toBe("Único na torre.");
		expect(uniqueHint("project")).toBe("Único na obra.");
		expect(uniqueHint("floor")).toBe("Único no andar.");
	});
});
