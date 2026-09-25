import { readdirSync } from "node:fs";
import { join } from "node:path";
import * as schema from "./schema";

const src = join(__dirname, "..");
const entityFiles = readdirSync(src, { recursive: true, encoding: "utf8" })
	.filter((file) => file.endsWith(".entity.ts"))
	.sort();

describe("schema barrel", () => {
	test("finds the entity files it checks", () => {
		expect(entityFiles.length).toBeGreaterThan(0);
	});

	test.each(entityFiles)("re-exports everything %s defines", async (file) => {
		const entity = (await import(join(src, file))) as Record<string, unknown>;
		const barrel = schema as Record<string, unknown>;

		for (const [name, value] of Object.entries(entity)) {
			expect(barrel[name]).toBe(value);
		}
	});
});
