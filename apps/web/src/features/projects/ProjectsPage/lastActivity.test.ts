import { describe, expect, test } from "vitest";
import { formatLastActivity } from "./lastActivity";

const NOW = Date.parse("2026-03-10T12:00:00.000Z");

function ago(ms: number) {
	return new Date(NOW - ms).toISOString();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatLastActivity", () => {
	test.each([
		[0, "Atividade agora"],
		[59_000, "Atividade agora"],
		[MINUTE, "Atividade há 1 min"],
		[25 * MINUTE, "Atividade há 25 min"],
		[59 * MINUTE + 59_000, "Atividade há 59 min"],
		[HOUR, "Atividade há 1 h"],
		[2 * HOUR + 40 * MINUTE, "Atividade há 2 h"],
		[23 * HOUR + 59 * MINUTE, "Atividade há 23 h"],
		[DAY, "Atividade há 1 dia"],
		[3 * DAY + 5 * HOUR, "Atividade há 3 dias"],
		[45 * DAY, "Atividade há 45 dias"],
	])("%i ms ago reads %s", (elapsed, expected) => {
		expect(formatLastActivity(ago(elapsed), NOW)).toBe(expected);
	});

	test("a clock a little behind the server's never reads as the future", () => {
		expect(formatLastActivity(ago(-30_000), NOW)).toBe("Atividade agora");
	});
});
