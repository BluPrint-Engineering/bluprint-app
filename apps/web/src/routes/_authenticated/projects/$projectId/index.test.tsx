import { PROJECT_NOT_FOUND, type ProjectSummary } from "@bluprint/shared";
import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import {
	type ApiHandler,
	json,
	renderAt,
	signedIn,
	stubApi,
} from "@/test/renderApp";
import {
	combine,
	emptyStructure,
	floor,
	numberedFloors,
	structureApi,
	structureOf,
	tower,
} from "@/test/structureApi";

const OBRA = project(7);
const OBRA_PATH = `/projects/${OBRA.id}`;

function projectApi(
	summary: ProjectSummary,
	structure = emptyStructure,
): ApiHandler {
	return combine(
		(url) =>
			url.pathname === `/api/projects/${summary.id}`
				? json(summary)
				: undefined,
		structureApi(summary.id, structure),
	);
}

const LOCKED = "A obra foi entregue: a estrutura não pode mais ser alterada.";

function casaMoinhos() {
	return structureOf(
		[
			tower(
				"Torre A",
				[
					floor("Térreo", [], ["Hall de entrada"]),
					...numberedFloors(1, 3, 4),
					floor("Cobertura", ["1301", "1302"], ["Terraço"]),
				],
				["Salão de festas"],
			),
			tower("Torre B", numberedFloors(1, 10, 2)),
		],
		["Guarita"],
	);
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

	test("shows the name and status of a project without structure to the admin, without role or button (E1)", async () => {
		stubApi(signedIn, { api: projectApi({ ...OBRA, name: "Casa Moinhos" }) });

		renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Casa Moinhos" }),
		).toBeInTheDocument();
		expect(screen.getByText("Em andamento")).toBeInTheDocument();
		expect(screen.queryByText("Gerente de obra")).not.toBeInTheDocument();
		expect(screen.queryByText("Assistente de obra")).not.toBeInTheDocument();
		expect(
			await screen.findByRole("heading", {
				name: "A obra ainda não tem estrutura",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"A estrutura aparece aqui quando alguém da equipe montar a obra.",
			),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).queryByRole("button"),
		).not.toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).queryByRole("link"),
		).not.toBeInTheDocument();
		expect(screen.queryByText(LOCKED)).not.toBeInTheDocument();
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

	test("shows the Entregue badge, the lock line and the same empty block, without a button, on a delivered project without structure (E1)", async () => {
		stubApi(signedIn, { api: projectApi({ ...OBRA, status: "delivered" }) });

		renderAt(OBRA_PATH);

		expect(await screen.findByText("Entregue")).toBeInTheDocument();
		expect(screen.queryByText("Em andamento")).not.toBeInTheDocument();
		expect(
			await screen.findByRole("heading", {
				name: "A obra ainda não tem estrutura",
			}),
		).toBeInTheDocument();
		expect(screen.getByText(LOCKED)).toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).queryByRole("button"),
		).not.toBeInTheDocument();
	});

	test("shows a card per tower with its facts, and the project's common areas, when there are several towers (E2)", async () => {
		const structure = casaMoinhos();
		stubApi(signedIn, { api: projectApi(OBRA, structure) });

		renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("heading", { level: 2, name: "Torres" }),
		).toBeInTheDocument();
		const cards = within(screen.getByRole("main")).getAllByRole("link", {
			name: /^Torre /,
		});
		expect(cards).toHaveLength(2);
		const [towerA, towerB] = cards;
		expect(towerA).toHaveTextContent("Torre A");
		expect(towerA).toHaveTextContent("Térreo, 1º ao 3º e Cobertura");
		expect(towerA).toHaveTextContent("Unidades14 · 4 por andar");
		expect(towerA).toHaveTextContent("Áreas comuns3");
		expect(towerB).toHaveTextContent("Torre B");
		expect(towerB).toHaveTextContent("1º ao 10º");
		expect(towerB).toHaveTextContent("Unidades20 · 2 por andar");
		expect(towerB).toHaveTextContent("Áreas comuns0");
		expect(
			screen.getByRole("heading", { level: 2, name: "Áreas comuns da obra" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Guarita" })).toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).queryByRole("button"),
		).not.toBeInTheDocument();
		expect(screen.queryByText(LOCKED)).not.toBeInTheDocument();
	});

	test("lists the unit types each tower uses on its card, or says it has none (E2)", async () => {
		const structure = structureOf([
			tower("Torre A", [
				floor("1º andar", [
					{ name: "101", unitType: "Tipologia A" },
					{ name: "102", unitType: "Tipologia B" },
				]),
				floor("2º andar", [
					{ name: "201", unitType: "Tipologia A" },
					{ name: "202", unitType: "Tipologia B" },
				]),
				floor("Cobertura", [{ name: "1301", unitType: "Cobertura" }]),
			]),
			tower("Torre B", numberedFloors(1, 2, 2)),
		]);
		stubApi(signedIn, { api: projectApi(OBRA, structure) });

		renderAt(OBRA_PATH);

		const [towerA, towerB] = await screen.findAllByRole("link", {
			name: /^Torre /,
		});
		expect(towerA).toHaveTextContent(
			"TipologiasTipologia A, Tipologia B, Cobertura",
		);
		expect(towerB).toHaveTextContent("TipologiasSem tipologia");
	});

	test("opens a tower from its card (E2)", async () => {
		const structure = casaMoinhos();
		stubApi(signedIn, { api: projectApi(OBRA, structure) });

		const { router } = renderAt(OBRA_PATH);
		await userEvent.click(
			await screen.findByRole("link", { name: /^Torre B/ }),
		);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe(
				`${OBRA_PATH}/locations/${nth(structure.towers, 1).id}`,
			);
		});
	});

	test("leaves out the tower and goes straight to the façade and the common areas when there is one tower (E3)", async () => {
		const structure = structureOf(
			[
				tower(
					"Torre A",
					[
						floor("Térreo", [], ["Hall de entrada"]),
						...numberedFloors(1, 3, 3),
					],
					["Salão de festas"],
				),
			],
			["Guarita"],
		);
		stubApi(signedIn, { api: projectApi(OBRA, structure) });

		renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("heading", { level: 2, name: "Fachada" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Torre A")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Torres" }),
		).not.toBeInTheDocument();
		const facade = screen.getByRole("list", { name: "Fachada" });
		const rows = within(facade).getAllByRole("listitem");
		expect(rows).toHaveLength(4);
		expect(rows[0]).toHaveTextContent("3º301302303");
		expect(rows[3]).toHaveTextContent("TérreoHall de entrada");
		const areas = screen
			.getByRole("heading", { level: 2, name: "Áreas comuns" })
			.closest("section");
		expect(areas).not.toBeNull();
		expect(
			within(areas as HTMLElement)
				.getAllByRole("link")
				.map((link) => link.textContent),
		).toEqual(["Salão de festas", "Guarita"]);
	});

	test("says there are no floors yet for a single tower without any, keeping its common areas (E3)", async () => {
		const structure = structureOf([tower("Torre A", [], ["Salão de festas"])]);
		stubApi(signedIn, { api: projectApi(OBRA, structure) });

		renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("heading", {
				name: "A obra ainda não tem andares",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Salão de festas" }),
		).toBeInTheDocument();
	});

	test("lists only the common areas of a project that has no tower yet", async () => {
		stubApi(signedIn, {
			api: projectApi(OBRA, structureOf([], ["Guarita"])),
		});

		renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("heading", { name: "Áreas comuns da obra" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Torres" }),
		).not.toBeInTheDocument();
	});

	test("keeps the cards and adds the lock line on a delivered project, with no way to change anything (E5)", async () => {
		const structure = casaMoinhos();
		stubApi(signedIn, {
			api: projectApi({ ...OBRA, status: "delivered" }, structure),
		});

		renderAt(OBRA_PATH);

		expect(await screen.findByText("Entregue")).toBeInTheDocument();
		expect(await screen.findByText(LOCKED)).toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).getAllByRole("link", {
				name: /^Torre /,
			}),
		).toHaveLength(2);
		expect(
			within(screen.getByRole("main")).queryByRole("button"),
		).not.toBeInTheDocument();
	});

	test("keeps the project's header while the structure loads (E4)", async () => {
		stubApi(signedIn, {
			api: combine(
				(url) =>
					url.pathname === `/api/projects/${OBRA.id}/structure`
						? new Promise(() => {})
						: undefined,
				projectApi(OBRA),
			),
		});

		renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("heading", { level: 1, name: OBRA.name }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("status", { name: "Carregando estrutura" }),
		).toBeInTheDocument();
	});

	test("explains a failed structure load under the project's header, and retries on demand", async () => {
		let failing = true;
		const serve = projectApi(OBRA, casaMoinhos());
		stubApi(signedIn, {
			api: (url) =>
				failing && url.pathname.endsWith("/structure")
					? json({}, 500)
					: serve(url),
		});

		renderAt(OBRA_PATH);

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("Não foi possível carregar a obra");
		expect(
			screen.getByRole("heading", { level: 1, name: OBRA.name }),
		).toBeInTheDocument();

		failing = false;
		await userEvent.click(
			within(alert).getByRole("button", { name: "Tentar de novo" }),
		);

		expect(
			await screen.findByRole("heading", { level: 2, name: "Torres" }),
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
