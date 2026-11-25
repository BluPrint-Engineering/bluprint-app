import { TYPOLOGY_NAME_MAX_LENGTH } from "@bluprint/shared";
import { describe, expect, test } from "vitest";
import { copiedTypologyName } from "./copiedTypologyName";

describe("copiedTypologyName", () => {
	test("suggests the plain copy name when nothing uses it", () => {
		expect(copiedTypologyName("Tipologia A", ["Tipologia A"])).toBe(
			"Tipologia A (cópia)",
		);
	});

	test("takes the next number after each name in use", () => {
		expect(
			copiedTypologyName("Tipologia A", ["Tipologia A", "Tipologia A (cópia)"]),
		).toBe("Tipologia A (cópia 2)");
		expect(
			copiedTypologyName("Tipologia A", [
				"Tipologia A",
				"Tipologia A (cópia)",
				"Tipologia A (cópia 2)",
			]),
		).toBe("Tipologia A (cópia 3)");
	});

	test("takes the first free name even when a later one is in use", () => {
		expect(copiedTypologyName("Tipologia A", ["Tipologia A (cópia 2)"])).toBe(
			"Tipologia A (cópia)",
		);
	});

	test("compares names ignoring case, spacing and accents", () => {
		expect(copiedTypologyName("Tipologia A", ["  TIPOLOGIA  A (COPIA) "])).toBe(
			"Tipologia A (cópia 2)",
		);
	});

	test("counts the names of both catalogs, which the caller passes together", () => {
		expect(
			copiedTypologyName("Hall padrão", ["Hall padrão", "Hall padrão (cópia)"]),
		).toBe("Hall padrão (cópia 2)");
	});

	test("cuts the original name to fit 60 characters", () => {
		const original = "A".repeat(TYPOLOGY_NAME_MAX_LENGTH);

		const name = copiedTypologyName(original, [original]);

		expect(name).toBe(`${"A".repeat(52)} (cópia)`);
		expect(name).toHaveLength(TYPOLOGY_NAME_MAX_LENGTH);
	});

	test("drops the space a cut leaves behind", () => {
		const original = `${"A".repeat(51)} ${"B".repeat(8)}`;

		expect(copiedTypologyName(original, [original])).toBe(
			`${"A".repeat(51)} (cópia)`,
		);
	});

	test("cuts again for a numbered name, which is longer", () => {
		const original = "A".repeat(TYPOLOGY_NAME_MAX_LENGTH);

		const name = copiedTypologyName(original, [
			original,
			`${"A".repeat(52)} (cópia)`,
		]);

		expect(name).toBe(`${"A".repeat(50)} (cópia 2)`);
	});
});
