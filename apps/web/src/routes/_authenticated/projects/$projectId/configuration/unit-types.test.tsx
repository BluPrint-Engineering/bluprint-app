import {
	PROJECT_DELIVERED,
	type ProjectSummary,
	ROOM_NAME_TAKEN,
	UNIT_TYPE_IN_USE,
	UNIT_TYPE_NAME_TAKEN,
	type UnitType,
	type UnitTypeList,
} from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
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
	configurationSectionsApi,
	emptyStructure,
	unitTypeOf,
} from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const OBRA: ProjectSummary = { ...project(7), name: "Casa Moinhos" };
const CONFIG_PATH = `/projects/${OBRA.id}/configuration`;
const BASE = `/api/projects/${OBRA.id}`;
const LOCKED = "A obra foi entregue: a estrutura não pode mais ser alterada.";

const tipologiaA = unitTypeOf(
	"Tipologia A",
	["Sala", "Cozinha", "Sacada", "Quarto", "Banheiro", "Suíte", "Despensa"],
	{ units: 44, changed: 1 },
);
const tipologiaB = unitTypeOf("Tipologia B", ["Sala", "Quarto"], {
	units: 1,
	changed: 0,
});
const tipologiaC = unitTypeOf("Tipologia C", ["Sala"]);

interface Write {
	method: string;
	path: string;
	body: unknown;
}

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Error", status, code, ...extra },
		status,
	);
}

function unitTypesApi({
	summary = OBRA,
	list = { unitTypes: [tipologiaA, tipologiaB, tipologiaC] },
	answer,
}: {
	summary?: ProjectSummary;
	list?: UnitTypeList;
	answer?: (write: Write) => Promise<Response> | undefined;
} = {}) {
	const writes: Write[] = [];
	let current = list;
	const handler: ApiHandler = combine(
		(url, init) => {
			const method = init?.method ?? "GET";
			if (url.pathname === BASE) return json(summary);
			if (!url.pathname.startsWith(`${BASE}/unit-types`)) return undefined;
			if (method === "GET") return json(current);
			const write = {
				method,
				path: url.pathname.slice(BASE.length),
				body: init?.body ? (JSON.parse(String(init.body)) as unknown) : null,
			};
			writes.push(write);
			return answer?.(write);
		},
		configurationSectionsApi(OBRA.id, emptyStructure, list),
	);
	return {
		handler,
		writes,
		replace(next: UnitTypeList) {
			current = next;
		},
	};
}

async function openConfiguration(handler: ApiHandler) {
	const stubbed = stubApi(signedIn, { api: handler });
	renderAt(CONFIG_PATH);
	await screen.findByRole("heading", { level: 3, name: "Tipologias" });
	await screen.findByText("Tipologia A");
	return stubbed;
}

const card = () => within(screen.getByRole("region", { name: "Tipologias" }));

async function chooseFromMenu(typeName: string, action: string) {
	await userEvent.click(
		await screen.findByRole("button", { name: `Ações da ${typeName}` }),
	);
	await userEvent.click(await screen.findByRole("menuitem", { name: action }));
}

function editedRooms(write: Write) {
	return (write.body as { rooms: { id: string; name: string }[] }).rooms;
}

afterEach(() => {
	vi.unstubAllGlobals();
	toast.dismiss();
});

describe("Tipologias on the configuration (C1)", () => {
	test("lists each tipologia with its rooms and units, and the way to add one", async () => {
		const { handler } = unitTypesApi();
		await openConfiguration(handler);

		expect(
			card().getByText(
				"Cada unidade acompanha a sua tipologia; o que for mudado numa unidade continua só nela.",
			),
		).toBeInTheDocument();
		expect(card().getByText("7 cômodos · 44 unidades")).toBeInTheDocument();
		expect(card().getByText("2 cômodos · 1 unidade")).toBeInTheDocument();
		expect(card().getByText("1 cômodo · 0 unidades")).toBeInTheDocument();
		expect(
			card().getByRole("button", { name: "Nova tipologia" }),
		).toBeInTheDocument();
	});

	test("explains where tipologias come from when there are none", async () => {
		const { handler } = unitTypesApi({ list: { unitTypes: [] } });
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		expect(
			await screen.findByText(
				"Nenhuma tipologia. Elas nascem no assistente, junto com a estrutura, ou aqui.",
			),
		).toBeInTheDocument();
		expect(
			card().getByRole("button", { name: "Nova tipologia" }),
		).toBeInTheDocument();
	});

	test("offers the menu, and disables the exclusion while units follow the tipologia", async () => {
		const { handler } = unitTypesApi();
		await openConfiguration(handler);

		await userEvent.click(
			screen.getByRole("button", { name: "Ações da Tipologia A" }),
		);

		expect(
			await screen.findByRole("menuitem", { name: "Editar cômodos" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("menuitem", { name: "Renomear" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("menuitem", { name: "Excluir (só sem unidades)" }),
		).toHaveAttribute("aria-disabled", "true");
	});

	test("lets the assistant edit tipologias too", async () => {
		const { handler } = unitTypesApi({
			summary: { ...OBRA, role: "assistant" },
		});
		await openConfiguration(handler);

		expect(
			card().getByRole("button", { name: "Ações da Tipologia A" }),
		).toBeInTheDocument();
	});

	test("lists Tipologias in the side navigation", async () => {
		const { handler } = unitTypesApi();
		await openConfiguration(handler);

		const nav = screen.getByRole("navigation", {
			name: "Seções da configuração",
		});

		expect(
			within(nav)
				.getAllByRole("link")
				.map((link) => link.textContent),
		).toEqual(["Dados da obra", "Status da obra", "Estrutura", "Tipologias"]);
	});

	test("keeps the frame while the tipologias load and offers another try when they fail", async () => {
		let failing = true;
		const { handler } = unitTypesApi();
		stubApi(signedIn, {
			api: (url, init) =>
				failing && url.pathname === `${BASE}/unit-types`
					? problem(500, "INTERNAL_ERROR")
					: handler(url, init),
		});
		renderAt(CONFIG_PATH);
		const retry = await screen.findByRole("button", {
			name: "Tentar de novo",
		});

		failing = false;
		await userEvent.click(retry);

		expect(await screen.findByText("Tipologia A")).toBeInTheDocument();
	});
});

describe("editing a tipologia in place (C2)", () => {
	test("opens the row with its rooms, the field and how many units change", async () => {
		const { handler } = unitTypesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia A", "Editar cômodos");

		const tags = within(
			screen.getByRole("button", { name: "Tirar Sala" }).closest("ul") ??
				document.body,
		);
		expect(tags.getAllByRole("listitem")).toHaveLength(7);
		expect(
			screen.getByRole("textbox", { name: "Novo cômodo" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Salvar muda as 44 unidades da Tipologia A. 1 unidade com alterações mantém o que foi mudado nela.",
			),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
	});

	test("adds a room and sends the whole ordered list with an id for the new one", async () => {
		const { handler, writes } = unitTypesApi({
			answer: () =>
				json({
					unitType: {
						...tipologiaA,
						rooms: [...tipologiaA.rooms, { id: "x", name: "Lavanderia" }],
					},
					updatedUnitCount: 44,
				}),
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");

		await userEvent.type(
			screen.getByRole("textbox", { name: "Novo cômodo" }),
			"  Lavanderia {Enter}",
		);
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => expect(writes).toHaveLength(1));
		const [write] = writes;
		expect(write).toMatchObject({
			method: "PATCH",
			path: `/unit-types/${tipologiaA.id}`,
		});
		const rooms = editedRooms(nth(writes, 0));
		expect(rooms.map(({ name }) => name)).toEqual([
			...tipologiaA.rooms.map(({ name }) => name),
			"Lavanderia",
		]);
		expect(rooms.slice(0, 7)).toEqual(tipologiaA.rooms);
		expect(nth(rooms, 7).id).toMatch(/^[0-9a-f-]{36}$/);
	});

	test("toasts how many units were updated, and closes the row", async () => {
		const { handler } = unitTypesApi({
			answer: () => json({ unitType: tipologiaA, updatedUnitCount: 44 }),
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");
		await userEvent.type(
			screen.getByRole("textbox", { name: "Novo cômodo" }),
			"Lavanderia{Enter}",
		);

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText("Tipologia A salva. 44 unidades atualizadas."),
		).toBeInTheDocument();
		await waitFor(() => {
			expect(
				screen.queryByRole("textbox", { name: "Novo cômodo" }),
			).not.toBeInTheDocument();
		});
	});

	test("takes a room out of the list that is sent", async () => {
		const { handler, writes } = unitTypesApi({
			answer: () => json({ unitType: tipologiaA, updatedUnitCount: 43 }),
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");

		await userEvent.click(
			screen.getByRole("button", { name: "Tirar Despensa" }),
		);
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => expect(writes).toHaveLength(1));
		expect(editedRooms(nth(writes, 0)).map(({ name }) => name)).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
			"Quarto",
			"Banheiro",
			"Suíte",
		]);
	});

	test("brings a room back with the id it had when the same name is added again", async () => {
		const { handler, writes } = unitTypesApi({
			answer: () => json({ unitType: tipologiaA, updatedUnitCount: 0 }),
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");

		await userEvent.click(
			screen.getByRole("button", { name: "Tirar Despensa" }),
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: "Novo cômodo" }),
			"despensa{Enter}",
		);
		await userEvent.click(screen.getByRole("button", { name: "Tirar Sacada" }));
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => expect(writes).toHaveLength(1));
		const rooms = editedRooms(nth(writes, 0));
		expect(nth(rooms, 5)).toEqual(nth(tipologiaA.rooms, 6));
	});

	test("refuses a room the tipologia already has", async () => {
		const { handler, writes } = unitTypesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");

		await userEvent.type(
			screen.getByRole("textbox", { name: "Novo cômodo" }),
			" sala {Enter}",
		);

		expect(
			await screen.findByText("Esta tipologia já tem esse cômodo."),
		).toBeInTheDocument();
		expect(writes).toEqual([]);
	});

	test("closes without sending anything when nothing changed", async () => {
		const { handler, writes } = unitTypesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => {
			expect(
				screen.queryByRole("textbox", { name: "Novo cômodo" }),
			).not.toBeInTheDocument();
		});
		expect(writes).toEqual([]);
	});

	test("drops the draft on Cancelar", async () => {
		const { handler, writes } = unitTypesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");
		await userEvent.click(screen.getByRole("button", { name: "Tirar Sala" }));

		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		await chooseFromMenu("Tipologia A", "Editar cômodos");

		expect(
			screen.getByRole("button", { name: "Tirar Sala" }),
		).toBeInTheDocument();
		expect(writes).toEqual([]);
	});

	test("keeps the draft and says so when saving fails", async () => {
		const { handler } = unitTypesApi({
			answer: () => problem(500, "INTERNAL_ERROR"),
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");
		await userEvent.click(screen.getByRole("button", { name: "Tirar Sala" }));

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText(
				"Não foi possível salvar a tipologia. Confira sua conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Tirar Sala" }),
		).not.toBeInTheDocument();
	});

	test("names the rooms a unit has that the tipologia cannot take over", async () => {
		const { handler } = unitTypesApi({
			answer: () =>
				problem(409, ROOM_NAME_TAKEN, { names: ["Estar", "Varanda"] }),
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");
		await userEvent.type(
			screen.getByRole("textbox", { name: "Novo cômodo" }),
			"Estar{Enter}",
		);

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText(
				"A tipologia não pode ter os cômodos Estar, Varanda: uma unidade já tem cômodos com esses nomes. Renomeie os cômodos na unidade e tente de novo.",
			),
		).toBeInTheDocument();
	});

	test("says only that nobody follows a tipologia without units", async () => {
		const { handler } = unitTypesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia C", "Editar cômodos");

		expect(
			screen.getByText("Nenhuma unidade usa a Tipologia C ainda."),
		).toBeInTheDocument();
	});

	test("shows the tipologia in a row full width on the phone", async () => {
		setViewport("phone");
		const { handler } = unitTypesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia A", "Editar cômodos");

		expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
	});
});

describe("renaming a tipologia", () => {
	test("sends the trimmed name and closes the dialog", async () => {
		const { handler, writes } = unitTypesApi({
			answer: () =>
				json({
					unitType: { ...tipologiaB, name: "Tipologia Z" },
					updatedUnitCount: 0,
				}),
		});
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia B", "Renomear");
		const field = screen.getByRole("textbox", { name: "Nome" });
		expect(field).toHaveValue("Tipologia B");
		await userEvent.clear(field);
		await userEvent.type(field, "  Tipologia Z {Enter}");

		await waitFor(() => expect(writes).toHaveLength(1));
		expect(writes[0]).toEqual({
			method: "PATCH",
			path: `/unit-types/${tipologiaB.id}`,
			body: { name: "Tipologia Z" },
		});
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});

	test("says the name is taken, with the dialog still open", async () => {
		const { handler } = unitTypesApi({
			answer: () =>
				problem(409, UNIT_TYPE_NAME_TAKEN, { names: ["Tipologia A"] }),
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia B", "Renomear");
		const field = screen.getByRole("textbox", { name: "Nome" });
		await userEvent.clear(field);

		await userEvent.type(field, "tipologia a{Enter}");

		expect(
			await screen.findByText("Já existe a tipologia tipologia a nesta obra."),
		).toBeInTheDocument();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	test("asks for a name before sending", async () => {
		const { handler, writes } = unitTypesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia B", "Renomear");
		await userEvent.clear(screen.getByRole("textbox", { name: "Nome" }));

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText("Informe o nome da tipologia."),
		).toBeInTheDocument();
		expect(writes).toEqual([]);
	});
});

describe("creating a tipologia", () => {
	test("creates it empty with an id of the client's and opens its rooms to fill", async () => {
		const created: UnitType = unitTypeOf("Tipologia D", []);
		const api = unitTypesApi({
			answer: () => {
				api.replace({
					unitTypes: [tipologiaA, tipologiaB, tipologiaC, created],
				});
				return json(created, 201);
			},
		});
		await openConfiguration(api.handler);

		await userEvent.click(
			card().getByRole("button", { name: "Nova tipologia" }),
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: "Nome" }),
			" Tipologia D {Enter}",
		);

		await waitFor(() => expect(api.writes).toHaveLength(1));
		expect(api.writes[0]).toMatchObject({
			method: "POST",
			path: "/unit-types",
			body: { name: "Tipologia D", rooms: [] },
		});
		expect((nth(api.writes, 0).body as { id: string }).id).toMatch(
			/^[0-9a-f-]{36}$/,
		);
		expect(
			await screen.findByRole("textbox", { name: "Novo cômodo" }),
		).toBeInTheDocument();
	});

	test("says the name is taken and keeps the dialog", async () => {
		const { handler } = unitTypesApi({
			answer: () =>
				problem(409, UNIT_TYPE_NAME_TAKEN, { names: ["Tipologia A"] }),
		});
		await openConfiguration(handler);
		await userEvent.click(
			card().getByRole("button", { name: "Nova tipologia" }),
		);

		await userEvent.type(
			screen.getByRole("textbox", { name: "Nome" }),
			"Tipologia A{Enter}",
		);

		expect(
			await screen.findByText("Já existe a tipologia Tipologia A nesta obra."),
		).toBeInTheDocument();
	});
});

describe("deleting a tipologia", () => {
	test("deletes one without units and toasts it", async () => {
		const { handler, writes } = unitTypesApi({
			answer: () => json({ unitTypes: [tipologiaA, tipologiaB] }),
		});
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia C", "Excluir tipologia");

		expect(
			await screen.findByText("Tipologia C excluída."),
		).toBeInTheDocument();
		expect(writes).toEqual([
			{ method: "DELETE", path: `/unit-types/${tipologiaC.id}`, body: null },
		]);
	});

	test("says units began to follow it when the server refuses", async () => {
		const { handler } = unitTypesApi({
			answer: () => problem(409, UNIT_TYPE_IN_USE),
		});
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia C", "Excluir tipologia");

		expect(
			await screen.findByText(
				"Não foi possível excluir a Tipologia C: unidades passaram a usá-la.",
			),
		).toBeInTheDocument();
	});

	test("toasts a failure and keeps the row", async () => {
		const { handler } = unitTypesApi({
			answer: () => problem(500, "INTERNAL_ERROR"),
		});
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia C", "Excluir tipologia");

		expect(
			await screen.findByText(
				"Não foi possível excluir a Tipologia C. Confira sua conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(card().getByText("Tipologia C")).toBeInTheDocument();
	});
});

describe("Tipologias of a delivered project (C6)", () => {
	const delivered: ProjectSummary = {
		...project(7, "manager", "delivered"),
		name: "Casa Moinhos",
	};

	test("lists them to read, with nothing to change and the reason why", async () => {
		const { handler } = unitTypesApi({ summary: delivered });
		await openConfiguration(handler);

		expect(card().getByText("7 cômodos · 44 unidades")).toBeInTheDocument();
		expect(card().queryByRole("button")).not.toBeInTheDocument();
		expect(card().getByText(LOCKED)).toBeInTheDocument();
	});

	test("reloads the project as closed when a save finds it delivered", async () => {
		let closed = false;
		const open = unitTypesApi({
			answer: () => {
				closed = true;
				return problem(409, PROJECT_DELIVERED);
			},
		});
		const closedApi = unitTypesApi({ summary: delivered });
		stubApi(signedIn, {
			api: (url, init) =>
				(closed ? closedApi.handler : open.handler)(url, init),
		});
		renderAt(CONFIG_PATH);
		await screen.findByText("Tipologia A");
		await chooseFromMenu("Tipologia A", "Editar cômodos");
		await userEvent.click(screen.getByRole("button", { name: "Tirar Sala" }));

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => {
			expect(
				within(screen.getByRole("region", { name: "Tipologias" })).getByText(
					LOCKED,
				),
			).toBeInTheDocument();
		});
	});
});
