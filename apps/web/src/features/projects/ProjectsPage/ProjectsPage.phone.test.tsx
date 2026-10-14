import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { projectsApi, requestedPages, stubProjects } from "@/test/projectsApi";
import { json, renderAt } from "@/test/renderApp";
import { observedMargins, setInView, setViewport } from "@/test/viewport";

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
