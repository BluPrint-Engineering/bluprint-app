import {
	addUnitLine,
	createdToast,
	nameTakenText,
	overReserveText,
	planLine,
} from "./reserveText";

const plain = (text: string) => text.replace(/ /g, " ");

describe("addUnitLine", () => {
	test("says the one unit it uses of what remains", () => {
		expect(addUnitLine(12)).toBe(
			"Usa 1 das 12 unidades que restam nesta obra.",
		);
	});

	test("says the only unit left in the singular", () => {
		expect(addUnitLine(1)).toBe("Usa 1 da única unidade que resta nesta obra.");
	});

	test("says the reserva is over when nothing remains", () => {
		expect(addUnitLine(0)).toBe("A reserva da obra acabou.");
	});
});

describe("planLine", () => {
	test("says what the plan uses and what is left after creating", () => {
		expect(plain(planLine(88, 150, "criar"))).toBe(
			"Usa 88 das 150 unidades que restam nesta obra. Depois de criar, sobram 62.",
		);
	});

	test("uses the singular when one unit is left and it all fits", () => {
		expect(plain(planLine(1, 1, "criar"))).toBe(
			"Usa 1 da única unidade que resta nesta obra. Depois de criar, sobram 0.",
		);
		expect(plain(planLine(11, 12, "adicionar"))).toBe(
			"Usa 11 das 12 unidades que restam nesta obra. Depois de adicionar, sobra 1.",
		);
	});

	test("reads only what remains when the plan does not fit or is empty", () => {
		expect(planLine(88, 40, "criar")).toBe("Restam 40 unidades nesta obra.");
		expect(planLine(0, 40, "criar")).toBe("Restam 40 unidades nesta obra.");
		expect(planLine(3, 1, "criar")).toBe("Resta 1 unidade nesta obra.");
	});

	test("says the reservation is over when nothing is left", () => {
		expect(planLine(5, 0, "criar")).toBe("A reserva da obra acabou.");
	});
});

describe("overReserveText", () => {
	test("tells a manager or assistant to take units out or ask the admin", () => {
		expect(plain(overReserveText(88, 40, false))).toBe(
			"Esta estrutura tem 88 unidades e a obra tem 40. Tire 48 unidades ou peça mais reserva ao admin da construtora.",
		);
	});

	test("tells the admin to raise the reservation", () => {
		expect(plain(overReserveText(88, 40, true))).toBe(
			"Esta estrutura tem 88 unidades e a obra tem 40. Tire 48 unidades ou aumente a reserva.",
		);
	});

	test("changes the sentence when the reservation is over", () => {
		expect(overReserveText(88, 0, false)).toBe(
			"Esta estrutura tem 88 unidades e a reserva da obra acabou. Peça mais reserva ao admin da construtora.",
		);
		expect(overReserveText(88, 0, true)).toBe(
			"Esta estrutura tem 88 unidades e a reserva da obra acabou. Aumente a reserva.",
		);
	});

	test("takes one unit out in the singular", () => {
		expect(plain(overReserveText(5, 4, false))).toContain("Tire 1 unidade ou");
	});
});

describe("createdToast", () => {
	test("counts towers and units", () => {
		expect(createdToast(2, 88)).toBe(
			"Estrutura criada: 2 torres e 88 unidades.",
		);
		expect(createdToast(1, 1)).toBe("Estrutura criada: 1 torre e 1 unidade.");
	});
});

describe("nameTakenText", () => {
	test("names one clash", () => {
		expect(nameTakenText(["Torre A"])).toBe(
			"Já existe um local com o nome “Torre A”. Troque esse nome e tente de novo.",
		);
	});

	test("names several clashes", () => {
		expect(nameTakenText(["Torre A", "Guarita", "101"])).toBe(
			"Já existe um local com os nomes “Torre A”, “Guarita” e “101”. Troque esses nomes e tente de novo.",
		);
	});
});
