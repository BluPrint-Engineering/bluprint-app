import { floorLabel, floorSummary, isNumberedFloor } from "./floorLabel";

describe("floorLabel", () => {
	test.each([
		["9º andar", "9º"],
		["13º andar", "13º"],
		["1º Andar", "1º"],
		["12º   andar", "12º"],
		["Térreo", "Térreo"],
		["Cobertura", "Cobertura"],
		["Subsolo 2", "Subsolo 2"],
		["Mezanino", "Mezanino"],
		["andar", "andar"],
	])("turns %s into %s", (name, label) => {
		expect(floorLabel(name)).toBe(label);
	});
});

describe("isNumberedFloor", () => {
	test.each([
		["9º", true],
		["Térreo", false],
		["º", false],
		["9", false],
	])("%s is %s", (label, numbered) => {
		expect(isNumberedFloor(label)).toBe(numbered);
	});
});

describe("floorSummary", () => {
	test("says there are none for a tower without floors", () => {
		expect(floorSummary([])).toBe("nenhum");
	});

	test("joins the ground floor and a run of numbered floors", () => {
		expect(
			floorSummary([
				"Térreo",
				...Array.from({ length: 12 }, (_, i) => `${i + 1}º andar`),
			]),
		).toBe("Térreo e 1º ao 12º");
	});

	test("lists a renamed top floor and a basement by name", () => {
		expect(
			floorSummary([
				"Subsolo",
				"Térreo",
				"1º andar",
				"2º andar",
				"3º andar",
				"Cobertura",
			]),
		).toBe("Subsolo, Térreo, 1º ao 3º e Cobertura");
	});

	test("names a single numbered floor", () => {
		expect(floorSummary(["1º andar"])).toBe("1º");
	});

	test("breaks a run where a number is missing", () => {
		expect(floorSummary(["1º andar", "2º andar", "4º andar", "5º andar"])).toBe(
			"1º ao 2º e 4º ao 5º",
		);
	});

	test("breaks a run where a named floor sits between numbers", () => {
		expect(floorSummary(["1º andar", "Mezanino", "2º andar"])).toBe(
			"1º, Mezanino e 2º",
		);
	});
});
