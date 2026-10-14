import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { project, stubProjects } from "@/test/projectsApi";
import { type ApiHandler, json, renderAt } from "@/test/renderApp";
import { setViewport } from "@/test/viewport";

describe("projects page search", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		onlineManager.setOnline(true);
	});

	const plain = (text: string) =>
		text
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
			.toLowerCase();

	function searchApi(names: string[]): ApiHandler {
		return (url) => {
			if (url.pathname !== "/api/projects") return undefined;
			const q = plain(url.searchParams.get("q") ?? "");
			const items = names
				.map((name, i) => ({ ...project(i + 1), name }))
				.filter((p) => plain(p.name).includes(q));
			return json({
				items,
				total: items.length,
				counts: { active: items.length, delivered: 0 },
			});
		};
	}

	function requestedQueries(
		fetchMock: ReturnType<typeof stubProjects>["fetchMock"],
	) {
		return fetchMock.mock.calls
			.map(([input]) => new URL(String(input), "http://localhost"))
			.filter((url) => url.pathname === "/api/projects")
			.map((url) => url.searchParams.get("q"));
	}

	const NAMES = ["Casa Moinhos", "Edifício Aurora", "Edifício Brisa"];

	async function searchField() {
		return screen.findByRole("textbox", { name: "Buscar obra pelo nome" });
	}

	test("waits for a pause in typing before the address and the API hear of it", async () => {
		const { fetchMock } = stubProjects(searchApi(NAMES));

		const { router } = renderAt("/projects");
		await screen.findByText("Casa Moinhos");
		await userEvent.type(await searchField(), "edif");

		expect(router.state.location.search).toEqual({});
		expect(requestedQueries(fetchMock)).not.toContain("edif");

		await waitFor(() => {
			expect(router.state.location.search).toEqual({ q: "edif" });
		});
		expect(await screen.findByText("2 obras")).toBeInTheDocument();
		expect(screen.queryByText("Casa Moinhos")).not.toBeInTheDocument();
		expect(
			requestedQueries(fetchMock).filter((q) => q?.startsWith("e")),
		).toEqual(["edif"]);
	});

	test("shows the field filled from the address", async () => {
		stubProjects(searchApi(NAMES));

		renderAt("/projects?q=moinhos");

		expect(await searchField()).toHaveValue("moinhos");
		expect(await screen.findByText("1 obra")).toBeInTheDocument();
	});

	test("the clear button empties the search at once", async () => {
		stubProjects(searchApi(NAMES));

		const { router } = renderAt("/projects?q=moinhos");
		await screen.findByText("1 obra");

		await userEvent.click(screen.getByRole("button", { name: "Limpar busca" }));

		expect(await searchField()).toHaveValue("");
		expect(router.state.location.search).toEqual({});
		expect(await screen.findByText("3 obras")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Limpar busca" }),
		).not.toBeInTheDocument();
	});

	test("changing the search goes back to the first page", async () => {
		stubProjects(searchApi(NAMES));

		const { router } = renderAt("/projects?page=2&q=casa");
		await searchField();

		await userEvent.type(await searchField(), " moinhos");

		await waitFor(() => {
			expect(router.state.location.search).toEqual({ q: "casa moinhos" });
		});
	});

	test("a search with no match says what was searched and offers to clear (O8)", async () => {
		stubProjects(searchApi(NAMES));

		const { router } = renderAt("/projects?q=zzz");

		expect(
			await screen.findByRole("heading", { name: "Nenhuma obra encontrada" }),
		).toBeInTheDocument();
		expect(screen.getByText(/Nenhum resultado para “zzz”/)).toBeInTheDocument();
		expect(screen.queryByText("0 obras")).not.toBeInTheDocument();
		expect(await searchField()).toHaveValue("zzz");

		await userEvent.click(
			within(screen.getByRole("status")).getByRole("button", {
				name: "Limpar filtros",
			}),
		);

		expect(await screen.findByText("3 obras")).toBeInTheDocument();
		expect(router.state.location.search).toEqual({});
		expect(await searchField()).toHaveValue("");
	});

	test("keeps the field, focused and filled, when a search finds nothing", async () => {
		stubProjects(searchApi(NAMES));

		renderAt("/projects");
		await screen.findByText("3 obras");
		const field = await searchField();
		await userEvent.type(field, "zzz");

		await screen.findByRole("heading", { name: "Nenhuma obra encontrada" });

		expect(await searchField()).toBe(field);
		expect(field).toHaveFocus();
		expect(field).toHaveValue("zzz");
	});

	test("offers “Limpar filtros” in the toolbar while a search is active", async () => {
		stubProjects(searchApi(NAMES));

		renderAt("/projects");
		await screen.findByText("3 obras");
		expect(
			screen.queryByRole("button", { name: "Limpar filtros" }),
		).not.toBeInTheDocument();

		await userEvent.type(await searchField(), "moinhos");
		await screen.findByText("1 obra");
		await userEvent.click(
			screen.getByRole("button", { name: "Limpar filtros" }),
		);

		expect(await screen.findByText("3 obras")).toBeInTheDocument();
		expect(await searchField()).toHaveValue("");
	});

	test("the sort survives clearing the search", async () => {
		stubProjects(searchApi(NAMES));

		const { router } = renderAt("/projects?q=zzz&sort=name");
		await screen.findByRole("heading", { name: "Nenhuma obra encontrada" });
		await userEvent.click(
			within(screen.getByRole("status")).getByRole("button", {
				name: "Limpar filtros",
			}),
		);

		await waitFor(() => {
			expect(router.state.location.search).toEqual({ sort: "name" });
		});
	});

	test("on the phone, sits in the sticky row beside “Filtros”, which does not count it", async () => {
		setViewport("phone");
		stubProjects(searchApi(NAMES));

		const { router } = renderAt("/projects");
		await screen.findByText("3 obras");
		await userEvent.type(await searchField(), "edificio");

		await waitFor(() => {
			expect(router.state.location.search).toEqual({ q: "edificio" });
		});
		expect(await screen.findByText("2 obras")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Filtros" })).toHaveTextContent(
			/^Filtros$/,
		);
	});

	test("on the phone, the sheet keeps the search when it applies a sort", async () => {
		setViewport("phone");
		stubProjects(searchApi(NAMES));

		const { router } = renderAt("/projects?q=edificio");
		await screen.findByText("2 obras");
		await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
		const sheet = await screen.findByRole("dialog", { name: "Filtros" });
		await userEvent.click(
			within(sheet).getByRole("radio", { name: "Nome A–Z" }),
		);
		await userEvent.click(
			await within(sheet).findByRole("button", { name: "Ver 2 obras" }),
		);

		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				q: "edificio",
				sort: "name",
			});
		});
	});

	test("takes no more than the API accepts, instead of emptying itself on a longer paste", async () => {
		stubProjects(searchApi(NAMES));

		renderAt("/projects");

		expect(await searchField()).toHaveAttribute("maxlength", "100");
	});

	test("on the phone, a search that lands while the sheet is open is kept when the sheet applies", async () => {
		setViewport("phone");
		stubProjects(searchApi(NAMES));

		const { router } = renderAt("/projects?q=edificio");
		await screen.findByText("2 obras");
		await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
		const sheet = await screen.findByRole("dialog", { name: "Filtros" });

		await act(() =>
			router.navigate({ to: "/projects", search: { q: "moinhos" } }),
		);
		await userEvent.click(
			within(sheet).getByRole("radio", { name: "Nome A–Z" }),
		);
		await userEvent.click(
			await within(sheet).findByRole("button", { name: "Ver 1 obra" }),
		);

		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				q: "moinhos",
				sort: "name",
			});
		});
	});

	test("typing a search adds no history entry of its own", async () => {
		stubProjects(searchApi(NAMES));

		const { router } = renderAt("/projects");
		await screen.findByText("3 obras");
		const before = router.history.length;
		await userEvent.type(await searchField(), "edif");
		await waitFor(() => {
			expect(router.state.location.search).toEqual({ q: "edif" });
		});

		expect(router.history.length).toBe(before);
	});
});
