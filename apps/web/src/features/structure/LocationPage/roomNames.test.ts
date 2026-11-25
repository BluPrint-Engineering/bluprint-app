import { describe, expect, test } from "vitest";
import { roomNameError, roomNameTakenText } from "./roomNames";

describe("roomNameError", () => {
	test("accepts a name of 1 to 60 characters once trimmed", () => {
		expect(roomNameError("  Sala  ")).toBeUndefined();
		expect(roomNameError("x".repeat(60))).toBeUndefined();
	});

	test("asks for a name when it is blank", () => {
		expect(roomNameError("   ")).toBe("Informe o nome do cômodo.");
	});

	test("refuses a name past 60 characters", () => {
		expect(roomNameError("x".repeat(61))).toBe(
			"O nome pode ter até 60 caracteres.",
		);
	});
});

describe("roomNameTakenText", () => {
	test("names the unit or the common area", () => {
		expect(roomNameTakenText("unit")).toBe("Esse cômodo já está na unidade.");
		expect(roomNameTakenText("common_area")).toBe(
			"Esse cômodo já está na área comum.",
		);
	});
});
