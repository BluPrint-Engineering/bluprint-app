import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PAGE_SIZE, project, stubProjects } from "@/test/projectsApi";
import { type ApiHandler, json, renderAt } from "@/test/renderApp";
import { setViewport } from "@/test/viewport";

function statusApi(active: number, delivered: number): ApiHandler {
	return (url) => {
		if (url.pathname !== "/api/projects") return undefined;
		const status = url.searchParams.get("status") ?? "active";
		const page = Number(url.searchParams.get("page") ?? 1);
		const shown = [
			...(status === "delivered"
				? []
				: Array.from({ length: active }, (_, i) => project(i + 1))),
			...(status === "active"
				? []
				: Array.from({ length: delivered }, (_, i) =>
						project(active + i + 1, "admin", "delivered"),
					)),
		];
		return json({
			items: shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
			total: shown.length,
			counts: { active, delivered },
		});
	};
}

function requestedStatuses(
	fetchMock: ReturnType<typeof stubProjects>["fetchMock"],
) {
	return [
		...new Set(
			fetchMock.mock.calls
				.map(([input]) => new URL(String(input), "http://localhost"))
				.filter((url) => url.pathname === "/api/projects")
				.map((url) => url.searchParams.get("status")),
		),
	];
}

describe("projects page status", () => {
	beforeEach(() => {
		vi.spyOn(window, "scrollTo");
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	test("badges each card with its status in words", async () => {
		stubProjects(statusApi(1, 1));

		renderAt("/projects?status=all");

		const cards = await screen.findAllByRole("listitem");
		expect(
			cards.map((card) => card.textContent?.replace(/Atividade.*$/, "")),
		).toEqual(["Obra 1Em andamento", "Obra 2Entregue"]);
	});

	test("opens on the projects in progress", async () => {
		const { fetchMock } = stubProjects(statusApi(2, 3));

		renderAt("/projects");

		const list = await screen.findByRole("list", { name: "Obras" });
		expect(within(list).getAllByRole("listitem")).toHaveLength(2);
		expect(screen.getByText("2 obras")).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "Em andamento" })).toBeChecked();
		expect(
			screen.queryByRole("button", { name: "Limpar filtros" }),
		).not.toBeInTheDocument();
		expect(requestedStatuses(fetchMock)).toEqual(["active"]);
	});

	test("switches to the delivered ones from the toolbar, which counts as a filter", async () => {
		stubProjects(statusApi(2, 3));

		const { router } = renderAt("/projects");
		await screen.findByText("Obra 1");
		await userEvent.click(screen.getByRole("radio", { name: "Entregue" }));

		await waitFor(() => {
			expect(screen.getByText("3 obras")).toBeInTheDocument();
		});
		expect(screen.getByRole("radio", { name: "Entregue" })).toBeChecked();
		expect(router.state.location.search).toEqual({ status: "delivered" });
		const list = screen.getByRole("list", { name: "Obras" });
		expect(within(list).getAllByText("Entregue")).toHaveLength(3);
	});

	test("shows both statuses under “Todas”", async () => {
		stubProjects(statusApi(2, 3));

		renderAt("/projects");
		await screen.findByText("Obra 1");
		await userEvent.click(screen.getByRole("radio", { name: "Todas" }));

		await waitFor(() => {
			expect(screen.getByText("5 obras")).toBeInTheDocument();
		});
	});

	test("“Limpar filtros” goes back to the projects in progress and keeps the sort", async () => {
		stubProjects(statusApi(2, 3));

		const { router } = renderAt("/projects?status=delivered&sort=name");
		await screen.findByText("3 obras");
		await userEvent.click(
			screen.getByRole("button", { name: "Limpar filtros" }),
		);

		await waitFor(() => {
			expect(screen.getByText("2 obras")).toBeInTheDocument();
		});
		expect(router.state.location.search).toEqual({ sort: "name" });
		expect(
			screen.queryByRole("button", { name: "Limpar filtros" }),
		).not.toBeInTheDocument();
	});

	test("points to the delivered ones when none is in progress (O8a)", async () => {
		stubProjects(statusApi(0, 3));

		const { router } = renderAt("/projects");

		expect(
			await screen.findByRole("heading", { name: "Nenhuma obra em andamento" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Nenhuma obra por aqui" }),
		).not.toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "Todas" })).toBeInTheDocument();

		await userEvent.click(
			screen.getByRole("button", { name: "Ver entregues" }),
		);

		expect(await screen.findByText("Obra 1")).toBeInTheDocument();
		expect(router.state.location.search).toEqual({ status: "delivered" });
		expect(screen.getByText("3 obras")).toBeInTheDocument();
	});

	test("says there are no delivered ones when only those in progress exist", async () => {
		stubProjects(statusApi(2, 0));

		const { router } = renderAt("/projects?status=delivered");

		expect(
			await screen.findByRole("heading", { name: "Nenhuma obra entregue" }),
		).toBeInTheDocument();

		await userEvent.click(
			screen.getByRole("button", { name: "Ver em andamento" }),
		);

		expect(await screen.findByText("Obra 1")).toBeInTheDocument();
		expect(router.state.location.search).toEqual({});
	});

	test("a person with no project at all still gets the empty state, whatever the status (O7)", async () => {
		stubProjects(statusApi(0, 0));

		renderAt("/projects?status=all");

		expect(
			await screen.findByRole("heading", { name: "Nenhuma obra por aqui" }),
		).toBeInTheDocument();
	});

	test("the filter sheet chooses the status as a draft, counts it, and applies it on “Ver N obras”", async () => {
		setViewport("phone");
		stubProjects(statusApi(2, 3));

		const { router } = renderAt("/projects");
		await screen.findByText("Obra 1");
		await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
		const sheet = await screen.findByRole("dialog", { name: "Filtros" });
		expect(sheet).toHaveAccessibleDescription("Nenhum filtro ativo");

		await userEvent.click(
			within(sheet).getByRole("radio", { name: "Entregue" }),
		);

		expect(sheet).toHaveAccessibleDescription("1 filtro ativo");
		expect(
			within(sheet).getByRole("button", { name: "Limpar filtros" }),
		).toBeEnabled();
		expect(router.state.location.search).toEqual({});
		await userEvent.click(
			await within(sheet).findByRole("button", { name: "Ver 3 obras" }),
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		await waitFor(() => {
			expect(router.state.location.search).toEqual({ status: "delivered" });
		});
		expect(
			screen.getByRole("button", { name: "Filtros, 1 ativo" }),
		).toBeInTheDocument();
	});

	test("“Limpar filtros” in the sheet resets the draft to the projects in progress", async () => {
		setViewport("phone");
		stubProjects(statusApi(2, 3));

		renderAt("/projects?status=all");
		await screen.findByText("5 obras");
		await userEvent.click(
			screen.getByRole("button", { name: "Filtros, 1 ativo" }),
		);
		const sheet = await screen.findByRole("dialog", { name: "Filtros" });

		await userEvent.click(
			within(sheet).getByRole("button", { name: "Limpar filtros" }),
		);

		expect(
			within(sheet).getByRole("radio", { name: "Em andamento" }),
		).toBeChecked();
		expect(sheet).toHaveAccessibleDescription("Nenhum filtro ativo");
	});

	test("O8a on the phone offers the delivered ones too", async () => {
		setViewport("phone");
		stubProjects(statusApi(0, 3));

		renderAt("/projects");

		expect(
			await screen.findByRole("heading", { name: "Nenhuma obra em andamento" }),
		).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("button", { name: "Ver entregues" }),
		);
		expect(await screen.findByText("Obra 1")).toBeInTheDocument();
	});
});
