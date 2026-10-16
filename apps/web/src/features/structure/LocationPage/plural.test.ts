import { plural } from "./plural";

describe("plural", () => {
	test.each([
		[0, "0 unidades"],
		[1, "1 unidade"],
		[2, "2 unidades"],
		[48, "48 unidades"],
	])("writes %i as %s", (count, text) => {
		expect(plural(count, "unidade", "unidades")).toBe(text);
	});
});
