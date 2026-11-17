import type { OrganizationUnits } from "@bluprint/shared";
import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { project } from "@/test/projectsApi";
import {
	json,
	organization,
	renderAt,
	signedIn,
	stubApi,
} from "@/test/renderApp";
import { expiringServer, signInAgain } from "@/test/sessionExpiry";
import {
	combine,
	configurationSectionsApi,
	disciplineOf,
	disciplinesApi,
	floor,
	structureApi,
	structureOf,
	tower,
	typologyOf,
	writableApi,
} from "@/test/structureApi";

describe("protected layout", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		onlineManager.setOnline(true);
	});

	test("sends a signed-out visitor to the login, remembering where they were going", async () => {
		stubApi(null);

		const { router } = renderAt("/projects");

		await waitFor(() => {
			expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
		});
		expect(router.state.location.pathname).toBe("/login");
		expect(router.state.location.search).toEqual({ redirect: "/projects" });
	});

	test("sends the root to the projects list", async () => {
		stubApi(signedIn);

		const { router } = renderAt("/");

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/projects");
		});
		expect(await screen.findByText("Obras")).toBeInTheDocument();
	});

	test("renders the requested screen when there is a session", async () => {
		stubApi(signedIn);

		const { router } = renderAt("/projects");

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
		expect(router.state.location.pathname).toBe("/projects");
	});

	test("shows the splash, not the login or the screen, while the session is checked", async () => {
		vi.stubGlobal("fetch", () => new Promise(() => {}));

		renderAt("/projects");

		expect(await screen.findByText("Verificando sua sessão…")).toBeVisible();
		expect(screen.queryByText("Obras")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
	});

	test("explains a failed check instead of sending the visitor to the login, and retries on demand", async () => {
		const failing = vi.fn(() => Promise.reject(new Error("network down")));
		vi.stubGlobal("fetch", failing);

		const { router } = renderAt("/projects");

		expect(
			await screen.findByText("Não foi possível verificar sua sessão"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Confira sua conexão e tente de novo."),
		).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/projects");
		expect(failing).toHaveBeenCalledTimes(4);

		stubApi(signedIn);
		await userEvent.click(
			screen.getByRole("button", { name: "Tentar de novo" }),
		);

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
	});

	test("does not take a server error for a missing session", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.resolve(new Response("{}", { status: 500 }))),
		);

		const { router } = renderAt("/projects");

		expect(
			await screen.findByText("Não foi possível verificar sua sessão"),
		).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/projects");
	});

	test("lets the visitor retry as many times as they need", async () => {
		vi.stubGlobal("fetch", () => Promise.reject(new Error("network down")));

		renderAt("/projects");

		for (let attempt = 0; attempt < 3; attempt++) {
			await userEvent.click(
				await screen.findByRole("button", { name: "Tentar de novo" }),
			);
		}

		expect(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		).toBeInTheDocument();
	});

	test("waits for the connection when the device is offline, then continues on its own", async () => {
		onlineManager.setOnline(false);
		stubApi(signedIn);

		renderAt("/projects");

		expect(await screen.findByText("Sem conexão.")).toBeInTheDocument();
		expect(
			screen.getByText("Continuamos assim que a internet voltar."),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Tentar de novo" }),
		).not.toBeInTheDocument();

		act(() => onlineManager.setOnline(true));

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
	});

	test("does not ask the server again when navigating with a fresh session", async () => {
		const { fetchMock } = stubApi(signedIn);

		const { router } = renderAt("/projects");
		await screen.findByText("Obras");
		const checks = () =>
			fetchMock.mock.calls.filter(([url]) =>
				String(url).includes("/get-session"),
			).length;
		expect(checks()).toBe(1);

		await router.navigate({ to: "/projects" });
		await router.invalidate();

		expect(checks()).toBe(1);
	});

	test("sends the visitor to the login, back to the current screen, when a request answers 401", async () => {
		const api = stubApi(signedIn);

		const { router, queryClient } = renderAt("/projects");
		await screen.findByText("Obras");

		api.setSession(null);
		vi.stubGlobal(
			"fetch",
			vi.fn((input: RequestInfo | URL) =>
				String(input).includes("/get-session")
					? Promise.resolve(new Response("null", { status: 200 }))
					: Promise.resolve(new Response("{}", { status: 401 })),
			),
		);
		await queryClient
			.query({
				queryKey: ["anything"],
				queryFn: () => apiFetch("/anything", z.object({})),
			})
			.catch(() => {});

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/login");
		});
		expect(router.state.location.search).toEqual({ redirect: "/projects" });
		expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
	});

	test("does not loop when a 401 arrives on a public screen", async () => {
		stubApi(null);
		const { router, queryClient } = renderAt("/login");
		await screen.findByLabelText("E-mail");
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.resolve(new Response("{}", { status: 401 }))),
		);

		await queryClient
			.query({
				queryKey: ["anything"],
				queryFn: () => apiFetch("/anything", z.object({})),
			})
			.catch(() => {});

		expect(router.state.location.pathname).toBe("/login");
		expect(router.state.location.search).toEqual({});
	});
});

const UNITS: OrganizationUnits = {
	contracted: 400,
	reserved: 100,
	free: 300,
	reclaimable: 100,
};
const ADMIN = { ...organization, role: "admin" as const };
function newProjectServer() {
	return expiringServer(
		(url, init) => {
			if (url.pathname === "/api/organization/units") return json(UNITS);
			if (url.pathname === "/api/projects" && init?.method === "POST") {
				return json({ ...project(1), name: "Casa Moinhos" }, 201);
			}
			return undefined;
		},
		{ organization: ADMIN },
	);
}

async function fillNewProject(name: string, units: string) {
	const nameField = await screen.findByRole("textbox", {
		name: "Nome da obra",
	});
	await userEvent.type(nameField, name);
	await userEvent.type(
		screen.getByRole("textbox", { name: "Unidades reservadas" }),
		units,
	);
}

describe("session draft", () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
		onlineManager.setOnline(true);
	});

	test("keeps what was sent when the save comes long after the screen opened", async () => {
		vi.useFakeTimers({
			shouldAdvanceTime: true,
			toFake: [
				"Date",
				"setTimeout",
				"clearTimeout",
				"setInterval",
				"clearInterval",
			],
		});
		try {
			const server = newProjectServer();
			renderAt("/projects/new");
			await fillNewProject("Casa Moinhos", "12");
			await act(() => vi.advanceTimersByTimeAsync(10 * 60 * 1000));
			server.expireNextWrite();
			await userEvent.click(screen.getByRole("button", { name: "Criar obra" }));
			await signInAgain();

			expect(
				await screen.findByRole("textbox", { name: "Nome da obra" }),
			).toHaveValue("Casa Moinhos");
		} finally {
			vi.useRealTimers();
		}
	});

	test("keeps the draft when the same account signs out and comes back", async () => {
		const server = newProjectServer();
		const { router } = renderAt("/projects/new");
		await fillNewProject("Casa Moinhos", "12");
		server.expireNextWrite();
		await userEvent.click(screen.getByRole("button", { name: "Criar obra" }));
		await screen.findByLabelText("E-mail");
		await signInAgain();
		await screen.findByDisplayValue("Casa Moinhos");

		await userEvent.click(
			screen.getByRole("button", { name: "Conta de Ana Ribeiro" }),
		);
		await userEvent.click(screen.getByRole("menuitem", { name: "Sair" }));
		await screen.findByLabelText("E-mail");
		await signInAgain();
		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/projects");
		});
		await router.navigate({ to: "/projects/new" });

		expect(
			await screen.findByRole("textbox", { name: "Nome da obra" }),
		).toHaveValue("Casa Moinhos");
		expect(server.writes).toEqual(["POST /api/projects"]);
	});
});

function setDocumentHidden(hidden: boolean) {
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		get: () => (hidden ? "hidden" : "visible"),
	});
	document.dispatchEvent(new Event("visibilitychange"));
}

function sessionChecks(fetchMock: ReturnType<typeof stubApi>["fetchMock"]) {
	return fetchMock.mock.calls.filter(([url]) =>
		String(url).includes("/get-session"),
	).length;
}

describe("return from the background", () => {
	afterEach(() => {
		setDocumentHidden(false);
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		onlineManager.setOnline(true);
	});

	test("hides the screen and checks the session after more than 5 minutes away", async () => {
		let now = 1_700_000_000_000;
		vi.spyOn(Date, "now").mockImplementation(() => now);
		const { fetchMock } = stubApi(signedIn);
		const { router } = renderAt("/projects");
		const heading = await screen.findByText("Obras");
		const before = sessionChecks(fetchMock);

		setDocumentHidden(true);
		now += 5 * 60 * 1000 + 1;
		expect(sessionChecks(fetchMock)).toBe(before);

		let release: (response: Response) => void = () => {};
		const pending = new Promise<Response>((resolve) => {
			release = resolve;
		});
		const original = fetchMock.getMockImplementation();
		fetchMock.mockImplementation(
			(input: RequestInfo | URL, init?: RequestInit) => {
				if (String(input).includes("/get-session")) return pending;
				return original?.(input, init) ?? json({});
			},
		);
		setDocumentHidden(false);

		expect(await screen.findByText("Verificando sua sessão…")).toBeVisible();
		expect(heading).not.toBeVisible();
		expect(sessionChecks(fetchMock)).toBeGreaterThan(before);

		release(new Response(JSON.stringify(signedIn), { status: 200 }));
		await waitFor(() => expect(heading).toBeVisible());
		expect(screen.getByText("Obras")).toBe(heading);
		expect(router.state.location.pathname).toBe("/projects");
	});

	test("hides an open menu with the screen while the session is checked", async () => {
		let now = 1_700_000_000_000;
		vi.spyOn(Date, "now").mockImplementation(() => now);
		const { fetchMock } = stubApi(signedIn);
		renderAt("/projects");
		await userEvent.click(
			await screen.findByRole("button", { name: "Conta de Ana Ribeiro" }),
		);
		const signOut = await screen.findByRole("menuitem", { name: "Sair" });

		setDocumentHidden(true);
		now += 6 * 60 * 1000;
		const original = fetchMock.getMockImplementation();
		fetchMock.mockImplementation(
			(input: RequestInfo | URL, init?: RequestInit) => {
				if (String(input).includes("/get-session")) {
					return new Promise<Response>(() => {});
				}
				return original?.(input, init) ?? json({});
			},
		);
		setDocumentHidden(false);

		expect(await screen.findByText("Verificando sua sessão…")).toBeVisible();
		expect(signOut).not.toBeVisible();
	});

	test("keeps an open menu when the waiting screen is tapped", async () => {
		let now = 1_700_000_000_000;
		vi.spyOn(Date, "now").mockImplementation(() => now);
		const { fetchMock } = stubApi(signedIn);
		renderAt("/projects");
		await userEvent.click(
			await screen.findByRole("button", { name: "Conta de Ana Ribeiro" }),
		);
		const signOut = await screen.findByRole("menuitem", { name: "Sair" });

		setDocumentHidden(true);
		now += 6 * 60 * 1000;
		let release: (response: Response) => void = () => {};
		const pending = new Promise<Response>((resolve) => {
			release = resolve;
		});
		const original = fetchMock.getMockImplementation();
		fetchMock.mockImplementation(
			(input: RequestInfo | URL, init?: RequestInit) => {
				if (String(input).includes("/get-session")) return pending;
				return original?.(input, init) ?? json({});
			},
		);
		setDocumentHidden(false);
		await userEvent.click(await screen.findByText("Verificando sua sessão…"));
		release(new Response(JSON.stringify(signedIn), { status: 200 }));

		await waitFor(() => expect(signOut).toBeVisible());
	});

	test("leaves the screen in place when the absence was under 5 minutes", async () => {
		let now = 1_700_000_000_000;
		vi.spyOn(Date, "now").mockImplementation(() => now);
		const { fetchMock } = stubApi(signedIn);
		renderAt("/projects");
		await screen.findByText("Obras");

		setDocumentHidden(true);
		now += 5 * 60 * 1000 - 1;
		setDocumentHidden(false);

		expect(screen.getByText("Obras")).toBeVisible();
		expect(
			screen.queryByText("Verificando sua sessão…"),
		).not.toBeInTheDocument();
		expect(sessionChecks(fetchMock)).toBe(1);
	});

	test("shows the connection error, not the login, when the return check has no network", async () => {
		let now = 1_700_000_000_000;
		vi.spyOn(Date, "now").mockImplementation(() => now);
		stubApi(signedIn);
		const { router } = renderAt("/projects");
		await screen.findByText("Obras");
		setDocumentHidden(true);
		now += 6 * 60 * 1000;
		onlineManager.setOnline(false);
		setDocumentHidden(false);

		expect(await screen.findByText("Sem conexão.")).toBeVisible();
		expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/projects");
	});

	test("sends a dead session to the login, remembering the screen", async () => {
		let now = 1_700_000_000_000;
		vi.spyOn(Date, "now").mockImplementation(() => now);
		const { fetchMock } = stubApi(signedIn);
		const { router } = renderAt("/projects");
		await screen.findByText("Obras");
		setDocumentHidden(true);
		now += 6 * 60 * 1000;
		fetchMock.mockImplementation((input: RequestInfo | URL) =>
			String(input).includes("/get-session") ? json(null) : json({}),
		);
		setDocumentHidden(false);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/login");
		});
		expect(router.state.location.search).toEqual({ redirect: "/projects" });
	});

	test.each([
		["hidden", true],
		["visible", false],
	])(
		"does not ask the server while the tab stays %s, even an hour later",
		async (_state, hidden) => {
			vi.useFakeTimers({
				shouldAdvanceTime: true,
				toFake: [
					"Date",
					"setTimeout",
					"clearTimeout",
					"setInterval",
					"clearInterval",
				],
			});
			try {
				const { fetchMock } = stubApi(signedIn);
				renderAt("/projects");
				await screen.findByText("Obras");
				const before = fetchMock.mock.calls.length;
				if (hidden) setDocumentHidden(true);
				await act(() => vi.advanceTimersByTimeAsync(60 * 60 * 1000));

				expect(fetchMock.mock.calls.length).toBe(before);
			} finally {
				vi.useRealTimers();
			}
		},
	);
});

const OBRA = { ...project(7), name: "Casa Moinhos" };
const CONFIG = `/projects/${OBRA.id}/configuration`;

describe("actions that must not come back", () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
		onlineManager.setOnline(true);
	});

	test("does not open the add form for an undone removal after signing back in", async () => {
		const ninth = floor("9º andar", ["901", "902"]);
		const obra = { ...project(3, "manager"), name: "Casa Moinhos" };
		const api = writableApi(obra, structureOf([tower("Torre A", [ninth])]), {
			create: () => json({}, 401),
		});
		const stub = stubApi(signedIn, { api: api.handler });
		renderAt(`/projects/${obra.id}/locations/${ninth.id}`);
		await userEvent.click(
			await screen.findByRole("button", { name: "Ações da unidade 902" }),
		);
		await userEvent.click(
			screen.getByRole("menuitem", { name: "Remover unidade" }),
		);
		const undo = await screen.findByRole("button", { name: "Desfazer" });
		stub.setSession(null);
		await userEvent.click(undo);
		await screen.findByLabelText("E-mail");
		await signInAgain();

		expect(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("textbox", { name: "Adicionar unidade" }),
		).not.toBeInTheDocument();
		expect(api.created).toHaveLength(1);
	});

	test("does not reopen delivery or send it again after signing back in", async () => {
		const posts: string[] = [];
		const handler = (url: URL, init?: RequestInit) => {
			if (url.pathname === `/api/projects/${OBRA.id}/delivery`) {
				posts.push(init?.method ?? "GET");
				return json({}, 401);
			}
			if (url.pathname === `/api/projects/${OBRA.id}`) return json(OBRA);
			if (url.pathname === "/api/projects") {
				return json({
					items: [OBRA],
					total: 1,
					counts: { active: 1, delivered: 0 },
				});
			}
			return undefined;
		};
		const api = stubApi(signedIn, {
			api: combine(handler, configurationSectionsApi(OBRA.id)),
		});
		renderAt(CONFIG);
		await userEvent.click(
			await screen.findByRole("button", { name: "Entregar obra" }),
		);
		await userEvent.click(
			screen.getByRole("checkbox", {
				name: "Entendi que a obra não poderá ser reaberta.",
			}),
		);
		api.setSession(null);
		await userEvent.click(
			screen.getByRole("button", { name: "Entregar obra" }),
		);
		await screen.findByLabelText("E-mail");
		await signInAgain();
		await screen.findByRole("heading", { level: 1, name: "Casa Moinhos" });

		expect(
			screen.queryByRole("checkbox", {
				name: "Entendi que a obra não poderá ser reaberta.",
			}),
		).not.toBeInTheDocument();
		expect(posts).toEqual(["POST"]);
	});

	test("does not move a location again after signing back in", async () => {
		const ninth = floor("9º andar", ["901", "902"]);
		const towerA = tower("Torre A", [ninth]);
		const obra = { ...project(3, "manager"), name: "Casa Moinhos" };
		const api = writableApi(obra, structureOf([towerA, tower("Torre B")]), {
			move: () => json({}, 401),
		});
		const stub = stubApi(signedIn, { api: api.handler });
		renderAt(`/projects/${obra.id}/locations/${ninth.id}`);
		await userEvent.click(
			await screen.findByRole("button", { name: "Ações da unidade 902" }),
		);
		stub.setSession(null);
		await userEvent.click(
			screen.getByRole("menuitem", { name: "Mover para cima" }),
		);
		await screen.findByLabelText("E-mail");
		await signInAgain();
		await screen.findByRole("button", { name: "Ações da unidade 902" });

		expect(api.moved).toHaveLength(1);
		expect(
			screen.queryByRole("menuitem", { name: "Mover para cima" }),
		).not.toBeInTheDocument();
	});

	test("does not delete a typology again or reopen its menu after signing back in", async () => {
		const tipologia = typologyOf("Tipologia A", ["Sala"]);
		const deletes: string[] = [];
		const handler = (url: URL, init?: RequestInit) => {
			if (
				url.pathname.endsWith(`/typologies/${tipologia.id}`) &&
				init?.method === "DELETE"
			) {
				deletes.push(tipologia.id);
				return json({}, 401);
			}
			if (url.pathname === `/api/projects/${OBRA.id}`) return json(OBRA);
			if (url.pathname === "/api/projects") {
				return json({
					items: [OBRA],
					total: 1,
					counts: { active: 1, delivered: 0 },
				});
			}
			return undefined;
		};
		const api = stubApi(signedIn, {
			api: combine(
				handler,
				configurationSectionsApi(OBRA.id, undefined, {
					typologies: [tipologia],
				}),
			),
		});
		renderAt(CONFIG);
		await userEvent.click(
			await screen.findByRole("button", { name: "Ações da Tipologia A" }),
		);
		api.setSession(null);
		await userEvent.click(
			screen.getByRole("menuitem", { name: "Excluir tipologia" }),
		);
		await screen.findByLabelText("E-mail");
		await signInAgain();
		await screen.findByText("Tipologia A");

		expect(deletes).toEqual([tipologia.id]);
		expect(
			screen.queryByRole("menuitem", { name: "Excluir tipologia" }),
		).not.toBeInTheDocument();
	});

	test.each([
		["unit", "201"],
		["common area", "Hall"],
		["floor", "2º andar"],
		["tower", "Torre A"],
	])(
		"does not save a discipline box again after signing back in on the %s page",
		async (_kind, title) => {
			const second = floor("2º andar", ["201", "202"], ["Hall"]);
			const towerA = tower("Torre A", [second]);
			const structure = structureOf([towerA]);
			const obra = { ...project(3, "manager"), name: "Casa Moinhos" };
			const ids: Record<string, string> = {
				"201": second.units[0]?.id ?? "",
				Hall: second.commonAreas[0]?.id ?? "",
				"2º andar": second.id,
				"Torre A": towerA.id,
			};
			const listed = [disciplineOf("Hidráulica"), disciplineOf("Pintura")];
			const details = Object.fromEntries(
				Object.values(ids).map((id) => [id, { disciplines: listed }]),
			);
			const disciplines = disciplinesApi(obra.id, details, () => json({}, 401));
			const stub = stubApi(signedIn, {
				api: combine(
					disciplines.handler,
					(url) =>
						url.pathname === `/api/projects/${obra.id}`
							? json(obra)
							: undefined,
					structureApi(obra.id, structure, details),
				),
			});
			renderAt(`/projects/${obra.id}/locations/${ids[title]}`);
			const pintura = await screen.findByRole("checkbox", { name: "Pintura" });
			stub.setSession(null);
			await userEvent.click(pintura);
			await screen.findByLabelText("E-mail");
			await signInAs("ana@horizonte.test");

			expect(
				await screen.findByRole("checkbox", { name: "Pintura" }),
			).toBeChecked();
			expect(disciplines.writes).toHaveLength(1);
		},
	);
});
