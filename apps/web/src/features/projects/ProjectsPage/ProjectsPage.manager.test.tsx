import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { projectsApi, type stubProjects } from "@/test/projectsApi";
import {
	type ApiHandler,
	json,
	organization,
	renderAt,
	signedIn,
	stubApi,
} from "@/test/renderApp";
import { setViewport } from "@/test/viewport";

const MANAGERS = [
	{ id: "u-carla", name: "Carla Mendes" },
	{ id: "u-diego", name: "Diego Almeida" },
];

function adminApi(total: number, filtered = total): ApiHandler {
	const all = projectsApi(total);
	const some = projectsApi(filtered);
	return (url) => {
		if (url.pathname === "/api/projects/managers") return json(MANAGERS);
		if (url.pathname !== "/api/projects") return undefined;
		return url.searchParams.has("manager") ? some(url) : all(url);
	};
}

function stubAs(role: "admin" | "manager", api: ApiHandler) {
	return stubApi(signedIn, { organization: { ...organization, role }, api });
}

function requestedPaths(
	fetchMock: ReturnType<typeof stubProjects>["fetchMock"],
) {
	return fetchMock.mock.calls.map(
		([input]) => new URL(String(input), "http://localhost").pathname,
	);
}

describe("the manager filter", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	test("lets the admin filter by manager from the toolbar, keeping it in the address", async () => {
		const { fetchMock } = stubAs("admin", adminApi(26, 3));

		const { router } = renderAt("/projects");
		await userEvent.click(
			await screen.findByRole("button", { name: "Gerente: Todos" }),
		);
		const menu = await screen.findByRole("menu");
		expect(within(menu).getByText("Gerente")).toBeInTheDocument();
		expect(
			within(menu).getByRole("menuitemradio", { name: "Todos os gerentes" }),
		).toBeChecked();
		await userEvent.click(
			await within(menu).findByRole("menuitemradio", { name: "Carla Mendes" }),
		);

		expect(
			await screen.findByRole("button", { name: "Gerente: Carla Mendes" }),
		).toBeInTheDocument();
		expect(await screen.findByText("3 obras")).toBeInTheDocument();
		expect(router.state.location.search).toEqual({ manager: "u-carla" });
		const last = fetchMock.mock.calls
			.map(([input]) => new URL(String(input), "http://localhost"))
			.filter((url) => url.pathname === "/api/projects")
			.at(-1);
		expect(last?.searchParams.get("manager")).toBe("u-carla");
	});

	test("reopens the list filtered by the manager in the address", async () => {
		stubAs("admin", adminApi(26, 3));

		renderAt("/projects?manager=u-diego");

		expect(
			await screen.findByRole("button", { name: "Gerente: Diego Almeida" }),
		).toBeInTheDocument();
		expect(await screen.findByText("3 obras")).toBeInTheDocument();
	});

	test("counts as an active filter and “Limpar filtros” clears it", async () => {
		stubAs("admin", adminApi(26, 3));

		const { router } = renderAt("/projects?manager=u-carla");
		await screen.findByText("3 obras");
		await userEvent.click(
			screen.getByRole("button", { name: "Limpar filtros" }),
		);

		expect(await screen.findByText("26 obras")).toBeInTheDocument();
		expect(router.state.location.search).toEqual({});
		expect(
			screen.getByRole("button", { name: "Gerente: Todos" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Limpar filtros" }),
		).not.toBeInTheDocument();
	});

	test("does not offer “Limpar filtros” with nothing filtered", async () => {
		stubAs("admin", adminApi(26));

		renderAt("/projects");
		await screen.findByText("26 obras");

		expect(
			screen.queryByRole("button", { name: "Limpar filtros" }),
		).not.toBeInTheDocument();
	});

	test("is not offered to a manager, who never asks for the managers either", async () => {
		const { fetchMock } = stubAs("manager", adminApi(26));

		renderAt("/projects");
		await screen.findByText("26 obras");

		expect(
			screen.queryByRole("button", { name: /^Gerente:/ }),
		).not.toBeInTheDocument();
		expect(requestedPaths(fetchMock)).not.toContain("/api/projects/managers");
	});

	test("a manager's address filter neither shows nor counts", async () => {
		setViewport("phone");
		const { fetchMock } = stubAs("manager", adminApi(26, 3));

		renderAt("/projects?manager=u-carla");
		await screen.findByText("26 obras");

		expect(screen.getByRole("button", { name: "Filtros" })).toHaveTextContent(
			/^Filtros$/,
		);
		const asked = fetchMock.mock.calls
			.map(([input]) => new URL(String(input), "http://localhost"))
			.filter((url) => url.pathname === "/api/projects")
			.at(-1);
		expect(asked?.searchParams.has("manager")).toBe(false);
	});

	test("shows the manager section in the phone's sheet, applied on “Ver N obras”", async () => {
		setViewport("phone");
		stubAs("admin", adminApi(26, 3));

		const { router } = renderAt("/projects");
		await screen.findByText("Obra 1");
		await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
		const sheet = await screen.findByRole("dialog", { name: "Filtros" });
		const managers = await within(sheet).findByRole("radiogroup", {
			name: "Gerente",
		});
		expect(
			within(managers).getByRole("radio", { name: "Todos os gerentes" }),
		).toBeChecked();

		await userEvent.click(
			await within(managers).findByRole("radio", { name: "Carla Mendes" }),
		);

		expect(sheet).toHaveAccessibleDescription("1 filtro ativo");
		await userEvent.click(
			await within(sheet).findByRole("button", { name: "Ver 3 obras" }),
		);
		await waitFor(() => {
			expect(router.state.location.search).toEqual({ manager: "u-carla" });
		});
		expect(
			screen.getByRole("button", { name: "Filtros, 1 ativo" }),
		).toBeInTheDocument();
	});

	test("the phone's sheet clears the manager with “Limpar filtros”", async () => {
		setViewport("phone");
		stubAs("admin", adminApi(26, 3));

		renderAt("/projects?manager=u-carla");
		await screen.findByText("3 obras");
		await userEvent.click(
			screen.getByRole("button", { name: "Filtros, 1 ativo" }),
		);
		const sheet = await screen.findByRole("dialog", { name: "Filtros" });

		await userEvent.click(
			within(sheet).getByRole("button", { name: "Limpar filtros" }),
		);

		expect(
			within(sheet).getByRole("radio", { name: "Todos os gerentes" }),
		).toBeChecked();
	});

	test("the phone's sheet has no manager section for a manager", async () => {
		setViewport("phone");
		stubAs("manager", adminApi(26));

		renderAt("/projects");
		await screen.findByText("Obra 1");
		await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
		const sheet = await screen.findByRole("dialog", { name: "Filtros" });

		expect(
			within(sheet).queryByRole("radiogroup", { name: "Gerente" }),
		).not.toBeInTheDocument();
	});

	test("a manager with no project keeps the toolbar and a way back", async () => {
		stubAs("admin", adminApi(26, 0));

		renderAt("/projects?manager=u-carla");

		expect(
			await screen.findByRole("heading", { name: "Nenhuma obra encontrada" }),
		).toBeInTheDocument();
		expect(
			await screen.findByRole("button", { name: "Gerente: Carla Mendes" }),
		).toBeInTheDocument();
		await userEvent.click(
			within(screen.getByRole("status")).getByRole("button", {
				name: "Limpar filtros",
			}),
		);
		expect(await screen.findByText("26 obras")).toBeInTheDocument();
	});
});

describe("an empty list, by role", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("invites the admin to create the first project (O5)", async () => {
		stubAs("admin", adminApi(0));

		renderAt("/projects");

		expect(
			await screen.findByRole("heading", { name: "Nenhuma obra ainda" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Crie a primeira obra da construtora para começar a mapear pendências.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText("Nenhuma obra por aqui")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /^Gerente:/ }),
		).not.toBeInTheDocument();
	});

	test("tells a manager the admin will link them (O7)", async () => {
		stubAs("manager", adminApi(0));

		renderAt("/projects");

		expect(
			await screen.findByRole("heading", { name: "Nenhuma obra por aqui" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Nenhuma obra ainda")).not.toBeInTheDocument();
	});

	test("waits for the role instead of flashing the wrong empty state", async () => {
		stubAs("admin", (url) =>
			url.pathname === "/api/organization"
				? new Promise<Response>(() => {})
				: adminApi(0)(url),
		);

		renderAt("/projects");

		expect(
			await screen.findByRole("status", { name: "Carregando obras" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Nenhuma obra por aqui" }),
		).not.toBeInTheDocument();
	});
});
