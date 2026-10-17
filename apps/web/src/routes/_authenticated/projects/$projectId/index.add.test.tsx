import type { ProjectAccessRole } from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import { renderAt, signedIn, stubApi } from "@/test/renderApp";
import {
	numberedFloors,
	structureOf,
	tower,
	writableApi,
} from "@/test/structureApi";

const user = userEvent.setup({ delay: null });

function obra(role: ProjectAccessRole = "manager", delivered = false) {
	return {
		...project(7, role, delivered ? "delivered" : "active"),
		name: "Casa Moinhos",
	};
}

const OBRA_PATH = `/projects/${obra().id}`;

function severalTowers() {
	return structureOf(
		[
			tower("Torre A", numberedFloors(1, 2, 2), ["Salão de festas"]),
			tower("Torre B", numberedFloors(1, 2, 2)),
		],
		["Guarita"],
	);
}

function singleTower() {
	return structureOf(
		[tower("Torre A", numberedFloors(1, 2, 2), ["Salão de festas"])],
		["Guarita"],
	);
}

function sectionOf(title: string) {
	const section = screen
		.getByRole("heading", { level: 2, name: title })
		.closest("section");
	if (!section) throw new Error(`No section under "${title}".`);
	return section;
}

async function openAddMenu() {
	await user.click(await screen.findByRole("button", { name: "Adicionar" }));
}

describe("a project with no structure (E1)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("offers the wizard and, below it, one tower at a time", async () => {
		stubApi(signedIn, {
			api: writableApi(obra(), structureOf([])).handler,
		});

		renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("link", { name: "Montar estrutura" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Adicionar uma torre por vez" }),
		).toBeEnabled();
	});

	test("adds the first tower, named Torre A, and then shows its façade home", async () => {
		const api = writableApi(obra(), structureOf([]));
		stubApi(signedIn, { api: api.handler });
		renderAt(OBRA_PATH);

		await user.click(
			await screen.findByRole("button", {
				name: "Adicionar uma torre por vez",
			}),
		);

		const field = screen.getByRole("textbox", { name: "Nome da torre" });
		expect(field).toHaveValue("Torre A");
		await waitFor(() => expect(field).toHaveFocus());
		expect(
			screen.queryByRole("button", { name: "Adicionar uma torre por vez" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Montar estrutura" }),
		).toBeInTheDocument();

		await user.keyboard("{Enter}");

		expect(
			await screen.findByRole("heading", {
				name: "A obra ainda não tem andares",
			}),
		).toBeInTheDocument();
		expect(api.created).toHaveLength(1);
		expect(nth(nth(api.created, 0).locations, 0)).toMatchObject({
			parentId: null,
			type: "tower",
			name: "Torre A",
			position: 0,
		});
		expect(screen.queryByText("Torre A")).not.toBeInTheDocument();
	});

	test("goes back to the two buttons when the form is cancelled", async () => {
		const api = writableApi(obra(), structureOf([]));
		stubApi(signedIn, { api: api.handler });
		renderAt(OBRA_PATH);
		await user.click(
			await screen.findByRole("button", {
				name: "Adicionar uma torre por vez",
			}),
		);
		await waitFor(() =>
			expect(
				screen.getByRole("textbox", { name: "Nome da torre" }),
			).toHaveFocus(),
		);

		await user.keyboard("{Escape}");

		expect(
			await screen.findByRole("button", {
				name: "Adicionar uma torre por vez",
			}),
		).toBeInTheDocument();
		expect(api.created).toHaveLength(0);
	});

	test("has no button when nobody can edit", async () => {
		stubApi(signedIn, {
			api: writableApi(obra("manager", true), structureOf([])).handler,
		});

		renderAt(OBRA_PATH);

		expect(
			await screen.findByText(
				"A estrutura aparece aqui quando alguém da equipe montar a obra.",
			),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).queryByRole("button"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: "Montar estrutura" }),
		).not.toBeInTheDocument();
	});
});

describe("several towers (E2)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("opens a menu with Torre, Área comum da obra and the wizard", async () => {
		stubApi(signedIn, {
			api: writableApi(obra(), severalTowers()).handler,
		});
		renderAt(OBRA_PATH);

		await openAddMenu();

		const items = await screen.findAllByRole("menuitem");
		expect(items.map((item) => item.textContent)).toEqual([
			"Torre",
			"Área comum da obra",
			"Montar com o assistente",
		]);
		expect(items[2]).toHaveAttribute("href", `${OBRA_PATH}/structure/new`);
	});

	test("adds a tower named after the next letter and shows its card", async () => {
		const api = writableApi(obra(), severalTowers());
		stubApi(signedIn, { api: api.handler });
		renderAt(OBRA_PATH);
		await openAddMenu();

		await user.click(await screen.findByRole("menuitem", { name: "Torre" }));

		const field = await screen.findByRole("textbox", { name: "Nome da torre" });
		expect(field).toHaveValue("Torre C");
		await waitFor(() => expect(field).toHaveFocus());
		await user.clear(field);
		await user.type(field, "Torre Verde");
		await user.keyboard("{Enter}");

		expect(
			await screen.findByRole("link", { name: /^Torre Verde/ }),
		).toBeInTheDocument();
		expect(nth(nth(api.created, 0).locations, 0)).toMatchObject({
			parentId: null,
			type: "tower",
			name: "Torre Verde",
			position: 3,
		});
		expect(
			screen.queryByRole("textbox", { name: "Nome da torre" }),
		).not.toBeInTheDocument();
	});

	test("adds a common area of the obra at the end of its list", async () => {
		const api = writableApi(obra(), severalTowers());
		stubApi(signedIn, { api: api.handler });
		renderAt(OBRA_PATH);
		await openAddMenu();

		await user.click(
			await screen.findByRole("menuitem", { name: "Área comum da obra" }),
		);

		const field = await screen.findByRole("textbox", {
			name: "Adicionar área comum",
		});
		expect(field).toHaveValue("");
		await user.type(field, "Portaria");
		await user.keyboard("{Enter}");

		expect(
			await within(sectionOf("Áreas comuns da obra")).findByRole("link", {
				name: "Portaria",
			}),
		).toBeInTheDocument();
		expect(nth(nth(api.created, 0).locations, 0)).toMatchObject({
			parentId: null,
			type: "common_area",
			name: "Portaria",
		});
	});

	test("adds a common area of the obra from the end of its list", async () => {
		const api = writableApi(obra(), severalTowers());
		stubApi(signedIn, { api: api.handler });
		renderAt(OBRA_PATH);

		await user.click(
			await screen.findByRole("button", { name: "Adicionar área comum" }),
		);

		expect(
			await screen.findByRole("textbox", { name: "Adicionar área comum" }),
		).toBeInTheDocument();
	});

	test("gives each common area of the obra a menu to rename it", async () => {
		stubApi(signedIn, {
			api: writableApi(obra(), severalTowers()).handler,
		});
		renderAt(OBRA_PATH);

		await user.click(
			await screen.findByRole("button", {
				name: "Ações da área comum Guarita",
			}),
		);
		await user.click(await screen.findByRole("menuitem", { name: "Renomear" }));

		const dialog = await screen.findByRole("dialog");
		expect(
			within(dialog).getByRole("heading", { name: "Renomear a área comum" }),
		).toBeInTheDocument();
		expect(within(dialog).getByRole("textbox", { name: "Nome" })).toHaveValue(
			"Guarita",
		);
	});

	test("shows a delivered obra with no add menu and no row menus (E5)", async () => {
		stubApi(signedIn, {
			api: writableApi(obra("admin", true), severalTowers()).handler,
		});

		renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("heading", { name: "Torres" }),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).queryByRole("button"),
		).not.toBeInTheDocument();
	});
});

describe("a single tower (E3)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("carries the same Adicionar menu on the façade", async () => {
		stubApi(signedIn, {
			api: writableApi(obra(), singleTower()).handler,
		});
		renderAt(OBRA_PATH);

		await openAddMenu();

		expect(
			(await screen.findAllByRole("menuitem")).map((item) => item.textContent),
		).toEqual(["Torre", "Área comum da obra", "Montar com o assistente"]);
	});

	test("suggests Torre B for the second tower and then shows both with their cards", async () => {
		const api = writableApi(obra(), singleTower());
		stubApi(signedIn, { api: api.handler });
		renderAt(OBRA_PATH);
		expect(screen.queryByText("Torre A")).not.toBeInTheDocument();
		await openAddMenu();

		await user.click(await screen.findByRole("menuitem", { name: "Torre" }));

		const field = await screen.findByRole("textbox", { name: "Nome da torre" });
		expect(field).toHaveValue("Torre B");
		await user.keyboard("{Enter}");

		expect(
			await screen.findByRole("heading", { level: 2, name: "Torres" }),
		).toBeInTheDocument();
		const cards = within(screen.getByRole("main")).getAllByRole("link", {
			name: /^Torre /,
		});
		expect(cards.map((card) => card.textContent)).toEqual([
			expect.stringContaining("Torre A"),
			expect.stringContaining("Torre B"),
		]);
		expect(nth(nth(api.created, 0).locations, 0)).toMatchObject({
			type: "tower",
			name: "Torre B",
			position: 2,
		});
	});

	test("adds a common area of the obra beside the tower's own, in one list", async () => {
		const api = writableApi(obra(), singleTower());
		stubApi(signedIn, { api: api.handler });
		renderAt(OBRA_PATH);

		await user.click(
			await screen.findByRole("button", { name: "Adicionar área comum" }),
		);
		await user.type(
			await screen.findByRole("textbox", { name: "Adicionar área comum" }),
			"Portaria",
		);
		await user.keyboard("{Enter}");

		const areas = within(sectionOf("Áreas comuns"));
		expect(
			await areas.findByRole("link", { name: "Portaria" }),
		).toBeInTheDocument();
		expect(areas.getAllByRole("link").map((link) => link.textContent)).toEqual([
			"Salão de festas",
			"Guarita",
			"Portaria",
		]);
		expect(nth(nth(api.created, 0).locations, 0)).toMatchObject({
			parentId: null,
			type: "common_area",
		});
	});

	test("lets the tower's common areas and the obra's be renamed in their own scope", async () => {
		stubApi(signedIn, {
			api: writableApi(obra(), singleTower()).handler,
		});
		renderAt(OBRA_PATH);

		await user.click(
			await screen.findByRole("button", {
				name: "Ações da área comum Salão de festas",
			}),
		);
		await user.click(await screen.findByRole("menuitem", { name: "Renomear" }));
		const towerDialog = await screen.findByRole("dialog");
		expect(
			within(towerDialog).getByText("Único na torre."),
		).toBeInTheDocument();
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		await user.click(
			screen.getByRole("button", { name: "Ações da área comum Guarita" }),
		);
		await user.click(await screen.findByRole("menuitem", { name: "Renomear" }));
		const projectDialog = await screen.findByRole("dialog");
		expect(
			within(projectDialog).getByText("Único na obra."),
		).toBeInTheDocument();
	});

	test("shows a tower without floors with its menu, ready for the first floors", async () => {
		const bare = structureOf([tower("Torre A", [])]);
		stubApi(signedIn, { api: writableApi(obra(), bare).handler });

		renderAt(OBRA_PATH);

		expect(
			await screen.findByRole("heading", {
				name: "A obra ainda não tem andares",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Adicionar" }),
		).toBeInTheDocument();
	});
});
