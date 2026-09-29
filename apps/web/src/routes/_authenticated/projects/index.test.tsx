import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import { setViewport } from "@/test/viewport";

function lastRequest(fetchMock: ReturnType<typeof stubApi>["fetchMock"]) {
	return fetchMock.mock.calls
		.map(([input]) => new URL(String(input), "http://localhost"))
		.filter((url) => url.pathname === "/api/projects")
		.at(-1)?.searchParams;
}

function requestedPage(fetchMock: ReturnType<typeof stubApi>["fetchMock"]) {
	return lastRequest(fetchMock)?.get("page");
}

function requestedQuery(fetchMock: ReturnType<typeof stubApi>["fetchMock"]) {
	return lastRequest(fetchMock)?.get("q");
}

function requestedSort(fetchMock: ReturnType<typeof stubApi>["fetchMock"]) {
	return lastRequest(fetchMock)?.get("sort");
}

function requestedStatus(fetchMock: ReturnType<typeof stubApi>["fetchMock"]) {
	return lastRequest(fetchMock)?.get("status");
}

/** 26 projects, whatever the page; enough for the list and its toolbar to show. */
function stubProjects() {
	return stubApi(signedIn, {
		api: (url) =>
			url.pathname === "/api/projects"
				? json({
						items: [
							{
								id: "0190a000-0000-7000-8000-000000000001",
								name: "Obra 1",
								createdAt: "2026-01-01T00:00:00.000Z",
								lastActivityAt: "2026-01-01T00:00:00.000Z",
								role: "admin",
								status: "active",
							},
						],
						total: 26,
						counts: { active: 26, delivered: 0 },
					})
				: undefined,
	});
}

describe("/projects route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("asks for the page in the address", async () => {
		const { fetchMock } = stubApi(signedIn);

		const { router } = renderAt("/projects?page=2");

		await waitFor(() => {
			expect(requestedPage(fetchMock)).toBe("2");
		});
		expect(router.state.location.search).toEqual({ page: 2 });
	});

	test.each(["1", "0", "-1", "1.5", "abc", "%22%22"])(
		"falls back to the first page, omitted from the address, for page=%s",
		async (value) => {
			const { fetchMock } = stubApi(signedIn);

			const { router } = renderAt(`/projects?page=${value}`);

			await screen.findByRole("heading", { name: "Obras" });
			await waitFor(() => {
				expect(requestedPage(fetchMock)).toBe("1");
			});
			expect(router.state.location.search).toEqual({});
		},
	);

	test("asks for the sort in the address", async () => {
		const { fetchMock } = stubApi(signedIn);

		const { router } = renderAt("/projects?sort=name");

		await waitFor(() => {
			expect(requestedSort(fetchMock)).toBe("name");
		});
		expect(router.state.location.search).toEqual({ sort: "name" });
	});

	test.each(["recent", "Name", "open-pins", "%22%22"])(
		"falls back to the newest first, omitted from the address, for sort=%s",
		async (value) => {
			const { fetchMock } = stubApi(signedIn);

			const { router } = renderAt(`/projects?sort=${value}`);

			await screen.findByRole("heading", { name: "Obras" });
			await waitFor(() => {
				expect(requestedSort(fetchMock)).toBe("recent");
			});
			expect(router.state.location.search).toEqual({});
		},
	);

	test("changing the sort goes back to the first page", async () => {
		const { fetchMock } = stubProjects();

		const { router } = renderAt("/projects?page=3");
		await userEvent.click(
			await screen.findByRole("button", { name: "Ordenar: Mais recentes" }),
		);
		await userEvent.click(
			within(await screen.findByRole("menu")).getByRole("menuitemradio", {
				name: "Nome A–Z",
			}),
		);

		await waitFor(() => {
			expect(router.state.location.search).toEqual({ sort: "name" });
		});
		expect(requestedPage(fetchMock)).toBe("1");
		expect(requestedSort(fetchMock)).toBe("name");
	});

	test("changing the sort from the filter sheet goes back to the first page", async () => {
		setViewport("phone");
		stubProjects();

		const { router } = renderAt("/projects?page=2");
		await userEvent.click(
			await screen.findByRole("button", { name: "Filtros" }),
		);
		const sheet = await screen.findByRole("dialog");
		await userEvent.click(
			within(sheet).getByRole("radio", { name: "Nome A–Z" }),
		);
		await userEvent.click(
			await within(sheet).findByRole("button", { name: "Ver 26 obras" }),
		);

		await waitFor(() => {
			expect(router.state.location.search).toEqual({ sort: "name" });
		});
	});

	test("asks for the search in the address, and shows it in the field", async () => {
		const { fetchMock } = stubApi(signedIn);

		const { router } = renderAt("/projects?q=edificio%20aurora");

		await waitFor(() => {
			expect(requestedQuery(fetchMock)).toBe("edificio aurora");
		});
		expect(router.state.location.search).toEqual({ q: "edificio aurora" });
		expect(
			await screen.findByRole("textbox", { name: "Buscar obra pelo nome" }),
		).toHaveValue("edificio aurora");
	});

	test.each([["%22%22"], ["%20%20"], ["a".repeat(101)]])(
		"falls back to no search, omitted from the address, for q=%s",
		async (value) => {
			const { fetchMock } = stubApi(signedIn);

			const { router } = renderAt(`/projects?q=${value}`);

			await screen.findByRole("heading", { name: "Obras" });
			await waitFor(() => {
				expect(requestedQuery(fetchMock)).toBe(null);
			});
			expect(router.state.location.search).toEqual({});
		},
	);

	test("changing the search goes back to the first page, keeping the sort", async () => {
		stubProjects();

		const { router } = renderAt("/projects?page=3&sort=name");
		await userEvent.type(
			await screen.findByRole("textbox", { name: "Buscar obra pelo nome" }),
			"aurora",
		);

		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				q: "aurora",
				sort: "name",
			});
		});
	});

	test("asks for the status in the address", async () => {
		const { fetchMock } = stubApi(signedIn);

		const { router } = renderAt("/projects?status=delivered");

		await waitFor(() => {
			expect(requestedStatus(fetchMock)).toBe("delivered");
		});
		expect(router.state.location.search).toEqual({ status: "delivered" });
	});

	test("keeps “Todas” in the address", async () => {
		const { fetchMock } = stubApi(signedIn);

		const { router } = renderAt("/projects?status=all");

		await waitFor(() => {
			expect(requestedStatus(fetchMock)).toBe("all");
		});
		expect(router.state.location.search).toEqual({ status: "all" });
	});

	test.each(["active", "Delivered", "done", "%22%22"])(
		"falls back to the projects in progress, omitted from the address, for status=%s",
		async (value) => {
			const { fetchMock } = stubApi(signedIn);

			const { router } = renderAt(`/projects?status=${value}`);

			await screen.findByRole("heading", { name: "Obras" });
			await waitFor(() => {
				expect(requestedStatus(fetchMock)).toBe("active");
			});
			expect(router.state.location.search).toEqual({});
		},
	);

	test("changing the status goes back to the first page", async () => {
		const { fetchMock } = stubProjects();

		const { router } = renderAt("/projects?page=3");
		await userEvent.click(
			await screen.findByRole("radio", { name: "Entregue" }),
		);

		await waitFor(() => {
			expect(router.state.location.search).toEqual({ status: "delivered" });
		});
		expect(requestedPage(fetchMock)).toBe("1");
		expect(requestedStatus(fetchMock)).toBe("delivered");
	});

	test("going back to “Em andamento” drops the status from the address", async () => {
		stubProjects();

		const { router } = renderAt("/projects?status=all&sort=name");
		await userEvent.click(
			await screen.findByRole("radio", { name: "Em andamento" }),
		);

		await waitFor(() => {
			expect(router.state.location.search).toEqual({ sort: "name" });
		});
	});
});
