import { PROJECT_NOT_FOUND, type ProjectSummary } from "@bluprint/shared";
import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { project } from "@/test/projectsApi";
import {
	type ApiHandler,
	json,
	renderAt,
	signedIn,
	stubApi,
} from "@/test/renderApp";

const OBRA = project(7);
const OBRA_PATH = `/projects/${OBRA.id}`;

function projectApi(summary: ProjectSummary): ApiHandler {
	return (url) =>
		url.pathname === `/api/projects/${summary.id}` ? json(summary) : undefined;
}

function notFoundApi(): ApiHandler {
	return (url) =>
		url.pathname.startsWith("/api/projects/")
			? json(
					{
						type: "about:blank",
						title: "Not Found",
						status: 404,
						code: PROJECT_NOT_FOUND,
					},
					404,
				)
			: undefined;
}

function requestedProjectIds(
	fetchMock: ReturnType<typeof stubApi>["fetchMock"],
) {
	return fetchMock.mock.calls
		.map(([input]) => new URL(String(input), "http://localhost").pathname)
		.filter((path) => /^\/api\/projects\/[^/]+$/.test(path));
}

describe("project home", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		onlineManager.setOnline(true);
	});

	test("shows the name and status of a blank project to the admin, without role or button (P1)", async () => {
		stubApi(signedIn, { api: projectApi({ ...OBRA, name: "Casa Moinhos" }) });

		renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Casa Moinhos" }),
		).toBeInTheDocument();
		expect(screen.getByText("Em andamento")).toBeInTheDocument();
		expect(screen.queryByText("Gerente de obra")).not.toBeInTheDocument();
		expect(screen.queryByText("Assistente de obra")).not.toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "A obra ainda não tem estrutura" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"As pendências aparecem aqui quando a obra tiver estrutura.",
			),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).queryByRole("button"),
		).not.toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).queryByRole("link"),
		).not.toBeInTheDocument();
	});

	test.each([
		["manager", "Gerente de obra"],
		["assistant", "Assistente de obra"],
	] as const)(
		"shows the %s's role next to the status (P1b)",
		async (role, label) => {
			stubApi(signedIn, { api: projectApi({ ...OBRA, role }) });

			renderAt(OBRA_PATH);

			expect(await screen.findByText(label)).toBeInTheDocument();
			expect(screen.getByText("Em andamento")).toBeInTheDocument();
		},
	);

	test("shows the Entregue badge and the same blank block on a delivered project (P2)", async () => {
		stubApi(signedIn, { api: projectApi({ ...OBRA, status: "delivered" }) });

		renderAt(OBRA_PATH);

		expect(await screen.findByText("Entregue")).toBeInTheDocument();
		expect(screen.queryByText("Em andamento")).not.toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "A obra ainda não tem estrutura" }),
		).toBeInTheDocument();
	});

	test("links back to the project list from the header", async () => {
		stubApi(signedIn, { api: projectApi(OBRA) });

		const { router } = renderAt(OBRA_PATH);
		await screen.findByRole("heading", { level: 1, name: OBRA.name });

		await userEvent.click(screen.getByRole("link", { name: "Obras" }));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/projects");
		});
	});

	test("keeps the header's frame while the project loads (P3)", async () => {
		stubApi(signedIn, {
			api: (url) =>
				url.pathname === `/api/projects/${OBRA.id}`
					? new Promise(() => {})
					: undefined,
		});

		renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("status", { name: "Carregando obra" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Obras" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
	});

	test("explains a failed load with the back link only, and retries on demand (P4a)", async () => {
		let failing = true;
		const serve = projectApi(OBRA);
		stubApi(signedIn, {
			api: (url) => (failing ? json({}, 500) : serve(url)),
		});

		renderAt(OBRA_PATH);

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("Não foi possível carregar a obra");
		expect(alert).toHaveTextContent("Confira sua conexão e tente de novo.");
		expect(screen.getByRole("link", { name: "Obras" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
		expect(screen.queryByText("Em andamento")).not.toBeInTheDocument();

		failing = false;
		await userEvent.click(
			within(alert).getByRole("button", { name: "Tentar de novo" }),
		);

		expect(
			await screen.findByRole("heading", { level: 1, name: OBRA.name }),
		).toBeInTheDocument();
	});

	test("waits for the connection when the signal drops, then loads on its own (P4b)", async () => {
		const serve = projectApi(OBRA);
		let dropSignal: () => void = () => {};
		let firstRequest = true;
		stubApi(signedIn, {
			api: (url) => {
				if (url.pathname !== `/api/projects/${OBRA.id}`) return undefined;
				if (!firstRequest) return serve(url);
				firstRequest = false;
				return new Promise<Response>((_, reject) => {
					dropSignal = () => reject(new TypeError("Failed to fetch"));
				});
			},
		});

		renderAt(OBRA_PATH);
		await screen.findByRole("status", { name: "Carregando obra" });

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

		expect(
			await screen.findByRole("heading", { level: 1, name: OBRA.name }),
		).toBeInTheDocument();
	});

	test("shows Obra não encontrada on the API's 404, asking once (X2)", async () => {
		const { fetchMock } = stubApi(signedIn, { api: notFoundApi() });

		const { router } = renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Obra não encontrada",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText("Ela não existe ou você não tem acesso a ela."),
		).toBeInTheDocument();
		expect(requestedProjectIds(fetchMock)).toHaveLength(1);

		await userEvent.click(
			screen.getByRole("link", { name: "Voltar para obras" }),
		);
		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/projects");
		});
	});

	test("shows Obra não encontrada for an id that is not a UUID, without calling the API (X2)", async () => {
		const { fetchMock } = stubApi(signedIn);

		renderAt("/projects/not-a-uuid");

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Obra não encontrada",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Voltar para obras" }),
		).toBeInTheDocument();
		expect(requestedProjectIds(fetchMock)).toEqual([]);
	});

	test("sends a signed-out visitor to the login, not to the not-found page", async () => {
		stubApi(null);

		const { router } = renderAt(OBRA_PATH);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/login");
		});
		expect(router.state.location.search).toEqual({ redirect: OBRA_PATH });
	});
});

describe("route not found", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("shows Página não encontrada for an address that does not exist (X1)", async () => {
		stubApi(signedIn);

		renderAt("/nao-existe/de-jeito-nenhum");

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Página não encontrada",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"O endereço pode estar errado ou a página mudou de lugar.",
			),
		).toBeInTheDocument();
	});

	test("leads back to the project list", async () => {
		stubApi(signedIn);

		const { router } = renderAt("/nao-existe");
		await userEvent.click(
			await screen.findByRole("link", { name: "Voltar para obras" }),
		);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/projects");
		});
	});

	test("sends a signed-out visitor to the login, not to the not-found page", async () => {
		stubApi(null);

		const { router } = renderAt("/nao-existe");

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/login");
		});
		expect(router.state.location.search).toEqual({ redirect: "/nao-existe" });
	});
});
