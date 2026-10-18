import { LOCATION_NAME_TAKEN, PROJECT_DELIVERED } from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import { floor, structureOf, tower, writableApi } from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const user = userEvent.setup({ delay: null });

const LOCKED = "A obra foi entregue: a estrutura não pode mais ser alterada.";

function build() {
	const ninth = floor("9º andar", ["901", "902", "903", "904"], ["Hall"]);
	const towerA = tower("Torre A", [ninth], ["Salão de festas"]);
	const towerB = tower("Torre B", [floor("1º andar", ["101", "102"])]);
	return {
		ninth,
		towerA,
		towerB,
		several: structureOf([towerA, towerB], ["Guarita"]),
	};
}

function obra(delivered = false) {
	return {
		...project(3, "manager", delivered ? "delivered" : "active"),
		name: "Casa Moinhos",
	};
}

const pathOf = (id: string) => `/projects/${obra().id}/locations/${id}`;

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Conflict", status, code, ...extra },
		status,
	);
}

async function renameFrom(menuName: string, itemName: string) {
	await user.click(await screen.findByRole("button", { name: menuName }));
	await user.click(await screen.findByRole("menuitem", { name: itemName }));
	return screen.findByRole("dialog");
}

function nameField(dialog: HTMLElement) {
	return within(dialog).getByRole("textbox", { name: "Nome" });
}

async function typeName(dialog: HTMLElement, name: string) {
	const field = nameField(dialog);
	await user.clear(field);
	await user.type(field, name);
}

describe("the page menu", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("offers renaming, adding a common area and removing on a tower (T2)", async () => {
		const { towerA, several } = build();
		stubApi(signedIn, { api: writableApi(obra(), several).handler });
		renderAt(pathOf(towerA.id));

		await user.click(
			await screen.findByRole("button", { name: "Ações da torre" }),
		);

		const items = await screen.findAllByRole("menuitem");
		expect(items.map((item) => item.textContent)).toEqual([
			"Renomear torre",
			"Adicionar área comum",
			"Remover torre",
		]);
	});

	test.each([
		[
			"a floor",
			"ninth",
			"Ações do andar",
			[
				"Renomear andar",
				"Mover para cima",
				"Mover para baixo",
				"Remover andar",
			],
		],
		[
			"a unit",
			"unit",
			"Ações da unidade",
			["Renomear", "Mover para cima", "Mover para baixo", "Remover unidade"],
		],
		[
			"a common area of a floor",
			"hall",
			"Ações da área comum",
			["Renomear", "Remover área comum"],
		],
	] as const)(
		"offers renaming, moving and removing on %s",
		async (_label, which, menu, labels) => {
			const { ninth, several } = build();
			const target = {
				ninth,
				unit: nth(ninth.units, 0),
				hall: nth(ninth.commonAreas, 0),
			}[which];
			stubApi(signedIn, { api: writableApi(obra(), several).handler });
			renderAt(pathOf(target.id));

			await user.click(await screen.findByRole("button", { name: menu }));

			const items = await screen.findAllByRole("menuitem");
			expect(items.map((item) => item.textContent)).toEqual(labels);
		},
	);

	test("sits in the back-link row on the phone and beside the title on the desktop", async () => {
		const { towerA, several } = build();
		stubApi(signedIn, { api: writableApi(obra(), several).handler });
		setViewport("phone");
		renderAt(pathOf(towerA.id));

		const button = await screen.findByRole("button", {
			name: "Ações da torre",
		});

		const backRow = screen.getByRole("link", {
			name: "Casa Moinhos",
		}).parentElement;
		expect(backRow).toContainElement(button);
		expect(
			screen.getAllByRole("button", { name: "Ações da torre" }),
		).toHaveLength(1);
	});

	test("is absent from a delivered obra", async () => {
		const { towerA, several } = build();
		stubApi(signedIn, { api: writableApi(obra(true), several).handler });
		renderAt(pathOf(towerA.id));

		expect(await screen.findByText(LOCKED)).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Ações da torre" }),
		).not.toBeInTheDocument();
	});
});

describe("renaming from the page (R6)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("renames a tower and shows the new name in the title", async () => {
		const { towerA, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(towerA.id));

		const dialog = await renameFrom("Ações da torre", "Renomear torre");

		expect(
			within(dialog).getByRole("heading", { name: "Renomear a torre" }),
		).toBeInTheDocument();
		expect(nameField(dialog)).toHaveValue("Torre A");
		expect(nameField(dialog)).toHaveFocus();
		expect(within(dialog).getByText("Único na obra.")).toBeInTheDocument();
		await typeName(dialog, "Bloco Azul");
		await user.keyboard("{Enter}");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Bloco Azul" }),
		).toBeInTheDocument();
		expect(api.renamed).toEqual([
			{ locationId: towerA.id, name: "Bloco Azul" },
		]);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(
			screen.getByRole("button", { name: "Ações da torre" }),
		).toHaveFocus();
	});

	test("shows the unit's number in mono, unique in the tower", async () => {
		const { ninth, several } = build();
		const unit = nth(ninth.units, 2);
		stubApi(signedIn, { api: writableApi(obra(), several).handler });
		renderAt(pathOf(unit.id));

		const dialog = await renameFrom("Ações da unidade", "Renomear");

		expect(
			within(dialog).getByRole("heading", { name: "Renomear a unidade" }),
		).toBeInTheDocument();
		expect(nameField(dialog)).toHaveValue("903");
		expect(nameField(dialog)).toHaveClass("font-mono");
		expect(within(dialog).getByText("Único na torre.")).toBeInTheDocument();
	});

	test.each([
		[
			"a floor",
			"Ações do andar",
			"Renomear andar",
			"Renomear o andar",
			"Único na torre.",
		],
	])("titles the dialog of %s", async (_label, menu, item, title, hint) => {
		const { ninth, several } = build();
		stubApi(signedIn, { api: writableApi(obra(), several).handler });
		renderAt(pathOf(ninth.id));

		const dialog = await renameFrom(menu, item);

		expect(
			within(dialog).getByRole("heading", { name: title }),
		).toBeInTheDocument();
		expect(within(dialog).getByText(hint)).toBeInTheDocument();
	});

	test.each([
		["of the obra", "project", "Único na obra."],
		["of a tower", "tower", "Único na torre."],
		["of a floor", "floor", "Único no andar."],
	] as const)(
		"says where the name of a common area %s is unique",
		async (_label, where, hint) => {
			const { ninth, towerA, several } = build();
			const target = {
				project: nth(several.commonAreas, 0),
				tower: nth(towerA.commonAreas, 0),
				floor: nth(ninth.commonAreas, 0),
			}[where];
			stubApi(signedIn, { api: writableApi(obra(), several).handler });
			renderAt(pathOf(target.id));

			const dialog = await renameFrom("Ações da área comum", "Renomear");

			expect(
				within(dialog).getByRole("heading", { name: "Renomear a área comum" }),
			).toBeInTheDocument();
			expect(within(dialog).getByText(hint)).toBeInTheDocument();
		},
	);

	test("closes with Cancelar or Escape, sending nothing", async () => {
		const { towerA, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(towerA.id));
		let dialog = await renameFrom("Ações da torre", "Renomear torre");

		await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		dialog = await renameFrom("Ações da torre", "Renomear torre");
		await typeName(dialog, "Bloco Azul");
		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(api.renamed).toEqual([]);
		expect(
			screen.getByRole("heading", { level: 1, name: "Torre A" }),
		).toBeInTheDocument();
	});

	test("closes without a request when the name did not change", async () => {
		const { towerA, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(towerA.id));
		const dialog = await renameFrom("Ações da torre", "Renomear torre");

		await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(api.renamed).toEqual([]);
	});

	test("asks for a name before sending anything", async () => {
		const { towerA, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(towerA.id));
		const dialog = await renameFrom("Ações da torre", "Renomear torre");
		await user.clear(nameField(dialog));

		await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Informe o nome.",
		);
		expect(api.renamed).toEqual([]);
	});

	test("says the rename failed when the request does, keeping the dialog", async () => {
		const { towerA, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra(), several, { rename: () => json({}, 500) })
				.handler,
		});
		renderAt(pathOf(towerA.id));
		const dialog = await renameFrom("Ações da torre", "Renomear torre");
		await typeName(dialog, "Bloco Azul");

		await user.keyboard("{Enter}");

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Não foi possível renomear. Confira sua conexão e tente de novo.",
		);
		expect(nameField(dialog)).toHaveValue("Bloco Azul");
	});

	test("turns the page read-only when the rename answers PROJECT_DELIVERED", async () => {
		const { towerA, several } = build();
		const api = writableApi(obra(), several, {
			rename: () => {
				api.state.summary = obra(true);
				return problem(409, PROJECT_DELIVERED);
			},
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(towerA.id));
		const dialog = await renameFrom("Ações da torre", "Renomear torre");
		await typeName(dialog, "Bloco Azul");

		await user.keyboard("{Enter}");

		expect(await screen.findByText(LOCKED)).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(
			screen.queryByRole("button", { name: "Ações da torre" }),
		).not.toBeInTheDocument();
	});
});

describe("a name in use (R7)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("says so in the field, naming the tower, and takes a new try", async () => {
		const { ninth, several } = build();
		const unit = nth(ninth.units, 3);
		const api = writableApi(obra(), several, {
			rename: (_id, name, attempt) =>
				attempt === 1
					? problem(409, LOCATION_NAME_TAKEN, { names: [name] })
					: undefined,
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(unit.id));
		const dialog = await renameFrom("Ações da unidade", "Renomear");
		await typeName(dialog, "903");

		await user.keyboard("{Enter}");

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Já existe a unidade 903 na Torre A.",
		);
		expect(nameField(dialog)).toHaveAttribute("aria-invalid", "true");
		expect(
			within(dialog).queryByText("Único na torre."),
		).not.toBeInTheDocument();

		await user.clear(nameField(dialog));
		await user.type(nameField(dialog), "905");
		expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
		await user.keyboard("{Enter}");

		expect(
			await screen.findByRole("heading", { level: 1, name: "905" }),
		).toBeInTheDocument();
		expect(api.renamed.map(({ name }) => name)).toEqual(["903", "905"]);
	});

	test("leaves the tower's name out when the obra has a single tower", async () => {
		const { ninth, towerA } = build();
		const unit = nth(ninth.units, 3);
		stubApi(signedIn, {
			api: writableApi(obra(), structureOf([towerA]), {
				rename: () => problem(409, LOCATION_NAME_TAKEN, { names: ["903"] }),
			}).handler,
		});
		renderAt(pathOf(unit.id));
		const dialog = await renameFrom("Ações da unidade", "Renomear");
		await typeName(dialog, "903");

		await user.keyboard("{Enter}");

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Já existe a unidade 903 nesta torre.",
		);
	});

	test("says a floor, a common area and a tower in their own words", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra(), several, {
				rename: (_id, name) =>
					problem(409, LOCATION_NAME_TAKEN, { names: [name] }),
			}).handler,
		});
		renderAt(pathOf(ninth.id));
		const floorDialog = await renameFrom("Ações do andar", "Renomear andar");
		await typeName(floorDialog, "Cobertura");
		await user.keyboard("{Enter}");
		expect(await within(floorDialog).findByRole("alert")).toHaveTextContent(
			"Já existe o andar Cobertura na Torre A.",
		);
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		const areaDialog = await renameFrom("Ações da área comum Hall", "Renomear");
		await typeName(areaDialog, "Garagem");
		await user.keyboard("{Enter}");
		expect(await within(areaDialog).findByRole("alert")).toHaveTextContent(
			"Já existe uma área comum Garagem neste andar.",
		);
	});
});

describe("renaming from a list", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("renames a unit from its row's menu and keeps the list in place", async () => {
		const { ninth, several } = build();
		const unit = nth(ninth.units, 1);
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));

		const dialog = await renameFrom("Ações da unidade 902", "Renomear");
		expect(nameField(dialog)).toHaveValue("902");
		await typeName(dialog, "902A");
		await user.keyboard("{Enter}");

		await waitFor(() => {
			expect(screen.getByRole("link", { name: /^902A/ })).toBeInTheDocument();
		});
		expect(api.renamed).toEqual([{ locationId: unit.id, name: "902A" }]);
		const units = screen
			.getByRole("heading", { name: "Unidades" })
			.closest("section");
		expect(
			within(units as HTMLElement)
				.getAllByRole("link")
				.map((link) => link.textContent?.replace("Sem tipologia", "")),
		).toEqual(["901", "902A", "903", "904"]);
	});

	test("renames a common area of a floor from its row's menu", async () => {
		const { ninth, several } = build();
		const hall = nth(ninth.commonAreas, 0);
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));

		const dialog = await renameFrom("Ações da área comum Hall", "Renomear");
		expect(
			within(dialog).getByRole("heading", { name: "Renomear a área comum" }),
		).toBeInTheDocument();
		await typeName(dialog, "Hall social");
		await user.keyboard("{Enter}");

		expect(
			await screen.findByRole("link", { name: "Hall social" }),
		).toBeInTheDocument();
		expect(api.renamed).toEqual([{ locationId: hall.id, name: "Hall social" }]);
	});

	test("renames a common area of a tower from its row's menu", async () => {
		const { towerA, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(towerA.id));

		const dialog = await renameFrom(
			"Ações da área comum Salão de festas",
			"Renomear",
		);
		await typeName(dialog, "Salão");
		await user.keyboard("{Enter}");

		expect(
			await screen.findByRole("link", { name: "Salão" }),
		).toBeInTheDocument();
	});
});

describe("on the phone", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("renames from the page menu in a bottom panel", async () => {
		const { towerA, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		setViewport("phone");
		renderAt(pathOf(towerA.id));

		const dialog = await renameFrom("Ações da torre", "Renomear torre");
		await typeName(dialog, "Bloco Azul");
		await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByRole("heading", { level: 1, name: "Bloco Azul" }),
		).toBeInTheDocument();
		expect(api.renamed).toHaveLength(1);
	});

	test("opens the bottom panel from a row's menu with the focus on Nome", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, { api: writableApi(obra(), several).handler });
		setViewport("phone");
		renderAt(pathOf(ninth.id));

		const dialog = await renameFrom("Ações da unidade 901", "Renomear");

		await waitFor(() => {
			expect(nameField(dialog)).toHaveFocus();
		});
	});
});
