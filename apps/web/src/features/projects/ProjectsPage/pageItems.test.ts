import { describe, expect, test } from "vitest";
import { pageItems } from "./pageItems";

describe("pageItems", () => {
	test("lists every page when there are 7 or fewer", () => {
		expect(pageItems(1, 3)).toEqual([1, 2, 3]);
		expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	test.each([
		[1, [1, 2, 3, 4, 5, "gap-end", 12]],
		[3, [1, 2, 3, 4, 5, "gap-end", 12]],
		[4, [1, "gap-start", 3, 4, 5, "gap-end", 12]],
		[9, [1, "gap-start", 8, 9, 10, "gap-end", 12]],
		[10, [1, "gap-start", 8, 9, 10, 11, 12]],
		[12, [1, "gap-start", 8, 9, 10, 11, 12]],
	])("keeps page %i of 12 within 7 slots", (page, expected) => {
		expect(pageItems(page, 12)).toEqual(expected);
	});
});
