import { describe, expect, test } from "vitest";
import { z } from "zod";
import { uuidV7 } from "./uuidV7";

describe("uuidV7", () => {
	test("is a valid UUID of version 7 and variant 1", () => {
		const id = uuidV7();

		expect(z.uuid().safeParse(id).success).toBe(true);
		expect(id[14]).toBe("7");
		expect("89ab").toContain(id[19]);
	});

	test("carries the millisecond timestamp in its first 48 bits", () => {
		const id = uuidV7(0x0190a0b0c0d0);

		expect(id.replaceAll("-", "").slice(0, 12)).toBe("0190a0b0c0d0");
	});

	test("differs between calls in the same millisecond", () => {
		expect(uuidV7(1)).not.toBe(uuidV7(1));
	});
});
