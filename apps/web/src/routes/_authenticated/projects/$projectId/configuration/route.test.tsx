import {
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	type ProjectSummary,
} from "@bluprint/shared";
import { onlineManager } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import { setViewport } from "@/test/viewport";

const OBRA = { ...project(7), name: "Casa Moinhos" };
const CONFIG_PATH = `/projects/${OBRA.id}/configuration`;
const RENAME_FAILED =
	"Não foi possível salvar o nome. Confira sua conexão e tente de novo.";

type Patch = (name: string) => Promise<Response> | Response;

function projectApi(initial: ProjectSummary, patch?: Patch) {
	const state = { current: initial };
	const handler = (url: URL, init?: RequestInit) => {
		if (url.pathname === "/api/projects") {
			return json({
				items: [state.current],
				total: 1,
				counts: {
					active: state.current.status === "active" ? 1 : 0,
					delivered: state.current.status === "delivered" ? 1 : 0,
				},
			});
		}
		if (url.pathname !== `/api/projects/${initial.id}`) return undefined;
		if (init?.method === "PATCH") {
			const { name } = JSON.parse(String(init.body)) as { name: string };
			if (patch) return patch(name);
			state.current = { ...state.current, name };
		}
		return json(state.current);
	};
	return { state, handler };
}

function patchRequests(fetchMock: ReturnType<typeof stubApi>["fetchMock"]) {
	return fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH");
}

async function startRenaming() {
	await userEvent.click(
		await screen.findByRole("button", { name: "Renomear" }),
	);
	return screen.getByRole("textbox", { name: "Nome da obra" });
}

describe("project configuration", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		onlineManager.setOnline(true);
	});

	test("shows only Dados da obra with the name, the way back and no side navigation (C1)", async () => {
		const { handler } = projectApi(OBRA);
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Casa Moinhos" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 2, name: "Configuração" }),
		).toBeInTheDocument();
		const card = screen.getByRole("region", { name: "Dados da obra" });
		expect(
			within(card).getByRole("heading", { level: 3, name: "Dados da obra" }),
		).toBeInTheDocument();
		expect(within(card).getByText("Casa Moinhos")).toBeInTheDocument();
		expect(
			within(card).getByRole("button", { name: "Renomear" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Status da obra")).not.toBeInTheDocument();
		expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: "Configuração da obra" }),
		).not.toBeInTheDocument();
	});

	test("links back to the project home from the header", async () => {
		const { handler } = projectApi(OBRA);
		stubApi(signedIn, { api: handler });

		const { router } = renderAt(CONFIG_PATH);
		await screen.findByRole("heading", { level: 1, name: "Casa Moinhos" });
		await userEvent.click(screen.getByRole("link", { name: "Início da obra" }));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
		});
	});

	test("keeps the header's frame while the project loads", async () => {
		stubApi(signedIn, {
			api: (url) =>
				url.pathname === `/api/projects/${OBRA.id}`
					? new Promise(() => {})
					: undefined,
		});

		renderAt(CONFIG_PATH);

		expect(
			await screen.findByRole("status", { name: "Carregando obra" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Início da obra" }),
		).toBeInTheDocument();
	});

	test("shows Obra não encontrada for an id that is not a UUID, without calling the API", async () => {
		const { fetchMock } = stubApi(signedIn);

		renderAt("/projects/not-a-uuid/configuration");

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Obra não encontrada",
			}),
		).toBeInTheDocument();
		expect(
			fetchMock.mock.calls.filter(([input]) =>
				/^\/api\/projects\/[^/]+$/.test(String(input)),
			),
		).toEqual([]);
	});

	test("shows Obra não encontrada on the API's 404", async () => {
		stubApi(signedIn, {
			api: (url) =>
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
					: undefined,
		});

		renderAt(CONFIG_PATH);

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Obra não encontrada",
			}),
		).toBeInTheDocument();
	});
});

describe("renaming in place", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("opens the field with the current name, focused (C3a)", async () => {
		const { handler } = projectApi(OBRA);
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const field = await startRenaming();

		expect(field).toHaveValue("Casa Moinhos");
		expect(field).toHaveFocus();
		expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
		expect(
			screen.queryByRole("button", { name: "Renomear" }),
		).not.toBeInTheDocument();
	});

	test("Cancelar discards the draft and sends nothing", async () => {
		const { handler } = projectApi(OBRA);
		const { fetchMock } = stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const field = await startRenaming();
		await userEvent.clear(field);
		await userEvent.type(field, "Outro nome");
		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

		const card = screen.getByRole("region", { name: "Dados da obra" });
		expect(within(card).getByText("Casa Moinhos")).toBeInTheDocument();
		expect(
			screen.queryByRole("textbox", { name: "Nome da obra" }),
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Renomear" })).toHaveFocus();
		expect(patchRequests(fetchMock)).toEqual([]);
	});

	test("Escape discards the draft", async () => {
		const { handler } = projectApi(OBRA);
		const { fetchMock } = stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const field = await startRenaming();
		await userEvent.type(field, " II{Escape}");

		expect(
			screen.queryByRole("textbox", { name: "Nome da obra" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 1, name: "Casa Moinhos" }),
		).toBeInTheDocument();
		expect(patchRequests(fetchMock)).toEqual([]);
	});

	test.each([
		["an empty name", "", "Informe o nome da obra."],
		["a blank name", "   ", "Informe o nome da obra."],
		[
			"a name over 120 characters",
			"a".repeat(121),
			"O nome pode ter no máximo 120 caracteres.",
		],
	])(
		"explains %s and keeps the draft, sending nothing (C3b)",
		async (_case, typed, message) => {
			const { handler } = projectApi(OBRA);
			const { fetchMock } = stubApi(signedIn, { api: handler });
			renderAt(CONFIG_PATH);

			const field = await startRenaming();
			await userEvent.clear(field);
			if (typed) await userEvent.type(field, typed, { delay: null });
			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

			expect(await screen.findByText(message)).toBeInTheDocument();
			expect(field).toHaveAttribute("aria-invalid", "true");
			expect(field).toHaveValue(typed);
			expect(patchRequests(fetchMock)).toEqual([]);
		},
	);

	test("accepts a name of exactly 120 characters", async () => {
		const { handler } = projectApi(OBRA);
		const { fetchMock } = stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const field = await startRenaming();
		await userEvent.clear(field);
		await userEvent.type(field, "a".repeat(120), { delay: null });
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => {
			expect(patchRequests(fetchMock)).toHaveLength(1);
		});
	});

	test("shows Salvando… and locks the field and Cancelar while saving (C3c)", async () => {
		const { handler } = projectApi(OBRA, () => new Promise(() => {}));
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const field = await startRenaming();
		await userEvent.clear(field);
		await userEvent.type(field, "Casa Moinhos II");
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		const saving = await screen.findByRole("button", { name: /Salvando/ });
		expect(saving).toBeDisabled();
		expect(saving).toHaveTextContent("Salvando…");
		expect(field).toBeDisabled();
		expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
	});

	test("Escape does nothing while saving", async () => {
		const { handler } = projectApi(OBRA, () => new Promise(() => {}));
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const field = await startRenaming();
		await userEvent.type(field, " II{Enter}");
		await screen.findByRole("button", { name: /Salvando/ });
		await userEvent.keyboard("{Escape}");

		expect(
			screen.getByRole("textbox", { name: "Nome da obra" }),
		).toBeDisabled();
	});

	test("sends the trimmed name and shows it in the card and the header without a reload", async () => {
		const { handler } = projectApi(OBRA);
		const { fetchMock } = stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const field = await startRenaming();
		await userEvent.clear(field);
		await userEvent.type(field, "  Casa Moinhos II  ");
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Casa Moinhos II",
			}),
		).toBeInTheDocument();
		const card = screen.getByRole("region", { name: "Dados da obra" });
		expect(within(card).getByText("Casa Moinhos II")).toBeInTheDocument();
		expect(
			screen.queryByRole("textbox", { name: "Nome da obra" }),
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Renomear" })).toHaveFocus();
		const [[input, init]] = patchRequests(fetchMock) as [
			[RequestInfo, RequestInit],
		];
		expect(String(input)).toBe(`/api/projects/${OBRA.id}`);
		expect(JSON.parse(String(init.body))).toEqual({ name: "Casa Moinhos II" });
	});

	test("the list shows the new name when the person goes back to it", async () => {
		const { handler } = projectApi(OBRA);
		stubApi(signedIn, { api: handler });
		const { router } = renderAt("/projects");

		await userEvent.click(
			await screen.findByRole("link", { name: /Casa Moinhos/ }),
		);
		await userEvent.click(
			await screen.findByRole("link", { name: "Configuração da obra" }),
		);
		const field = await startRenaming();
		await userEvent.clear(field);
		await userEvent.type(field, "Casa Moinhos II");
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
		await screen.findByRole("heading", { level: 1, name: "Casa Moinhos II" });

		await userEvent.click(screen.getByRole("link", { name: "Início da obra" }));
		await userEvent.click(await screen.findByRole("link", { name: "Obras" }));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/projects");
		});
		expect(
			await screen.findByRole("link", { name: /Casa Moinhos II/ }),
		).toBeInTheDocument();
	});

	test("keeps the draft and says so when saving fails, then saves on the next try (C3d)", async () => {
		let failing = true;
		const { handler, state } = projectApi(OBRA, (name) => {
			if (failing) return json({}, 500);
			state.current = { ...state.current, name };
			return json(state.current);
		});
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const field = await startRenaming();
		await userEvent.clear(field);
		await userEvent.type(field, "Casa Moinhos II");
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent(RENAME_FAILED);
		expect(field).toHaveValue("Casa Moinhos II");
		expect(field).toBeEnabled();
		expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();

		failing = false;
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Casa Moinhos II",
			}),
		).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	test("reloads the project and shows it closed when the save finds it delivered (C6)", async () => {
		const { handler, state } = projectApi(OBRA, () => {
			state.current = { ...state.current, status: "delivered" };
			return json(
				{
					type: "about:blank",
					title: "Conflict",
					status: 409,
					code: PROJECT_DELIVERED,
				},
				409,
			);
		});
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const field = await startRenaming();
		await userEvent.type(field, " II");
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByText("Entregue")).toBeInTheDocument();
		expect(
			screen.getByText(
				"A obra foi entregue: o nome não pode mais ser alterado.",
			),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("textbox", { name: "Nome da obra" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Renomear" }),
		).not.toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});

describe("who may rename", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("an assistant reads the name and the reason, with no Renomear (C4)", async () => {
		const { handler } = projectApi({ ...OBRA, role: "assistant" });
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		expect(await screen.findByText("Assistente de obra")).toBeInTheDocument();
		const card = screen.getByRole("region", { name: "Dados da obra" });
		expect(within(card).getByText("Casa Moinhos")).toBeInTheDocument();
		expect(
			within(card).getByText(
				"Só o gerente de obra ou o admin da construtora renomeia a obra.",
			),
		).toBeInTheDocument();
		expect(
			within(card).queryByRole("button", { name: "Renomear" }),
		).not.toBeInTheDocument();
	});

	test("a manager renames, with no lock line", async () => {
		const { handler } = projectApi({ ...OBRA, role: "manager" });
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		expect(
			await screen.findByRole("button", { name: "Renomear" }),
		).toBeInTheDocument();
		expect(screen.getByText("Gerente de obra")).toBeInTheDocument();
		expect(screen.queryByText(/renomeia a obra/)).not.toBeInTheDocument();
	});

	test.each([
		["admin", "admin"],
		["manager", "manager"],
		["assistant", "assistant"],
	] as const)(
		"a delivered project is closed to the %s: no Renomear and a lock line (C6)",
		async (_label, role) => {
			const { handler } = projectApi({ ...OBRA, role, status: "delivered" });
			stubApi(signedIn, { api: handler });

			renderAt(CONFIG_PATH);

			expect(await screen.findByText("Entregue")).toBeInTheDocument();
			const card = screen.getByRole("region", { name: "Dados da obra" });
			expect(within(card).getByText("Casa Moinhos")).toBeInTheDocument();
			expect(
				within(card).getByText(
					"A obra foi entregue: o nome não pode mais ser alterado.",
				),
			).toBeInTheDocument();
			expect(
				within(card).queryByRole("button", { name: "Renomear" }),
			).not.toBeInTheDocument();
		},
	);
});

describe("the entry from the project home", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("the desktop header has a Configuração da obra button that opens the configuration", async () => {
		const { handler } = projectApi(OBRA);
		stubApi(signedIn, { api: handler });

		const { router } = renderAt(`/projects/${OBRA.id}`);
		const entry = await screen.findByRole("link", {
			name: "Configuração da obra",
		});

		expect(entry).toHaveTextContent("Configuração da obra");
		await userEvent.click(entry);
		await waitFor(() => {
			expect(router.state.location.pathname).toBe(CONFIG_PATH);
		});
	});

	test("the phone header has an icon with the same name and no text", async () => {
		setViewport("phone");
		const { handler } = projectApi(OBRA);
		stubApi(signedIn, { api: handler });

		const { router } = renderAt(`/projects/${OBRA.id}`);
		const entry = await screen.findByRole("link", {
			name: "Configuração da obra",
		});

		expect(entry).not.toHaveTextContent("Configuração da obra");
		expect(
			screen.getAllByRole("link", { name: "Configuração da obra" }),
		).toHaveLength(1);
		await userEvent.click(entry);
		await waitFor(() => {
			expect(router.state.location.pathname).toBe(CONFIG_PATH);
		});
	});

	test("an assistant gets the entry too, to read the data", async () => {
		const { handler } = projectApi({ ...OBRA, role: "assistant" });
		stubApi(signedIn, { api: handler });

		renderAt(`/projects/${OBRA.id}`);

		expect(
			await screen.findByRole("link", { name: "Configuração da obra" }),
		).toBeInTheDocument();
	});
});
