import {
	addOneLine,
	createdToast,
	missingReserveText,
	missingReserveTitle,
	nameTakenText,
	reserveDetail,
	reserveLine,
} from "./reserveText";

const plain = (text: string) => text.replace(/ /g, " ");

describe("addOneLine", () => {
	test("says the one unit it uses of what remains", () => {
		expect(addOneLine(12)).toBe("Usa 1 das 12 unidades que restam nesta obra.");
	});

	test("says the only unit left in the singular", () => {
		expect(addOneLine(1)).toBe("Usa 1 da única unidade que resta nesta obra.");
	});

	test("says the reserva is over when nothing remains", () => {
		expect(addOneLine(0)).toBe("A reserva da obra acabou.");
	});
});

describe("reserveLine", () => {
	test("says what the structure uses of the reservation and what is left after creating", () => {
		expect(plain(reserveLine(81, 400, 400, "create"))).toBe(
			"Esta estrutura usa 81 de 400 reservadas. Depois de criar, sobram 319.",
		);
		expect(plain(reserveLine(80, 400, 81, "create"))).toBe(
			"Esta estrutura usa 80 de 400 reservadas. Depois de criar, sobra 1.",
		);
	});

	test("says what the new floors use of what remains and what is left after adding", () => {
		expect(plain(reserveLine(4, 400, 319, "add"))).toBe(
			"Estes andares usam 4 das 319 que restam na reserva. Depois de adicionar, sobram 315.",
		);
		expect(plain(reserveLine(1, 400, 1, "add"))).toBe(
			"Estes andares usam 1 da 1 que resta na reserva. Depois de adicionar, sobram 0.",
		);
	});

	test("drops what is left when the plan does not fit", () => {
		expect(plain(reserveLine(81, 400, 30, "create"))).toBe(
			"Esta estrutura usa 81 de 400 reservadas.",
		);
		expect(plain(reserveLine(4, 400, 2, "add"))).toBe(
			"Estes andares usam 4 de 400 reservadas.",
		);
	});
});

describe("reserveDetail", () => {
	test("adds up units, floor halls, entrance halls and the other common areas", () => {
		expect(
			reserveDetail({
				units: 61,
				floorHalls: 16,
				entranceHalls: 2,
				otherAreas: 2,
			}),
		).toBe(
			"61 unidades + 16 halls de andar + 2 halls de entrada + 2 outras áreas comuns",
		);
	});

	test("leaves out the parts that are zero and speaks each one in the singular", () => {
		expect(
			reserveDetail({
				units: 2,
				floorHalls: 2,
				entranceHalls: 0,
				otherAreas: 0,
			}),
		).toBe("2 unidades + 2 halls de andar");
		expect(
			reserveDetail({
				units: 1,
				floorHalls: 1,
				entranceHalls: 1,
				otherAreas: 1,
			}),
		).toBe(
			"1 unidade + 1 hall de andar + 1 hall de entrada + 1 outra área comum",
		);
		expect(
			reserveDetail({
				units: 0,
				floorHalls: 0,
				entranceHalls: 0,
				otherAreas: 0,
			}),
		).toBe("");
	});
});

describe("the missing reservation", () => {
	test("counts what is missing in units, in the singular for one", () => {
		expect(missingReserveTitle(51)).toBe("Faltam 51 unidades na reserva");
		expect(missingReserveTitle(1)).toBe("Falta 1 unidade na reserva");
	});

	test("says what the plan uses against what the project still has", () => {
		expect(plain(missingReserveText(81, 30, "create"))).toBe(
			"Esta estrutura usa 81 e a obra ainda tem 30.",
		);
		expect(plain(missingReserveText(4, 2, "add"))).toBe(
			"Estes andares usam 4 e a obra ainda tem 2.",
		);
	});

	test("says the reservation is over when nothing is left", () => {
		expect(plain(missingReserveText(81, 0, "create"))).toBe(
			"Esta estrutura usa 81 e a reserva da obra acabou.",
		);
		expect(plain(missingReserveText(4, 0, "add"))).toBe(
			"Estes andares usam 4 e a reserva da obra acabou.",
		);
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
