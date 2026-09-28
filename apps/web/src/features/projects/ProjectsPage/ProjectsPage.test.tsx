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

/** Serves `total` projects the way the API pages them; `role` picks each one's role. */
function projectsApi(
	total: number,
	role: (n: number) => ProjectAccessRole = () => "admin",
): ApiHandler {
	return (url) => {
		if (url.pathname !== "/api/projects") return undefined;
		const page = Number(url.searchParams.get("page") ?? 1);
		const first = (page - 1) * PAGE_SIZE + 1;
		const last = Math.min(page * PAGE_SIZE, total);
		const items = [];
		for (let n = first; n <= last; n++) items.push(project(n, role(n)));
		return json({ items, total });
	};
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
				queryClient.getQueryState(projectsQueryOptions(1).queryKey)?.status,
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
