import { changesLabel, unitTypeLine } from "./unitTypeLine";

const typeA = { id: "type-a", name: "Tipologia A" };

describe("unitTypeLine", () => {
	test("says a unit has no unit type", () => {
		expect(unitTypeLine({ unitType: null, changes: 0 })).toBe("Sem tipologia");
	});

	test("names the unit type alone when the unit has no changes", () => {
		expect(unitTypeLine({ unitType: typeA, changes: 0 })).toBe("Tipologia A");
	});

	test("adds the changes in the singular for one", () => {
		expect(unitTypeLine({ unitType: typeA, changes: 1 })).toBe(
			"Tipologia A · 1 alteração",
		);
	});

	test("adds the changes in the plural for more than one", () => {
		expect(unitTypeLine({ unitType: typeA, changes: 2 })).toBe(
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
