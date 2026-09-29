import { describe, expect, test } from "vitest";
import {
	DEFAULT_FILTERS,
	type ProjectsFilters,
	readSearch,
	writeSearch,
} from "./filters";

const narrowed: ProjectsFilters = {
	q: "edificio aurora",
	status: "all",
	sort: "name",
	manager: "u-carla",
};

describe("the projects address", () => {
	test("an empty address reads as the first page with the default filters", () => {
		expect(readSearch({})).toEqual({ page: 1, filters: DEFAULT_FILTERS });
	});

	test("the defaults are the API's: in progress, newest first, no search, every manager", () => {
		expect(DEFAULT_FILTERS).toEqual({
			q: "",
			status: "active",
			sort: "recent",
			manager: undefined,
		});
	});

	test("leaves every default out", () => {
		expect(writeSearch({ page: 1, filters: DEFAULT_FILTERS })).toEqual({
			page: undefined,
			q: undefined,
			status: undefined,
			sort: undefined,
			manager: undefined,
		});
	});

	test("reads back what it writes", () => {
		const written = writeSearch({ page: 3, filters: narrowed });

		expect(written).toEqual({ page: 3, ...narrowed });
		expect(readSearch(written)).toEqual({ page: 3, filters: narrowed });
	});

	test("keeps “Todas” and “Entregue”, which are not the default", () => {
		expect(readSearch({ status: "all" }).filters.status).toBe("all");
		expect(readSearch({ status: "delivered" }).filters.status).toBe(
			"delivered",
		);
	});

	test.each([1, 0, -1, 1.5, "abc", "", null])(
		"falls back to the first page for page=%j",
		(page) => {
			expect(readSearch({ page }).page).toBe(1);
		},
	);

	test("reads a page given as text", () => {
		expect(readSearch({ page: "4" }).page).toBe(4);
	});

	test.each(["recent", "Name", "open-pins", ""])(
		"falls back to the newest first for sort=%j",
		(sort) => {
			expect(readSearch({ sort }).filters.sort).toBe("recent");
		},
	);

	test.each(["active", "Delivered", "done", ""])(
		"falls back to the projects in progress for status=%j",
		(status) => {
			expect(readSearch({ status }).filters.status).toBe("active");
		},
	);

	test("trims the search", () => {
		expect(readSearch({ q: "  aurora " }).filters.q).toBe("aurora");
	});

	test.each(["", "   ", "a".repeat(101), 42])(
		"falls back to no search for q=%j",
		(q) => {
			expect(readSearch({ q }).filters.q).toBe("");
		},
	);

	test.each(["", 7])(
		"falls back to every manager for manager=%j",
		(manager) => {
			expect(readSearch({ manager }).filters.manager).toBeUndefined();
		},
	);
});
