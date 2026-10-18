import {
	confirmParagraphs,
	confirmTitle,
	floorChildCounts,
	hasChildren,
	moveFailedText,
	NO_CHILDREN,
	removedText,
	removeFailedText,
	towerChildCounts,
	undoFailedText,
} from "./removeText";

describe("removedText", () => {
	test.each([
		["unit", "904", "Unidade 904 excluída."],
		["common_area", "Guarita", "Área comum Guarita excluída."],
		["floor", "9º andar", "9º andar excluído."],
		["tower", "Torre B", "Torre B excluída."],
	] as const)("says a %s was deleted", (type, name, text) => {
		expect(removedText(type, name)).toBe(text);
	});
});

describe("removeFailedText", () => {
	test.each([
		["unit", "904", "a unidade 904"],
		["common_area", "Guarita", "a área comum Guarita"],
		["floor", "9º andar", "o 9º andar"],
		["tower", "Torre B", "a Torre B"],
	] as const)("names the %s with its article", (type, name, subject) => {
		expect(removeFailedText(type, name)).toBe(
			`Não foi possível remover ${subject}. Confira sua conexão e tente de novo.`,
		);
	});
});

describe("undoFailedText", () => {
	test("says the reservation ran out", () => {
		expect(undoFailedText("unit", "904", "reserve")).toBe(
			"Não foi possível trazer a unidade 904 de volta: a reserva da obra acabou.",
		);
	});

	test("says the name is taken", () => {
		expect(undoFailedText("unit", "904", "name")).toBe(
			"Não foi possível trazer a unidade 904 de volta: o nome já está em uso.",
		);
	});

	test("asks to check the connection for any other failure", () => {
		expect(undoFailedText("floor", "9º andar", "other")).toBe(
			"Não foi possível trazer o 9º andar de volta. Confira sua conexão e tente de novo.",
		);
	});
});

describe("confirmTitle", () => {
	test("asks to delete the location with its article", () => {
		expect(confirmTitle("floor", "9º andar")).toBe("Excluir o 9º andar?");
		expect(confirmTitle("tower", "Torre B")).toBe("Excluir a Torre B?");
	});
});

describe("moveFailedText", () => {
	test("asks to check the connection", () => {
		expect(moveFailedText).toBe(
			"Não foi possível mover. Confira sua conexão e tente de novo.",
		);
	});
});

describe("hasChildren", () => {
	test("is false only when no count is left", () => {
		expect(hasChildren(NO_CHILDREN)).toBe(false);
		expect(hasChildren({ floors: 0, units: 0, commonAreas: 1 })).toBe(true);
		expect(hasChildren({ floors: 1, units: 0, commonAreas: 0 })).toBe(true);
	});
});

describe("confirmParagraphs", () => {
	test("counts the units and the common area of a floor and returns the units to the reservation", () => {
		expect(
			confirmParagraphs("floor", "9º andar", {
				floors: 0,
				units: 4,
				commonAreas: 1,
			}),
		).toEqual([
			"O 9º andar não tem pins, plantas nem dados. As 4 unidades e a área comum dele também são excluídas.",
			"As 4 unidades voltam para a reserva da obra.",
		]);
	});

	test("counts the floors, units and common areas of a tower", () => {
		expect(
			confirmParagraphs("tower", "Torre B", {
				floors: 10,
				units: 20,
				commonAreas: 1,
			}),
		).toEqual([
			"A Torre B não tem pins, plantas nem dados. Os 10 andares, as 20 unidades e a área comum dela também são excluídos.",
			"As 20 unidades voltam para a reserva da obra.",
		]);
	});

	test("writes each count in the singular when it is one", () => {
		expect(
			confirmParagraphs("floor", "9º andar", {
				floors: 0,
				units: 1,
				commonAreas: 0,
			}),
		).toEqual([
			"O 9º andar não tem pins, plantas nem dados. A unidade dele também é excluída.",
			"A unidade volta para a reserva da obra.",
		]);
	});

	test("leaves out a zero count and the reservation paragraph when there is no unit", () => {
		expect(
			confirmParagraphs("floor", "Térreo", {
				floors: 0,
				units: 0,
				commonAreas: 2,
			}),
		).toEqual([
			"O Térreo não tem pins, plantas nem dados. As 2 áreas comuns dele também são excluídas.",
		]);
		expect(
			confirmParagraphs("tower", "Torre A", {
				floors: 1,
				units: 0,
				commonAreas: 0,
			}),
		).toEqual([
			"A Torre A não tem pins, plantas nem dados. O andar dela também é excluído.",
		]);
	});
});

describe("child counts", () => {
	const unit = (name: string) => ({
		id: name,
		name,
		unitType: null,
		changes: 0,
	});
	const area = (name: string) => ({ id: name, name });
	const floor = (name: string, units: string[], areas: string[]) => ({
		id: name,
		name,
		units: units.map(unit),
		commonAreas: areas.map(area),
	});

	test("a floor counts its own units and common areas", () => {
		expect(floorChildCounts(floor("9º", ["901", "902"], ["Hall"]))).toEqual({
			floors: 0,
			units: 2,
			commonAreas: 1,
		});
	});

	test("a tower counts its floors, their units and every common area under it", () => {
		const tower = {
			id: "a",
			name: "Torre A",
			floors: [floor("1º", ["101", "102"], ["Hall"]), floor("2º", ["201"], [])],
			commonAreas: [area("Salão"), area("Academia")],
		};

		expect(towerChildCounts(tower)).toEqual({
			floors: 2,
			units: 3,
			commonAreas: 3,
		});
	});
});
