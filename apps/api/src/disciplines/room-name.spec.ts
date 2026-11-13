import { comparableRoomName, sameRoomName } from "@bluprint/shared";

describe("room and discipline names", () => {
	test.each([
		["Suíte", "suite", true],
		["Suíte", "SUÍTE", true],
		["Sala de estar", "Sala  de  estar", true],
		[" Pintura ", "pintura", true],
		["Quarto", "Quarto 2", false],
		["Área", "Aérea", false],
		["Elétrica", "Eletrica", true],
	])("%j and %j: same name is %s", (a, b, same) => {
		expect(sameRoomName(a, b)).toBe(same);
	});

	test("the comparable form drops accents, case and repeated spaces", () => {
		expect(comparableRoomName("  Sala  de  Ênfase ")).toBe("sala de enfase");
	});
});
