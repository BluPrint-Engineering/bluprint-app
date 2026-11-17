import {
	disciplinesFailedText,
	joinWithAnd,
	ownListSentence,
} from "./disciplinesText";

describe("joinWithAnd", () => {
	test.each([
		[["Hidráulica"], "Hidráulica"],
		[["Hidráulica", "Elétrica"], "Hidráulica e Elétrica"],
		[["Hidráulica", "Elétrica", "Pintura"], "Hidráulica, Elétrica e Pintura"],
	])("writes %j as %s", (names, text) => {
		expect(joinWithAnd(names)).toBe(text);
	});
});

describe("disciplinesFailedText", () => {
	test.each([
		["unit", "201", "As disciplinas da 201 não mudaram."],
		["common_area", "Hall", "As disciplinas do Hall não mudaram."],
		["floor", "2º andar", "As disciplinas do 2º andar não mudaram."],
		["tower", "Torre A", "As disciplinas da Torre A não mudaram."],
	] as const)("names a %s", (type, name, start) => {
		expect(disciplinesFailedText({ type, name })).toBe(
			`${start} Confira a conexão e tente de novo.`,
		);
	});
});

describe("ownListSentence", () => {
	test("has none for a unit or a common area", () => {
		expect(ownListSentence("unit")).toBeUndefined();
		expect(ownListSentence("common_area")).toBeUndefined();
	});
});
