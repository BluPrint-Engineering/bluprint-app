import { PROJECT_ORIGIN, readLocationSearch } from "./origin";

const ID = "0190b000-0000-7000-8000-000000000001";

describe("readLocationSearch", () => {
	test("keeps a location id as the origin", () => {
		expect(readLocationSearch({ from: ID })).toEqual({ from: ID });
	});

	test("keeps the project as the origin", () => {
		expect(readLocationSearch({ from: PROJECT_ORIGIN })).toEqual({
			from: PROJECT_ORIGIN,
		});
	});

	test.each([
		["absent", {}],
		["not an id", { from: "torre-b" }],
		["empty", { from: "" }],
		["not a string", { from: 7 }],
		["a list", { from: [ID] }],
	])("drops an origin that is %s", (_, search) => {
		expect(readLocationSearch(search)).toEqual({});
	});

	test("drops every other param", () => {
		expect(readLocationSearch({ from: ID, page: "2" })).toEqual({ from: ID });
	});
});
