import { describe, expect, it } from "vitest";
import {
	type RoomSuggestionGroup,
	SUGGESTED_ROOMS,
	spellRoom,
	suggestRooms,
} from "./roomSuggestions";

const suggest = (typed: string, used: string[], present: string[]) =>
	suggestRooms({ typed, suggested: SUGGESTED_ROOMS, used, present });

const group = (
	id: RoomSuggestionGroup["id"],
	...names: string[]
): RoomSuggestionGroup => ({ id, names });

describe("suggestRooms", () => {
	it("keeps the fixed list in the agreed order", () => {
		expect(SUGGESTED_ROOMS).toEqual([
			"Cozinha",
			"Sala",
			"Suíte",
			"Quarto",
			"Banheiro",
			"Lavabo",
			"Sacada",
			"Varanda",
		]);
	});

	it.each([
		["", [], undefined],
		["   ", [], undefined],
	])("opens nothing for %j", (typed, groups, add) => {
		expect(suggest(typed, ["Salão"], [])).toEqual({ groups, add });
	});

	it("offers the fixed names and the used ones that start a word", () => {
		expect(suggest("sa", ["Salão", "Casa", "Box 1"], [])).toEqual({
			groups: [group("suggested", "Sala", "Sacada"), group("used", "Salão")],
			add: "sa",
		});
	});

	it("gives the same list for an accented, capitalised or padded text", () => {
		const expected = suggest("sa", ["Salão"], []).groups;

		expect(suggest("SÁ", ["Salão"], []).groups).toEqual(expected);
		expect(suggest("  sá ", ["Salão"], []).groups).toEqual(expected);
	});

	it("does not match inside a word", () => {
		expect(suggest("al", ["Salão"], [])).toEqual({
			groups: [],
			add: "al",
		});
	});

	it("matches the start of a later word and a text with spaces", () => {
		expect(suggest("est", ["Sala de estar"], [])).toEqual({
			groups: [group("used", "Sala de estar")],
			add: "est",
		});
		expect(suggest("sala d", ["Sala de estar"], [])).toEqual({
			groups: [group("used", "Sala de estar")],
			add: "sala d",
		});
	});

	it("offers only the text when nothing matches", () => {
		expect(suggest("casa", ["Salão"], [])).toEqual({
			groups: [],
			add: "casa",
		});
	});

	it("moves what is already in the list to its own group, marked apart", () => {
		expect(suggest("sa", ["Salão"], ["Sala", "Sacada"])).toEqual({
			groups: [group("used", "Salão"), group("present", "Sala", "Sacada")],
			add: "sa",
		});
	});

	it("finds Lavanderia in the list and Lavabo to suggest", () => {
		expect(suggest("lav", [], ["Lavanderia"])).toEqual({
			groups: [group("suggested", "Lavabo"), group("present", "Lavanderia")],
			add: "lav",
		});
	});

	it("removes a used name from the used group when it is a fixed name or in the list", () => {
		expect(suggest("su", ["Suite", "Suporte", "Suco"], ["Suco"])).toEqual({
			groups: [
				group("suggested", "Suíte"),
				group("used", "Suporte"),
				group("present", "Suco"),
			],
			add: "su",
		});
		expect(suggest("su", ["Suite", "Suporte"], []).groups).toEqual([
			group("suggested", "Suíte"),
			group("used", "Suporte"),
		]);
	});

	it("does not offer the text when it is a known name, ignoring accents and case", () => {
		expect(suggest("SUITE", [], []).add).toBeUndefined();
		expect(suggest("box  1", ["Box 1"], []).add).toBeUndefined();
		expect(suggest("copa", [], ["Copa"]).add).toBeUndefined();
	});

	it("offers the tidy text when it is new", () => {
		expect(suggest("  Sala   de  estar ", [], []).add).toBe("Sala de estar");
	});

	it("shows at most six per group in the order they came", () => {
		const used = ["Sa1", "Sa2", "Sa3", "Sa4", "Sa5", "Sa6", "Sa7", "Sa8"];
		const present = ["Sb1", "Sb2", "Sb3", "Sb4", "Sb5", "Sb6", "Sb7"];

		expect(suggest("s", used, present).groups).toEqual([
			group("suggested", "Sala", "Suíte", "Sacada"),
			group("used", "Sa1", "Sa2", "Sa3", "Sa4", "Sa5", "Sa6"),
			group("present", "Sb1", "Sb2", "Sb3", "Sb4", "Sb5", "Sb6"),
		]);
	});

	it("knows the names the six-per-group cut left out", () => {
		const used = ["Sa1", "Sa2", "Sa3", "Sa4", "Sa5", "Sa6", "Sa7"];

		expect(suggest("sa7", used, []).add).toBeUndefined();
		expect(suggest("sa7", used, []).groups).toEqual([group("used", "Sa7")]);
		expect(suggest("sa", used, []).groups[1]?.names).not.toContain("Sa7");
		expect(suggest("sa", used, []).add).toBe("sa");
	});
});

describe("spellRoom", () => {
	const spell = (typed: string, used: string[] = []) =>
		spellRoom({ typed, suggested: SUGGESTED_ROOMS, used });

	it.each([
		["lavabo", "Lavabo"],
		["SUITE", "Suíte"],
		["  cozinha ", "Cozinha"],
	])("spells %j as the fixed list does", (typed, expected) => {
		expect(spell(typed)).toBe(expected);
	});

	it("spells it as the project does when the fixed list has no such name", () => {
		expect(spell("box 1", ["Box 1"])).toBe("Box 1");
		expect(spell("salao", ["Salão"])).toBe("Salão");
	});

	it("prefers the fixed list to the project's spelling", () => {
		expect(spell("suite", ["Suite"])).toBe("Suíte");
	});

	it("tidies a text nobody knows and keeps it as typed", () => {
		expect(spell(" Sala   de  estar ")).toBe("Sala de estar");
		expect(spell("Copa")).toBe("Copa");
	});
});
