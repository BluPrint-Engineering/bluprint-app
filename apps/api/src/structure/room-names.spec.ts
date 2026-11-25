import { rankRoomNames } from "./room-names";

const row = (key: string, name: string, uses: number, oldest_id: string) => ({
	key,
	name,
	uses,
	oldest_id,
});

describe("rankRoomNames", () => {
	it("is empty without rows", () => {
		expect(rankRoomNames([])).toEqual([]);
	});

	it("spells a name the way most rooms do and counts every spelling", () => {
		expect(
			rankRoomNames([
				row("suite", "Suite", 1, "2"),
				row("suite", "Suíte", 2, "3"),
				row("sala", "Sala", 2, "1"),
			]),
		).toEqual(["Suíte", "Sala"]);
	});

	it("breaks a tie between spellings with the oldest", () => {
		expect(
			rankRoomNames([
				row("suite", "Suíte", 1, "5"),
				row("suite", "Suite", 1, "4"),
			]),
		).toEqual(["Suite"]);
	});

	it("lists the most used first and the oldest first on a tie", () => {
		expect(
			rankRoomNames([
				row("copa", "Copa", 1, "3"),
				row("box 1", "Box 1", 1, "2"),
				row("sala", "Sala", 3, "9"),
			]),
		).toEqual(["Sala", "Box 1", "Copa"]);
	});
});
