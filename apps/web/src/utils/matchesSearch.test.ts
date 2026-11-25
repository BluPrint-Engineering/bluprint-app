import { describe, expect, test } from "vitest";
import { matchesSearch } from "./matchesSearch";

describe("matchesSearch", () => {
	test.each([
		["Hall padrão", "hall"],
		["Hall padrão", "HALL"],
		["Hall padrão", "háll"],
		["Hall padrão", "padrao"],
		["Hall padrão", "  all  pa "],
		["Suíte master", "suite"],
		["Tipologia B", ""],
		["Tipologia B", "   "],
	])("finds %s by %j", (text, search) => {
		expect(matchesSearch(text, search)).toBe(true);
	});

	test.each([
		["Hall padrão", "corredor"],
		["Tipologia B", "tipologia c"],
		["Garden", "gardens"],
	])("does not find %s by %j", (text, search) => {
		expect(matchesSearch(text, search)).toBe(false);
	});
});
