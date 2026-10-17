import {
	type CreateStructure,
	LOCATION_NAME_TAKEN,
	NO_UNITS_LEFT,
	PROJECT_DELIVERED,
	type ProjectAccessRole,
} from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import { floor, structureOf, tower, writableApi } from "@/test/structureApi";

const user = userEvent.setup({ delay: null });

const LOCKED = "A obra foi entregue: a estrutura não pode mais ser alterada.";
const EXHAUSTED = "A reserva da obra acabou.";

function build() {
	const ninth = floor("9º andar", ["901", "902", "903", "904"], ["Hall"]);
	const basement = floor("Subsolo", [], ["Garagem"]);
	const towerA = tower("Torre A", [basement, ninth], ["Salão de festas"]);
	const towerB = tower("Torre B", [floor("1º andar", ["101", "102"])]);
	return {
		ninth,
		basement,
		towerA,
		towerB,
		several: structureOf([towerA, towerB], ["Guarita"]),
	};
}

function obra(role: ProjectAccessRole = "manager", delivered = false) {
	return {
		...project(3, role, delivered ? "delivered" : "active"),
		name: "Casa Moinhos",
		units: { reserved: 112, used: 100 },
	};
}

const pathOf = (id: string) => `/projects/${obra().id}/locations/${id}`;

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Conflict", status, code, ...extra },
		status,
	);
}

function sectionOf(title: string) {
	const section = screen
		.getByRole("heading", { level: 2, name: title })
		.closest("section");
	if (!section) throw new Error(`No section under "${title}".`);
	return section;
}

function bodyOf(call: CreateStructure | undefined) {
	const [entry] = call?.locations ?? [];
	if (!entry) throw new Error("No location was sent.");
	return entry;
}

describe("adding a unit on a floor", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("offers the add rows at the end of each list (F2)", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });

		renderAt(pathOf(ninth.id));

		const units = await screen.findByRole("heading", { name: "Unidades" });
		expect(units).toBeInTheDocument();
		expect(
			within(sectionOf("Unidades")).getByRole("button", {
				name: "Adicionar unidade",
			}),
		).not.toHaveAttribute("aria-disabled");
		expect(
			within(sectionOf("Áreas comuns do andar")).getByRole("button", {
				name: "Adicionar área comum",
			}),
		).toBeEnabled();
	});

	test("turns the row into a form with the next number and what it uses of the reserva (F3)", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra(), several, { remaining: 12 }).handler,
		});
		renderAt(pathOf(ninth.id));

		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);

		const field = screen.getByRole("textbox", { name: "Adicionar unidade" });
		expect(field).toHaveValue("905");
		expect(field).toHaveFocus();
		expect(field).toHaveClass("font-mono");
		expect(
			await screen.findByText("Usa 1 das 12 unidades que restam nesta obra."),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Adicionar" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
	});

	test("says the only unit left in the singular (F3)", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra(), several, { remaining: 1 }).handler,
		});
		renderAt(pathOf(ninth.id));

		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);

		expect(
			await screen.findByText("Usa 1 da única unidade que resta nesta obra."),
		).toBeInTheDocument();
	});

	test("suggests a number from the floor's own number when it has no unit yet", async () => {
		const { several, towerA } = build();
		const empty = floor("10º andar");
		towerA.floors.push(empty);
		stubApi(signedIn, {
			api: writableApi(obra(), several, { remaining: 12 }).handler,
		});
		renderAt(pathOf(empty.id));

		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);

		expect(
			screen.getByRole("textbox", { name: "Adicionar unidade" }),
		).toHaveValue("1001");
	});

	test("adds the unit with Enter, at the end of the floor, and shows it in the list", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);

		await user.keyboard("{Enter}");

		await waitFor(() => {
			expect(
				within(sectionOf("Unidades")).getByRole("link", { name: /^905/ }),
			).toBeInTheDocument();
		});
		const sent = bodyOf(nth(api.created, 0));
		expect(api.created).toHaveLength(1);
		expect(sent).toMatchObject({
			parentId: ninth.id,
			type: "unit",
			name: "905",
			position: 5,
		});
		expect(sent.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(
			screen.queryByRole("textbox", { name: "Adicionar unidade" }),
		).not.toBeInTheDocument();
		expect(
			await screen.findByText("Andar · Torre A · 5 unidades"),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Adicionar unidade" }));
		expect(
			await screen.findByText("Usa 1 das 11 unidades que restam nesta obra."),
		).toBeInTheDocument();
	});

	test("takes the name the person typed, trimmed", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);
		const field = screen.getByRole("textbox", { name: "Adicionar unidade" });

		await user.clear(field);
		await user.type(field, "  910 ");
		await user.click(screen.getByRole("button", { name: "Adicionar" }));

		await waitFor(() => expect(api.created).toHaveLength(1));
		expect(bodyOf(nth(api.created, 0)).name).toBe("910");
	});

	test("cancels with Escape, sending nothing, and puts the focus back on the row", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);

		await user.keyboard("{Escape}");

		const row = await screen.findByRole("button", {
			name: "Adicionar unidade",
		});
		expect(row).toHaveFocus();
		expect(api.created).toHaveLength(0);
		expect(
			screen.queryByRole("textbox", { name: "Adicionar unidade" }),
		).not.toBeInTheDocument();
	});

	test("cancels with the Cancelar button", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);

		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		).toBeInTheDocument();
		expect(api.created).toHaveLength(0);
	});

	test("asks for a name before sending anything", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);
		await user.clear(
			screen.getByRole("textbox", { name: "Adicionar unidade" }),
		);

		await user.click(screen.getByRole("button", { name: "Adicionar" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Informe o nome.",
		);
		expect(api.created).toHaveLength(0);
	});

	test("says the name is taken in the tower, in the field, in place of the hint (F4)", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, {
			remaining: 12,
			create: () => problem(409, LOCATION_NAME_TAKEN, { names: ["903"] }),
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);
		const field = screen.getByRole("textbox", { name: "Adicionar unidade" });
		await user.clear(field);
		await user.type(field, "903");

		await user.keyboard("{Enter}");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Já existe a unidade 903 na Torre A.",
		);
		expect(field).toHaveAttribute("aria-invalid", "true");
		expect(
			screen.queryByText(/unidades que restam nesta obra/),
		).not.toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "Adicionar unidade" })).toBe(
			field,
		);

		await user.type(field, "5");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	test("keeps the tower's name out of the error when the obra has a single tower", async () => {
		const { ninth, towerA } = build();
		const single = structureOf([towerA]);
		stubApi(signedIn, {
			api: writableApi(obra(), single, {
				remaining: 12,
				create: () => problem(409, LOCATION_NAME_TAKEN, { names: ["905"] }),
			}).handler,
		});
		renderAt(pathOf(ninth.id));
		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);

		await user.keyboard("{Enter}");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Já existe a unidade 905 nesta torre.",
		);
	});

	test("says the unit could not be added when the request fails, keeping the form", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, {
			remaining: 12,
			create: () => json({}, 500),
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);

		await user.keyboard("{Enter}");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível adicionar. Confira sua conexão e tente de novo.",
		);
		expect(
			screen.getByRole("textbox", { name: "Adicionar unidade" }),
		).toHaveValue("905");
	});

	test("shows the error in the field and the new count when the last place was taken first (NO_UNITS_LEFT)", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, {
			remaining: 12,
			create: () => {
				api.state.units.remaining = 0;
				return problem(409, NO_UNITS_LEFT, { requested: 1, available: 0 });
			},
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);

		await user.keyboard("{Enter}");

		expect(await screen.findByRole("alert")).toHaveTextContent(EXHAUSTED);
		expect(
			screen.getByRole("textbox", { name: "Adicionar unidade" }),
		).toHaveAttribute("aria-invalid", "true");

		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		const row = await screen.findByRole("button", {
			name: "Adicionar unidade",
		});
		expect(row).toHaveAttribute("aria-disabled", "true");
		await waitFor(() => expect(row).toHaveFocus());
		expect(
			screen.getByText("A reserva da obra acabou.", { exact: false }),
		).toBeInTheDocument();
	});
});

describe("the reserva is over", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test.each([["manager" as const], ["assistant" as const]])(
		"keeps the row, disabled, and tells a %s to ask the admin (F5)",
		async (role) => {
			const { ninth, several } = build();
			stubApi(signedIn, {
				api: writableApi(obra(role), several, { remaining: 0 }).handler,
			});

			renderAt(pathOf(ninth.id));

			const row = await screen.findByRole("button", {
				name: "Adicionar unidade",
			});
			await waitFor(() => expect(row).toHaveAttribute("aria-disabled", "true"));
			expect(row).toHaveAccessibleDescription(
				"A reserva da obra acabou. Fale com o admin da construtora.",
			);
			expect(
				screen.queryByRole("button", { name: "Alterar reserva" }),
			).not.toBeInTheDocument();
		},
	);

	test("leaves the common areas free of the reserva (F5)", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remaining: 0 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Adicionar unidade" }),
			).toHaveAttribute("aria-disabled", "true"),
		);

		await user.click(
			screen.getByRole("button", { name: "Adicionar área comum" }),
		);

		const field = screen.getByRole("textbox", { name: "Adicionar área comum" });
		expect(field).toHaveValue("");
		expect(screen.queryByText(/restam nesta obra/)).not.toBeInTheDocument();
		await user.type(field, "Terraço");
		await user.keyboard("{Enter}");
		await waitFor(() => expect(api.created).toHaveLength(1));
		expect(bodyOf(nth(api.created, 0))).toMatchObject({
			parentId: ninth.id,
			type: "common_area",
			name: "Terraço",
			position: 5,
		});
		expect(
			await screen.findByRole("link", { name: "Terraço" }),
		).toBeInTheDocument();
	});

	test("brings the row back on a background refetch without moving focus to it", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra("admin"), several, { remaining: 0 });
		stubApi(signedIn, { api: api.handler });
		const { queryClient } = renderAt(pathOf(ninth.id));
		const row = await screen.findByRole("button", {
			name: "Adicionar unidade",
		});
		await waitFor(() => expect(row).toHaveAttribute("aria-disabled", "true"));

		api.state.units.remaining = 5;
		await queryClient.refetchQueries({
			queryKey: ["structure", obra().id, "units"],
		});

		const restored = await screen.findByRole("button", {
			name: "Adicionar unidade",
		});
		await waitFor(() => expect(restored).not.toHaveAttribute("aria-disabled"));
		expect(restored).not.toHaveFocus();
		expect(document.body).toHaveFocus();
	});

	test("gives the admin the link to change the reserva, and brings the row back once it grows (F5b)", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra("admin"), several, { remaining: 0 }).handler,
		});
		renderAt(pathOf(ninth.id));
		const row = await screen.findByRole("button", {
			name: "Adicionar unidade",
		});
		await waitFor(() => expect(row).toHaveAttribute("aria-disabled", "true"));
		expect(row).toHaveAccessibleDescription(
			"A reserva da obra acabou. Alterar reserva",
		);

		await user.click(screen.getByRole("button", { name: "Alterar reserva" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Alterar reserva",
		});
		const units = within(dialog).getByRole("textbox", {
			name: "Unidades reservadas",
		});
		await user.clear(units);
		await user.type(units, "130");
		await waitFor(() =>
			expect(
				within(dialog).getByRole("button", { name: "Salvar" }),
			).toBeEnabled(),
		);
		await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Alterar reserva" }),
			).not.toBeInTheDocument(),
		);
		const restored = await screen.findByRole("button", {
			name: "Adicionar unidade",
		});
		await waitFor(() => expect(restored).not.toHaveAttribute("aria-disabled"));
		expect(restored).not.toHaveAccessibleDescription(
			expect.stringContaining(EXHAUSTED),
		);
		expect(
			screen.queryByRole("button", { name: "Alterar reserva" }),
		).not.toBeInTheDocument();
		await waitFor(() => expect(restored).toHaveFocus());
	});
});

describe("adding a common area", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("adds one to the tower from the end of its list", async () => {
		const { towerA, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(towerA.id));

		await user.click(
			await screen.findByRole("button", { name: "Adicionar área comum" }),
		);
		await user.type(
			screen.getByRole("textbox", { name: "Adicionar área comum" }),
			"Academia",
		);
		await user.keyboard("{Enter}");

		await waitFor(() => expect(api.created).toHaveLength(1));
		expect(bodyOf(nth(api.created, 0))).toMatchObject({
			parentId: towerA.id,
			type: "common_area",
			name: "Academia",
			position: 3,
		});
		expect(
			await within(sectionOf("Áreas comuns da torre")).findByRole("link", {
				name: "Academia",
			}),
		).toBeInTheDocument();
	});

	test("opens the same form from the tower's page menu", async () => {
		const { towerA, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra(), several, { remaining: 12 }).handler,
		});
		renderAt(pathOf(towerA.id));

		await user.click(
			await screen.findByRole("button", { name: "Ações da torre" }),
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Adicionar área comum" }),
		);

		const field = await screen.findByRole("textbox", {
			name: "Adicionar área comum",
		});
		await waitFor(() => expect(field).toHaveFocus());
	});

	test("lists a tower without floors with its add row too (T3)", async () => {
		const { several } = build();
		const bare = tower("Torre C");
		several.towers.push(bare);
		stubApi(signedIn, {
			api: writableApi(obra(), several, { remaining: 12 }).handler,
		});

		renderAt(pathOf(bare.id));

		expect(
			await screen.findByRole("heading", {
				name: "A Torre C ainda não tem andares",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Adicionar área comum" }),
		).toBeInTheDocument();
	});

	test("says the name is taken where the area would go", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra(), several, {
				remaining: 12,
				create: () => problem(409, LOCATION_NAME_TAKEN, { names: ["Hall"] }),
			}).handler,
		});
		renderAt(pathOf(ninth.id));
		await user.click(
			await screen.findByRole("button", { name: "Adicionar área comum" }),
		);
		await user.type(
			screen.getByRole("textbox", { name: "Adicionar área comum" }),
			"Hall",
		);

		await user.keyboard("{Enter}");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Já existe uma área comum Hall neste andar.",
		);
	});
});

describe("a delivered obra", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("shows no add row and no menu, only the lock line", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra("admin", true), several, { remaining: 0 }).handler,
		});

		renderAt(pathOf(ninth.id));

		expect(await screen.findByText(LOCKED)).toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).queryByRole("button"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /^Ações/ }),
		).not.toBeInTheDocument();
	});

	test("turns read-only when a write answers PROJECT_DELIVERED", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, {
			remaining: 12,
			create: () => {
				api.state.summary = obra("manager", true);
				return problem(409, PROJECT_DELIVERED);
			},
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await user.click(
			await screen.findByRole("button", { name: "Adicionar unidade" }),
		);

		await user.keyboard("{Enter}");

		expect(await screen.findByText(LOCKED)).toBeInTheDocument();
		await waitFor(() => {
			expect(
				screen.queryByRole("button", { name: "Adicionar unidade" }),
			).not.toBeInTheDocument();
		});
		expect(
			screen.queryByRole("textbox", { name: "Adicionar unidade" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /^Ações/ }),
		).not.toBeInTheDocument();
	});
});
