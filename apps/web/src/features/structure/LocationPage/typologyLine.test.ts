import { changesLabel, typologyLine } from "./typologyLine";

const typeA = { id: "type-a", name: "Tipologia A" };

describe("typologyLine", () => {
	test("says a unit has no typology", () => {
		expect(typologyLine({ typology: null, changes: 0 })).toBe("Sem tipologia");
	});

	test("names the typology alone when the unit has no changes", () => {
		expect(typologyLine({ typology: typeA, changes: 0 })).toBe("Tipologia A");
	});

	test("adds the changes in the singular for one", () => {
		expect(typologyLine({ typology: typeA, changes: 1 })).toBe(
			"Tipologia A · 1 alteração",
		);
	});

	test("adds the changes in the plural for more than one", () => {
		expect(typologyLine({ typology: typeA, changes: 2 })).toBe(
			"Tipologia A · 2 alterações",
		);
	});
});

describe("changesLabel", () => {
	test("counts changes in the singular and the plural", () => {
		expect([changesLabel(1), changesLabel(3)]).toEqual([
			"1 alteração",
			"3 alterações",
		]);
	});
});
