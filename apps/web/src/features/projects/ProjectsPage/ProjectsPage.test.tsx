import type { ProjectAccessRole } from "@bluprint/shared";
import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type ApiHandler,
	json,
	renderAt,
	signedIn,
	stubApi,
} from "@/test/renderApp";
import { observedMargins, setInView, setViewport } from "@/test/viewport";
import { projectsQueryOptions } from "../api";

const PAGE_SIZE = 12;

function project(n: number, role: ProjectAccessRole = "admin") {
	return {
		id: `0190a000-0000-7000-8000-${String(n).padStart(12, "0")}`,
		name: `Obra ${n}`,
		createdAt: "2026-01-01T00:00:00.000Z",
		role,
	};
}

/**
 * Serves `total` projects the way the API pages them; `role` picks each one's role. `sort=name`
 * answers them in reverse, so the two orders tell apart.
 */
function projectsApi(
	total: number,
	role: (n: number) => ProjectAccessRole = () => "admin",
): ApiHandler {
	return (url) => {
		if (url.pathname !== "/api/projects") return undefined;
		const page = Number(url.searchParams.get("page") ?? 1);
		const byName = url.searchParams.get("sort") === "name";
		const first = (page - 1) * PAGE_SIZE + 1;
		const last = Math.min(page * PAGE_SIZE, total);
		const items = [];
		for (let i = first; i <= last; i++) {
			const n = byName ? total + 1 - i : i;
			items.push(project(n, role(n)));
		}
		return json({ items, total });
	};
}

/** `hidden` reaches the list behind an open sheet, which hides the rest of the page from assistive tech. */
function firstCard({ hidden = false } = {}) {
	return within(
		screen.getByRole("list", { name: "Obras", hidden }),
	).getAllByRole("listitem", { hidden })[0];
}

function stubProjects(api: ApiHandler) {
	return stubApi(signedIn, { api });
}

function requestedPages(
	fetchMock: ReturnType<typeof stubProjects>["fetchMock"],
) {
	return fetchMock.mock.calls
		.map(([input]) => new URL(String(input), "http://localhost"))
		.filter((url) => url.pathname === "/api/projects")
		.map((url) => url.searchParams.get("page"));
}

describe("projects page", () => {
	beforeEach(() => {
		vi.spyOn(window, "scrollTo");
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		onlineManager.setOnline(true);
	});

	test("shows card-shaped placeholders while the list loads (O1)", async () => {
		stubProjects((url) =>
			url.pathname === "/api/projects" ? new Promise(() => {}) : undefined,
		);

		renderAt("/projects");

		expect(
			await screen.findByRole("status", { name: "Carregando obras" }),
		).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Obras" })).toBeInTheDocument();
	});

	test("lists the first 12 projects with the total count", async () => {
		stubProjects(projectsApi(26));

		renderAt("/projects");

		const list = await screen.findByRole("list", { name: "Obras" });
		expect(within(list).getAllByRole("listitem")).toHaveLength(12);
		expect(within(list).getByText("Obra 1")).toBeInTheDocument();
		expect(within(list).queryByText("Obra 13")).not.toBeInTheDocument();
		expect(screen.getByText("26 obras")).toBeInTheDocument();
		expect(screen.getByText("Mostrando 1–12 de 26")).toBeInTheDocument();
	});

	test("counts a single project in the singular, without pages", async () => {
		stubProjects(projectsApi(1));

		renderAt("/projects");

		expect(await screen.findByText("1 obra")).toBeInTheDocument();
		expect(
			screen.queryByRole("navigation", { name: "Páginas de obras" }),
		).not.toBeInTheDocument();
	});

	test("shows the caller's role on each card, except where it is admin", async () => {
		const roles: ProjectAccessRole[] = ["manager", "assistant", "admin"];
		stubProjects(projectsApi(3, (n) => roles[n - 1] ?? "admin"));

		renderAt("/projects");

		const cards = await screen.findAllByRole("listitem");
		expect(cards.map((card) => card.textContent)).toEqual([
			"Obra 1Gerente de obra",
			"Obra 2Assistente de obra",
			"Obra 3",
		]);
	});

	test("the card is not a link until the project screen exists", async () => {
		stubProjects(projectsApi(1));

		renderAt("/projects");

		const list = await screen.findByRole("list", { name: "Obras" });
		expect(within(list).queryByRole("link")).not.toBeInTheDocument();
	});

	test("explains an empty list to someone with no project (O7)", async () => {
		stubProjects(projectsApi(0));

		renderAt("/projects");

		expect(
			await screen.findByRole("heading", { name: "Nenhuma obra por aqui" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Você verá uma obra aqui quando o admin da construtora te vincular a ela.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText("0 obras")).not.toBeInTheDocument();
	});

	test("explains a failed load and retries on demand (O9)", async () => {
		let failing = true;
		stubProjects((url) => {
			if (url.pathname !== "/api/projects") return undefined;
			return failing ? json({}, 500) : projectsApi(2)(url);
		});

		renderAt("/projects");

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("Não foi possível carregar suas obras");
		expect(alert).toHaveTextContent("Confira sua conexão e tente de novo.");

		failing = false;
		await userEvent.click(
			within(alert).getByRole("button", { name: "Tentar de novo" }),
		);

		expect(await screen.findByText("2 obras")).toBeInTheDocument();
	});

	test("keeps a loaded list when a later refresh fails", async () => {
		let failing = false;
		const serve = projectsApi(2);
		stubProjects((url) => {
			if (url.pathname !== "/api/projects") return undefined;
			return failing ? json({}, 500) : serve(url);
		});

		const { queryClient } = renderAt("/projects");
		await screen.findByText("2 obras");

		failing = true;
		await act(() => queryClient.refetchQueries({ queryKey: ["projects"] }));
		await waitFor(() => {
			expect(
				queryClient.getQueryState(
					projectsQueryOptions({ page: 1, q: "", sort: "recent" }).queryKey,
				)?.status,
			).toBe("error");
		});

		expect(screen.getByText("Obra 1")).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	test("waits for the connection when the signal drops, then loads on its own (O10)", async () => {
		const serve = projectsApi(2);
		let dropSignal: () => void = () => {};
		let firstRequest = true;
		stubProjects((url) => {
			if (url.pathname !== "/api/projects") return undefined;
			if (!firstRequest) return serve(url);
			firstRequest = false;
			return new Promise<Response>((_, reject) => {
				dropSignal = () => reject(new TypeError("Failed to fetch"));
			});
		});

		renderAt("/projects");
		await screen.findByRole("status", { name: "Carregando obras" });

		act(() => {
			onlineManager.setOnline(false);
			dropSignal();
		});

		expect(await screen.findByText("Sem conexão.")).toBeInTheDocument();
		expect(
			screen.getByText("Continuamos assim que a internet voltar."),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Tentar de novo" }),
		).not.toBeInTheDocument();

		act(() => onlineManager.setOnline(true));

		expect(await screen.findByText("2 obras")).toBeInTheDocument();
	});

	test("while another page loads, dims the list and locks the controls, then scrolls to the top (O13)", async () => {
		let releaseSecondPage: () => void = () => {};
		const serve = projectsApi(26);
		stubProjects((url) => {
			if (url.searchParams.get("page") !== "2") return serve(url);
			return new Promise<Response>((resolve) => {
				releaseSecondPage = () => resolve(serve(url) as Response);
			}).then((response) => response);
		});

		const { router } = renderAt("/projects");
		await screen.findByText("Obra 1");
		vi.mocked(window.scrollTo).mockClear();

		await userEvent.click(screen.getByRole("button", { name: "Página 2" }));

		const list = screen.getByRole("list", { name: "Obras" });
		expect(list).toHaveAttribute("aria-busy", "true");
		expect(within(list).getByText("Obra 1")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Página 2" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		for (const control of screen
			.getAllByRole("button")
			.filter((b) => b.closest("nav"))) {
			expect(control).toBeDisabled();
		}
		expect(window.scrollTo).not.toHaveBeenCalled();

		act(() => releaseSecondPage());

		expect(await screen.findByText("Obra 13")).toBeInTheDocument();
		expect(list).toHaveAttribute("aria-busy", "false");
		expect(screen.getByText("Mostrando 13–24 de 26")).toBeInTheDocument();
		expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
		expect(router.state.location.search).toEqual({ page: 2 });
	});

	test("goes back to the first page, dropping it from the address", async () => {
		const { fetchMock } = stubProjects(projectsApi(26));

		const { router } = renderAt("/projects?page=3");
		await screen.findByText("Obra 25");

		await userEvent.click(screen.getByRole("button", { name: "Página 1" }));

		expect(await screen.findByText("Obra 1")).toBeInTheDocument();
		expect(router.state.location.search).toEqual({});
		expect(requestedPages(fetchMock)).toEqual(["3", "1"]);
	});

	test("never shows more than 7 page slots", async () => {
		stubProjects(projectsApi(12 * 20));

		renderAt("/projects?page=10");

		const nav = await screen.findByRole("navigation", {
			name: "Páginas de obras",
		});
		expect(
			within(nav)
				.getAllByRole("button")
				.map((b) => b.textContent),
		).toEqual(["Anterior", "1", "9", "10", "11", "20", "Próxima"]);
		expect(nav).toHaveTextContent("1…91011…20");
	});

	test("a page past the last lands on the last page", async () => {
		stubProjects(projectsApi(26));

		const { router } = renderAt("/projects?page=9");

		expect(await screen.findByText("Obra 25")).toBeInTheDocument();
		expect(router.state.location.search).toEqual({ page: 3 });
	});

	test("sorts by name from the toolbar, showing the sort on its trigger", async () => {
		stubProjects(projectsApi(26));

		renderAt("/projects");
		await screen.findByText("Obra 1");
		await userEvent.click(
			screen.getByRole("button", { name: "Ordenar: Mais recentes" }),
		);

		const menu = await screen.findByRole("menu");
		expect(within(menu).getByText("Ordenar")).toBeInTheDocument();
		expect(
			within(menu).getByRole("menuitemradio", { name: "Mais recentes" }),
		).toBeChecked();
		await userEvent.click(
			within(menu).getByRole("menuitemradio", { name: "Nome A–Z" }),
		);

		await waitFor(() => {
			expect(firstCard()).toHaveTextContent("Obra 26");
		});
		expect(
			screen.getByRole("button", { name: "Ordenar: Nome A–Z" }),
		).toBeInTheDocument();
	});

	test("the filter sheet applies a choice only on “Ver N obras” (O14)", async () => {
		setViewport("phone");
		stubProjects(projectsApi(26));

		const { router } = renderAt("/projects");
		await screen.findByText("Obra 1");
		await userEvent.click(screen.getByRole("button", { name: "Filtros" }));

		const sheet = await screen.findByRole("dialog", { name: "Filtros" });
		expect(sheet).toHaveAccessibleDescription("Nenhum filtro ativo");
		const sort = within(sheet).getByRole("radiogroup", { name: "Ordenar" });
		expect(
			within(sort).getByRole("radio", { name: "Mais recentes" }),
		).toBeChecked();
		expect(
			within(sheet).getByRole("button", { name: "Limpar filtros" }),
		).toBeDisabled();

		await userEvent.click(
			within(sort).getByRole("radio", { name: "Nome A–Z" }),
		);

		expect(within(sort).getByRole("radio", { name: "Nome A–Z" })).toBeChecked();
		expect(firstCard({ hidden: true })).toHaveTextContent("Obra 1");
		expect(router.state.location.search).toEqual({});

		await userEvent.click(
			await within(sheet).findByRole("button", { name: "Ver 26 obras" }),
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		await waitFor(() => {
			expect(firstCard()).toHaveTextContent("Obra 26");
		});
		expect(router.state.location.search).toEqual({ sort: "name" });
	});

	test("closing the filter sheet any other way discards the choice", async () => {
		setViewport("phone");
		stubProjects(projectsApi(26));

		const { router } = renderAt("/projects");
		await screen.findByText("Obra 1");
		await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
		const sheet = await screen.findByRole("dialog", { name: "Filtros" });
		await userEvent.click(
			within(sheet).getByRole("radio", { name: "Nome A–Z" }),
		);

		await userEvent.click(
			within(sheet).getByRole("button", { name: "Fechar" }),
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(firstCard()).toHaveTextContent("Obra 1");
		expect(router.state.location.search).toEqual({});

		await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
		expect(
			within(await screen.findByRole("dialog")).getByRole("radio", {
				name: "Mais recentes",
			}),
		).toBeChecked();
	});

	test("“Ver N obras” counts what the pending choice would show", async () => {
		setViewport("phone");
		const byDate = projectsApi(26);
		// one fewer by name stands in for a filter that hides a project
		const byName = projectsApi(25);
		stubProjects((url) =>
			url.searchParams.get("sort") === "name" ? byName(url) : byDate(url),
		);

		renderAt("/projects");
		await screen.findByText("Obra 1");
		await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
		const sheet = await screen.findByRole("dialog", { name: "Filtros" });
		expect(
			within(sheet).getByRole("button", { name: "Ver 26 obras" }),
		).toBeInTheDocument();

		await userEvent.click(
			within(sheet).getByRole("radio", { name: "Nome A–Z" }),
		);

		expect(
			await within(sheet).findByRole("button", { name: "Ver 25 obras" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("26 obras", { ignore: "button" }),
		).toBeInTheDocument();
	});

	test("the sort is not an active filter", async () => {
		setViewport("phone");
		stubProjects(projectsApi(26));

		renderAt("/projects?sort=name");
		await screen.findByText("Obra 26");

		expect(screen.getByRole("button", { name: "Filtros" })).toHaveTextContent(
			/^Filtros$/,
		);
	});

	test("an empty list has no toolbar (O7)", async () => {
		stubProjects(projectsApi(0));

		renderAt("/projects");
		await screen.findByRole("heading", { name: "Nenhuma obra por aqui" });

		expect(
			screen.queryByRole("button", { name: "Filtros" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /^Ordenar:/ }),
		).not.toBeInTheDocument();
	});
});

describe("projects page on the phone", () => {
	beforeEach(() => {
		setViewport("phone");
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	async function cardCount() {
		const list = await screen.findByRole("list", { name: "Obras" });
		return within(list).getAllByRole("listitem").length;
	}

	test("shows the first 12 with a load-more button instead of pages", async () => {
		stubProjects(projectsApi(26));

		renderAt("/projects");

		expect(await cardCount()).toBe(12);
		expect(screen.getByText("26 obras")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Carregar mais" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("navigation", { name: "Páginas de obras" }),
		).not.toBeInTheDocument();
		expect(screen.queryByText(/^Mostrando/)).not.toBeInTheDocument();
	});

	test("appends the next 12 when the end of the list comes within 160px", async () => {
		const { fetchMock } = stubProjects(projectsApi(26));

		renderAt("/projects");
		await screen.findByText("Obra 12");
		expect(observedMargins()).toContain("0px 0px 160px 0px");

		act(() => setInView());
		await screen.findByText("Obra 24");
		act(() => setInView(false));

		expect(screen.getByText("Obra 1")).toBeInTheDocument();
		expect(requestedPages(fetchMock).slice(0, 2)).toEqual(["1", "2"]);
	});

	test("the load-more button appends the next page", async () => {
		stubProjects(projectsApi(26));

		renderAt("/projects");
		await userEvent.click(
			await screen.findByRole("button", { name: "Carregar mais" }),
		);

		expect(await screen.findByText("Obra 24")).toBeInTheDocument();
	});

	test("shows the next page loading under the list (O11)", async () => {
		const serve = projectsApi(26);
		stubProjects((url) => {
			if (url.pathname !== "/api/projects") return undefined;
			return url.searchParams.get("page") === "2"
				? new Promise(() => {})
				: serve(url);
		});

		renderAt("/projects");
		await screen.findByText("Obra 12");
		act(() => setInView());

		expect(
			await screen.findByRole("status", { name: "Carregando mais obras…" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Carregar mais" }),
		).not.toBeInTheDocument();
		expect(await cardCount()).toBe(12);
	});

	test("a failed next page stops loading on its own until the retry is tapped (O12)", async () => {
		let failing = true;
		const serve = projectsApi(26);
		const { fetchMock } = stubProjects((url) => {
			if (url.pathname !== "/api/projects") return undefined;
			return failing && url.searchParams.get("page") === "2"
				? json({}, 500)
				: serve(url);
		});

		renderAt("/projects");
		await screen.findByText("Obra 12");
		act(() => setInView());

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("Não foi possível carregar mais obras.");
		expect(screen.getByText("Obra 12")).toBeInTheDocument();

		const attempts = requestedPages(fetchMock).length;
		act(() => {
			setInView(false);
			setInView();
		});
		expect(requestedPages(fetchMock)).toHaveLength(attempts);

		failing = false;
		await userEvent.click(
			within(alert).getByRole("button", { name: "Tentar de novo" }),
		);

		expect(await screen.findByText("Obra 24")).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	test("a refresh of the list after a failed page does not restart loading on its own", async () => {
		let failing = true;
		const serve = projectsApi(26);
		const { fetchMock } = stubProjects((url) => {
			if (url.pathname !== "/api/projects") return undefined;
			return failing && url.searchParams.get("page") === "2"
				? json({}, 500)
				: serve(url);
		});

		const { queryClient } = renderAt("/projects");
		await screen.findByText("Obra 12");
		act(() => setInView());
		await screen.findByRole("alert");

		await act(() => queryClient.refetchQueries({ queryKey: ["projects"] }));
		failing = false;
		const attempts = requestedPages(fetchMock).length;
		act(() => {
			setInView(false);
			setInView();
		});

		expect(requestedPages(fetchMock)).toHaveLength(attempts);
		expect(screen.queryByText("Obra 13")).not.toBeInTheDocument();
	});

	test("keeps loading while the end stays in view, and stops at the total", async () => {
		const { fetchMock } = stubProjects(projectsApi(26));

		renderAt("/projects");
		await screen.findByText("Obra 12");
		act(() => setInView());

		expect(await screen.findByText("Obra 26")).toBeInTheDocument();
		expect(await cardCount()).toBe(26);
		expect(
			screen.queryByRole("button", { name: "Carregar mais" }),
		).not.toBeInTheDocument();

		act(() => {
			setInView(false);
			setInView();
		});
		expect(requestedPages(fetchMock)).toEqual(["1", "2", "3"]);
	});
});

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

	/** Serves the projects whose name holds `q`, ignoring accents and case, as the API would. */
	function searchApi(names: string[]): ApiHandler {
		return (url) => {
			if (url.pathname !== "/api/projects") return undefined;
			const q = plain(url.searchParams.get("q") ?? "");
			const items = names
				.map((name, i) => ({ ...project(i + 1), name }))
				.filter((p) => plain(p.name).includes(q));
			return json({ items, total: items.length });
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
