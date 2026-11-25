import {
	PROJECT_DELIVERED,
	type ProjectAccessRole,
	type ProjectSummary,
	ROOM_NAME_TAKEN,
	TYPOLOGY_IN_USE,
	TYPOLOGY_NAME_TAKEN,
	type Typology,
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
	type TypologyWrite,
	typologyOf,
	typologyServer,
} from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const OBRA: ProjectSummary = { ...project(7), name: "Casa Moinhos" };
const CONFIG_PATH = `/projects/${OBRA.id}/configuration`;
const LOCKED =
	"A obra foi entregue: as tipologias não podem mais ser alteradas.";

const tipologiaA = typologyOf(
	"Tipologia A",
	["Sala", "Cozinha", "Sacada", "Quarto", "Banheiro", "Suíte", "Despensa"],
	{ locations: 44, changed: 1 },
);
const hallPadrao = typologyOf(
	"Hall padrão",
	["Circulação", "Escada", "Elevadores"],
	{ locationType: "common_area", locations: 16 },
);
const tipologiaB = typologyOf("Tipologia B", ["Sala", "Quarto", "Banheiro"], {
	locations: 18,
});
const corredor = typologyOf("Corredor", ["Circulação"], {
	locationType: "common_area",
});
const cobertura = typologyOf("Cobertura", []);
const hallSocial = typologyOf("Hall social", ["Recepção"], {
	locationType: "common_area",
	locations: 1,
});
const duplex = typologyOf("Duplex", ["Sala"], { locations: 1 });
const garagem = typologyOf("Garagem", ["Vagas"], {
	locationType: "common_area",
	locations: 2,
});

const EIGHT = [
	tipologiaA,
	hallPadrao,
	tipologiaB,
	corredor,
	cobertura,
	hallSocial,
	duplex,
	garagem,
];
const SIX = [tipologiaA, hallPadrao, tipologiaB, corredor, cobertura, duplex];

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Error", status, code, ...extra },
		status,
	);
}

function deferred() {
	let resolve: (response: Response) => void = () => {};
	const promise = new Promise<Response>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

function typologiesApi({
	summary = OBRA,
	typologies = EIGHT,
	answer,
}: {
	summary?: ProjectSummary;
	typologies?: Typology[];
	answer?: (
		write: TypologyWrite,
		attempt: number,
	) => Promise<Response> | undefined;
} = {}) {
	const server = typologyServer(OBRA.id, typologies, answer);
	const handler: ApiHandler = combine(
		(url) =>
			url.pathname === `/api/projects/${OBRA.id}` ? json(summary) : undefined,
		server.handler,
		configurationSectionsApi(OBRA.id, emptyStructure),
	);
	return { handler, writes: server.writes, server };
}

function listGoesOffline(api: ReturnType<typeof typologiesApi>) {
	const state = { offline: false };
	const handler = combine(
		(url, init) =>
			state.offline &&
			(init?.method ?? "GET") === "GET" &&
			url.pathname === `/api/projects/${OBRA.id}/typologies`
				? problem(500, "INTERNAL_ERROR")
				: undefined,
		api.handler,
	);
	return { handler, state };
}

async function openConfiguration(handler: ApiHandler, first = "Tipologia A") {
	const stubbed = stubApi(signedIn, { api: handler });
	renderAt(CONFIG_PATH);
	await screen.findByRole("heading", { level: 3, name: "Tipologias" });
	await card().findByText(first);
	return stubbed;
}

const card = () => within(screen.getByRole("region", { name: "Tipologias" }));
const group = (name: "Unidades" | "Áreas comuns") =>
	within(card().getByRole("region", { name }));
const rowsOf = (name: "Unidades" | "Áreas comuns") =>
	group(name)
		.queryAllByRole("button", { expanded: false })
		.filter((button) => !button.hasAttribute("aria-haspopup"))
		.map((button) => button.firstElementChild?.textContent);
const roomsUnder = (name: string) =>
	within(
		card()
			.getByRole("button", { name: new RegExp(`^${name}`), expanded: true })
			.closest("li") ?? document.body,
	)
		.getAllByRole("listitem")
		.map((item) => item.textContent);
const row = (name: string) =>
	card().getByRole("button", { name: new RegExp(`^${name}`), expanded: false });
const createButton = (name: string) => card().getByRole("button", { name });
const field = () => screen.getByRole("combobox", { name: /^Novo cômodo da / });
const removeButtons = () =>
	screen.queryAllByRole("button", { name: /^Tirar / });

async function chooseFromMenu(typeName: string, action: string) {
	await userEvent.click(
		await screen.findByRole("button", { name: `Ações da ${typeName}` }),
	);
	await userEvent.click(await screen.findByRole("menuitem", { name: action }));
}

async function addRoom(name: string) {
	await userEvent.type(field(), `${name}{Enter}`);
}

function sentRooms(write: TypologyWrite) {
	return (write.body as { rooms: { id: string; name: string }[] }).rooms;
}

afterEach(() => {
	vi.unstubAllGlobals();
	toast.dismiss();
});

describe("Tipologias in two groups (C1)", () => {
	test("lists unit and common-area tipologias apart, each group with its total and in the order they were created", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);

		expect(
			card().getByText(
				"Cada unidade e cada área comum acompanha a sua tipologia. O que for mudado num local continua só nele.",
			),
		).toBeInTheDocument();
		expect(group("Unidades").getByText("4 tipologias")).toBeInTheDocument();
		expect(group("Áreas comuns").getByText("4 tipologias")).toBeInTheDocument();
		expect(rowsOf("Unidades")).toEqual([
			"Tipologia A",
			"Tipologia B",
			"Cobertura",
			"Duplex",
		]);
		expect(rowsOf("Áreas comuns")).toEqual([
			"Hall padrão",
			"Corredor",
			"Hall social",
			"Garagem",
		]);
	});

	test("counts rooms and units or common areas, and marks only the unused ones Sem uso", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);

		expect(
			group("Unidades").getByText("7 cômodos · 44 unidades"),
		).toBeInTheDocument();
		expect(
			group("Unidades").getByText("1 cômodo · 1 unidade"),
		).toBeInTheDocument();
		expect(
			group("Áreas comuns").getByText("3 cômodos · 16 áreas comuns"),
		).toBeInTheDocument();
		expect(
			group("Áreas comuns").getByText("1 cômodo · 1 área comum"),
		).toBeInTheDocument();
		expect(card().getAllByText("Sem uso")).toHaveLength(2);
		expect(within(row("Cobertura")).getByText("Sem uso")).toBeInTheDocument();
		expect(within(row("Corredor")).getByText("Sem uso")).toBeInTheDocument();
		expect(
			within(row("Corredor")).queryByText(/áreas comuns/),
		).not.toBeInTheDocument();
	});

	test("shows both groups empty and both ways to create on a project without tipologias (C8)", async () => {
		const { handler } = typologiesApi({ typologies: [] });
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		expect(
			await screen.findByText(
				"Nenhuma tipologia. Elas nascem no assistente, junto com a estrutura, ou aqui.",
			),
		).toBeInTheDocument();
		expect(group("Unidades").getByText("0 tipologias")).toBeInTheDocument();
		expect(group("Áreas comuns").getByText("0 tipologias")).toBeInTheDocument();
		expect(
			group("Unidades").getByText("Nenhuma tipologia de unidade."),
		).toBeInTheDocument();
		expect(
			group("Áreas comuns").getByText("Nenhuma tipologia de área comum."),
		).toBeInTheDocument();
		expect(
			group("Unidades").getByRole("button", { name: "Nova tipologia" }),
		).toBeInTheDocument();
		expect(
			group("Áreas comuns").getByRole("button", {
				name: "Nova tipologia de área comum",
			}),
		).toBeInTheDocument();
		expect(
			card().queryByRole("textbox", { name: "Buscar tipologia" }),
		).not.toBeInTheDocument();
	});

	test("says 1 tipologia in a group of one", async () => {
		const { handler } = typologiesApi({ typologies: [tipologiaA] });
		await openConfiguration(handler);

		expect(group("Unidades").getByText("1 tipologia")).toBeInTheDocument();
		expect(group("Áreas comuns").getByText("0 tipologias")).toBeInTheDocument();
	});

	test("offers Editar cômodos, Renomear and Excluir, disabled while the tipologia is in use", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);

		await userEvent.click(
			screen.getByRole("button", { name: "Ações da Tipologia A" }),
		);

		expect(
			(await screen.findAllByRole("menuitem")).map((item) => item.textContent),
		).toEqual(["Editar cômodos", "Copiar", "Renomear", "Excluir (só sem uso)"]);
		expect(
			screen.getByRole("menuitem", { name: "Excluir (só sem uso)" }),
		).toHaveAttribute("aria-disabled", "true");
		await userEvent.keyboard("{Escape}");

		await userEvent.click(
			screen.getByRole("button", { name: "Ações da Hall padrão" }),
		);
		expect(
			await screen.findByRole("menuitem", { name: "Excluir (só sem uso)" }),
		).toHaveAttribute("aria-disabled", "true");
		await userEvent.keyboard("{Escape}");

		await userEvent.click(
			screen.getByRole("button", { name: "Ações da Corredor" }),
		);
		expect(
			await screen.findByRole("menuitem", { name: "Excluir tipologia" }),
		).not.toHaveAttribute("aria-disabled");
	});

	test.each<ProjectAccessRole>(["admin", "manager", "assistant"])(
		"gives the %s the same menus and buttons",
		async (role) => {
			const { handler } = typologiesApi({ summary: { ...OBRA, role } });
			await openConfiguration(handler);

			expect(
				card()
					.getAllByRole("button", { name: /^Ações da / })
					.map((button) => button.getAttribute("aria-label")),
			).toEqual([
				"Ações da Tipologia A",
				"Ações da Tipologia B",
				"Ações da Cobertura",
				"Ações da Duplex",
				"Ações da Hall padrão",
				"Ações da Corredor",
				"Ações da Hall social",
				"Ações da Garagem",
			]);
			expect(createButton("Nova tipologia")).toBeInTheDocument();
			expect(createButton("Nova tipologia de área comum")).toBeInTheDocument();
			await chooseFromMenu("Tipologia B", "Editar cômodos");
			expect(field()).toBeInTheDocument();
		},
	);

	test("lists Tipologias in the side navigation", async () => {
		const { handler } = typologiesApi();
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
		const { handler } = typologiesApi();
		stubApi(signedIn, {
			api: (url, init) =>
				failing && url.pathname === `/api/projects/${OBRA.id}/typologies`
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

describe("opening a tipologia's rooms (C2)", () => {
	test("opens the rooms one per row on a tap, and keeps two rows open together", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);

		await userEvent.click(row("Tipologia B"));
		await userEvent.click(row("Hall padrão"));

		const openRows = card().getAllByRole("button", { expanded: true });
		expect(
			openRows.map((button) => button.firstElementChild?.textContent),
		).toEqual(["Tipologia B", "Hall padrão"]);
		expect(roomsUnder("Tipologia B")).toEqual(["Sala", "Quarto", "Banheiro"]);
		expect(roomsUnder("Hall padrão")).toEqual([
			"Circulação",
			"Escada",
			"Elevadores",
		]);
		expect(screen.queryByRole("button", { name: /^Tirar / })).toBeNull();
	});

	test("says Sem cômodo for a tipologia without rooms, and closes on a second tap", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);

		await userEvent.click(row("Cobertura"));
		expect(card().getByText("Sem cômodo.")).toBeInTheDocument();

		await userEvent.click(
			card().getByRole("button", { name: /^Cobertura/, expanded: true }),
		);
		expect(card().queryByText("Sem cômodo.")).not.toBeInTheDocument();
	});
});

describe("searching Tipologias (C5)", () => {
	test("offers the search with more than 6 tipologias and not with 6", async () => {
		const eight = typologiesApi();
		await openConfiguration(eight.handler);
		expect(
			card().getByRole("textbox", { name: "Buscar tipologia" }),
		).toHaveAttribute("placeholder", "Buscar tipologia");
	});

	test("hides the search with 6 tipologias", async () => {
		const six = typologiesApi({ typologies: SIX });
		await openConfiguration(six.handler);

		expect(
			card().queryByRole("textbox", { name: "Buscar tipologia" }),
		).not.toBeInTheDocument();
	});

	test.each(["hall", "HALL", "háll"])(
		"finds the two halls by %s, keeps the totals and hides the ways to create",
		async (typed) => {
			const { handler } = typologiesApi();
			await openConfiguration(handler);

			await userEvent.type(
				card().getByRole("textbox", { name: "Buscar tipologia" }),
				typed,
			);

			expect(rowsOf("Áreas comuns")).toEqual(["Hall padrão", "Hall social"]);
			expect(
				group("Unidades").getByText("Nenhuma tipologia com esse nome."),
			).toBeInTheDocument();
			expect(group("Unidades").getByText("4 tipologias")).toBeInTheDocument();
			expect(
				group("Áreas comuns").getByText("4 tipologias"),
			).toBeInTheDocument();
			expect(
				card().queryByRole("button", { name: "Nova tipologia" }),
			).not.toBeInTheDocument();
			expect(
				card().queryByRole("button", { name: "Nova tipologia de área comum" }),
			).not.toBeInTheDocument();
		},
	);

	test("brings everything back when the search is cleared", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);
		const search = card().getByRole("textbox", { name: "Buscar tipologia" });
		await userEvent.type(search, "dup");
		expect(card().queryByText("Tipologia A")).not.toBeInTheDocument();

		await userEvent.click(card().getByRole("button", { name: "Limpar busca" }));

		expect(search).toHaveValue("");
		expect(search).toHaveFocus();
		expect(card().getByText("Tipologia A")).toBeInTheDocument();
		expect(createButton("Nova tipologia")).toBeInTheDocument();
	});

	test("forgets the search when the list drops to 6 and comes back empty at 7", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);
		await userEvent.type(
			card().getByRole("textbox", { name: "Buscar tipologia" }),
			"co",
		);
		await chooseFromMenu("Cobertura", "Excluir tipologia");
		await screen.findByText("Cobertura excluída.");
		await chooseFromMenu("Corredor", "Excluir tipologia");
		await waitFor(() =>
			expect(
				card().queryByRole("textbox", { name: "Buscar tipologia" }),
			).not.toBeInTheDocument(),
		);

		await userEvent.click(createButton("Nova tipologia"));
		const dialog = await screen.findByRole("dialog", {
			name: "Nova tipologia",
		});
		await userEvent.type(within(dialog).getByLabelText("Nome"), "Tipologia E");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Criar" }),
		);

		expect(
			await card().findByRole("textbox", { name: "Buscar tipologia" }),
		).toHaveValue("");
		expect(card().getByText("Tipologia A")).toBeInTheDocument();
		expect(card().getByText("Hall social")).toBeInTheDocument();
	});
});

describe("creating a tipologia", () => {
	test("Nova tipologia creates a unit tipologia with an id of the client's and opens it to fill, focus on Novo cômodo", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);

		await userEvent.click(createButton("Nova tipologia"));
		const dialog = within(
			screen.getByRole("dialog", { name: "Nova tipologia" }),
		);
		expect(dialog.getByText("Ex.: Tipologia D, Garden.")).toBeInTheDocument();
		expect(
			dialog.getByText("Os cômodos entram depois, no cartão da tipologia."),
		).toBeInTheDocument();
		await userEvent.type(
			dialog.getByRole("textbox", { name: "Nome" }),
			" Tipologia D {Enter}",
		);

		await waitFor(() => expect(field()).toHaveFocus());
		expect(writes).toEqual([
			{
				method: "POST",
				path: "/typologies",
				body: {
					id: expect.stringMatching(/^[0-9a-f-]{36}$/),
					name: "Tipologia D",
					locationType: "unit",
					rooms: [],
				},
			},
		]);
		expect(group("Unidades").getByText("Tipologia D")).toBeInTheDocument();
		expect(group("Unidades").getByText("5 tipologias")).toBeInTheDocument();
	});

	test("Nova tipologia de área comum creates in Áreas comuns and opens the row to edit", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);

		await userEvent.click(createButton("Nova tipologia de área comum"));
		const dialog = within(
			screen.getByRole("dialog", { name: "Nova tipologia de área comum" }),
		);
		expect(
			dialog.getByText("Ex.: Hall, Corredor, Garagem."),
		).toBeInTheDocument();
		await userEvent.type(
			dialog.getByRole("textbox", { name: "Nome" }),
			"Depósito",
		);
		await userEvent.click(dialog.getByRole("button", { name: "Criar" }));

		await waitFor(() => expect(field()).toHaveFocus());
		expect(nth(writes, 0).body).toMatchObject({
			name: "Depósito",
			locationType: "common_area",
		});
		expect(group("Áreas comuns").getByText("Depósito")).toBeInTheDocument();
		expect(
			within(
				group("Áreas comuns").getByText("Depósito").closest("li") ??
					document.body,
			).getByRole("combobox", { name: /^Novo cômodo da / }),
		).toBeInTheDocument();
		expect(group("Unidades").queryByText("Depósito")).not.toBeInTheDocument();
		expect(group("Áreas comuns").getByText("5 tipologias")).toBeInTheDocument();
		expect(
			screen.getByText("Nenhuma área comum usa a Depósito ainda."),
		).toBeInTheDocument();
	});

	test("asks for a name and refuses one the project has, ignoring accents, before sending", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await userEvent.click(createButton("Nova tipologia de área comum"));

		await userEvent.click(screen.getByRole("button", { name: "Criar" }));
		expect(await screen.findByText("Informe o nome.")).toBeInTheDocument();

		await userEvent.type(
			screen.getByRole("textbox", { name: "Nome" }),
			"tipologia á{Enter}",
		);
		expect(
			await screen.findByText("Esse nome já existe nesta obra."),
		).toBeInTheDocument();
		expect(writes).toEqual([]);
	});

	test("says the name is taken when the server refuses it, and keeps the dialog", async () => {
		const { handler } = typologiesApi({
			answer: () =>
				problem(409, TYPOLOGY_NAME_TAKEN, { names: ["Tipologia E"] }),
		});
		await openConfiguration(handler);
		await userEvent.click(createButton("Nova tipologia"));

		await userEvent.type(
			screen.getByRole("textbox", { name: "Nome" }),
			"Tipologia E{Enter}",
		);

		expect(
			await screen.findByText("Esse nome já existe nesta obra."),
		).toBeInTheDocument();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	test.each(["Nova tipologia", "Nova tipologia de área comum"])(
		"returns focus to %s on Cancelar and on Esc",
		async (name) => {
			const { handler } = typologiesApi();
			await openConfiguration(handler);

			await userEvent.click(createButton(name));
			await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
			await waitFor(() => expect(createButton(name)).toHaveFocus());

			await userEvent.click(createButton(name));
			await userEvent.keyboard("{Escape}");
			await waitFor(() => expect(createButton(name)).toHaveFocus());
		},
	);
});

describe("copying a tipologia", () => {
	const copyDialog = (name = "Tipologia A") =>
		within(screen.getByRole("dialog", { name: `Copiar ${name}` }));
	const nameField = () =>
		screen.getByRole("textbox", { name: "Nome da cópia" });
	const copyList = (name = "Tipologia A") =>
		copyDialog(name)
			.getAllByRole("listitem")
			.map((item) => item.textContent);
	const typologyWrites = (writes: TypologyWrite[]) =>
		writes.filter(({ method }) => method === "POST");

	test.each<ProjectAccessRole>(["admin", "manager", "assistant"])(
		"offers the %s Copiar between Editar cômodos and Renomear",
		async (role) => {
			const { handler } = typologiesApi({ summary: { ...OBRA, role } });
			await openConfiguration(handler);

			await userEvent.click(
				screen.getByRole("button", { name: "Ações da Cobertura" }),
			);

			expect(
				(await screen.findAllByRole("menuitem")).map(
					(item) => item.textContent,
				),
			).toEqual(["Editar cômodos", "Copiar", "Renomear", "Excluir tipologia"]);
			expect(
				screen.getByRole("menuitem", { name: "Copiar" }),
			).not.toHaveAttribute("aria-disabled");
		},
	);

	test("opens with the next free name selected, what it takes and the note (C3)", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia A", "Copiar");

		const dialog = copyDialog();
		expect(nameField()).toHaveValue("Tipologia A (cópia)");
		await waitFor(() => expect(nameField()).toHaveFocus());
		expect(nameField()).toHaveProperty("selectionStart", 0);
		expect(nameField()).toHaveProperty(
			"selectionEnd",
			"Tipologia A (cópia)".length,
		);
		expect(
			dialog.getByText(
				"Único na obra, entre as tipologias de unidade e de área comum.",
			),
		).toBeInTheDocument();
		expect(dialog.getByText("Leva 7 cômodos")).toBeInTheDocument();
		expect(copyList()).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
			"Quarto",
			"Banheiro",
			"Suíte",
			"Despensa",
		]);
		expect(
			dialog.getByText(
				"Depois de copiar, as duas mudam separadas. As disciplinas ficam em cada local, não na tipologia.",
			),
		).toBeInTheDocument();
		expect(dialog.getByRole("button", { name: "Copiar" })).toBeEnabled();
		expect(dialog.getByRole("button", { name: "Cancelar" })).toBeEnabled();
		expect(writes).toEqual([]);
	});

	test("says Leva 1 cômodo for a tipologia of one", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Corredor", "Copiar");

		expect(
			copyDialog("Corredor").getByText("Leva 1 cômodo"),
		).toBeInTheDocument();
		expect(copyList("Corredor")).toEqual(["Circulação"]);
	});

	test("focuses the name with the text selected on the phone too", async () => {
		setViewport("phone");
		const { handler } = typologiesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia A", "Copiar");

		await waitFor(() => expect(nameField()).toHaveFocus());
		expect(nameField()).toHaveProperty("selectionStart", 0);
		expect(nameField()).toHaveProperty(
			"selectionEnd",
			"Tipologia A (cópia)".length,
		);
	});

	test("stacks the buttons on the phone with Copiar above Cancelar", async () => {
		setViewport("phone");
		const { handler } = typologiesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia A", "Copiar");

		const copy = copyDialog().getByRole("button", { name: "Copiar" });
		const cancel = copyDialog().getByRole("button", { name: "Cancelar" });
		expect(copy.parentElement).toBe(cancel.parentElement);
		expect(
			copy.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	test("creates the copy with new ids and the rooms shown, at the end of the group, open and unused, and leaves the original alone", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Copiar");

		await userEvent.click(copyDialog().getByRole("button", { name: "Copiar" }));

		expect(
			await screen.findByText("Tipologia A (cópia) criada com 7 cômodos."),
		).toBeInTheDocument();
		const [sent] = typologyWrites(writes);
		expect(sent).toEqual({
			method: "POST",
			path: "/typologies",
			body: {
				id: expect.stringMatching(/^[0-9a-f-]{36}$/),
				name: "Tipologia A (cópia)",
				locationType: "unit",
				rooms: [
					"Sala",
					"Cozinha",
					"Sacada",
					"Quarto",
					"Banheiro",
					"Suíte",
					"Despensa",
				].map((name) => ({
					id: expect.stringMatching(/^[0-9a-f-]{36}$/),
					name,
				})),
			},
		});
		const body = sent?.body as {
			id: string;
			rooms: { id: string }[];
		};
		const original = new Set([
			tipologiaA.id,
			...tipologiaA.rooms.map(({ id }) => id),
		]);
		expect(
			[body.id, ...body.rooms.map(({ id }) => id)].filter((id) =>
				original.has(id),
			),
		).toEqual([]);
		expect(new Set(body.rooms.map(({ id }) => id)).size).toBe(7);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(rowsOf("Unidades")).toEqual([
			"Tipologia A",
			"Tipologia B",
			"Cobertura",
			"Duplex",
		]);
		const created = card().getByRole("button", {
			name: /^Tipologia A \(cópia\)/,
			expanded: true,
		});
		expect(within(created).getByText("7 cômodos ·")).toBeInTheDocument();
		expect(within(created).getByText("Sem uso")).toBeInTheDocument();
		expect(roomsUnder("Tipologia A \\(cópia\\)")).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
			"Quarto",
			"Banheiro",
			"Suíte",
			"Despensa",
		]);
		expect(
			group("Unidades")
				.getAllByRole("button", { expanded: true })
				.map((button) => button.firstElementChild?.textContent),
		).toEqual(["Tipologia A (cópia)"]);
		expect(group("Unidades").getByText("5 tipologias")).toBeInTheDocument();
		expect(
			group("Unidades").getByText("7 cômodos · 44 unidades"),
		).toBeInTheDocument();
		expect(
			card().queryByRole("combobox", { name: /^Novo cômodo/ }),
		).not.toBeInTheDocument();
		await waitFor(() => expect(created).toHaveFocus());
	});

	test("lands a copy of a common-area tipologia in Áreas comuns", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Hall padrão", "Copiar");

		await userEvent.click(
			copyDialog("Hall padrão").getByRole("button", { name: "Copiar" }),
		);

		expect(
			await screen.findByText("Hall padrão (cópia) criada com 3 cômodos."),
		).toBeInTheDocument();
		expect(nth(typologyWrites(writes), 0).body).toMatchObject({
			name: "Hall padrão (cópia)",
			locationType: "common_area",
		});
		expect(
			group("Áreas comuns").getByText("Hall padrão (cópia)"),
		).toBeInTheDocument();
		expect(
			group("Unidades").queryByText("Hall padrão (cópia)"),
		).not.toBeInTheDocument();
		expect(group("Áreas comuns").getByText("5 tipologias")).toBeInTheDocument();
	});

	test("says com 1 cômodo for a copy of one", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Corredor", "Copiar");

		await userEvent.click(
			copyDialog("Corredor").getByRole("button", { name: "Copiar" }),
		);

		expect(
			await screen.findByText("Corredor (cópia) criada com 1 cômodo."),
		).toBeInTheDocument();
	});

	test("suggests (cópia 2) when the first copy exists and counts the names of both catalogs", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Copiar");
		await userEvent.click(copyDialog().getByRole("button", { name: "Copiar" }));
		await screen.findByText("Tipologia A (cópia) criada com 7 cômodos.");

		await chooseFromMenu("Tipologia A", "Copiar");

		expect(nameField()).toHaveValue("Tipologia A (cópia 2)");
	});

	test("sends the name trimmed", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Copiar");

		await userEvent.clear(nameField());
		await userEvent.type(nameField(), "  Tipologia Z  {Enter}");

		await screen.findByText("Tipologia Z criada com 7 cômodos.");
		expect(nth(typologyWrites(writes), 0).body).toMatchObject({
			name: "Tipologia Z",
		});
	});

	test.each([
		["", "Informe o nome."],
		["  ", "Informe o nome."],
		["tipologia  b", "Esse nome já existe nesta obra."],
		["Hall  Padrão", "Esse nome já existe nesta obra."],
		["TIPOLOGIA Á", "Esse nome já existe nesta obra."],
	])(
		"refuses %j before sending: %s, and clears it on typing (C3b)",
		async (typed, message) => {
			const { handler, writes } = typologiesApi();
			await openConfiguration(handler);
			await chooseFromMenu("Tipologia A", "Copiar");
			await userEvent.clear(nameField());
			if (typed !== "") await userEvent.type(nameField(), typed);

			await userEvent.click(
				copyDialog().getByRole("button", { name: "Copiar" }),
			);

			expect(await copyDialog().findByText(message)).toBeInTheDocument();
			expect(
				copyDialog().queryByText(
					"Único na obra, entre as tipologias de unidade e de área comum.",
				),
			).not.toBeInTheDocument();
			expect(nameField()).toHaveAttribute("aria-invalid", "true");
			expect(writes).toEqual([]);

			await userEvent.type(nameField(), "x");

			expect(copyDialog().queryByText(message)).not.toBeInTheDocument();
			expect(
				copyDialog().getByText(
					"Único na obra, entre as tipologias de unidade e de área comum.",
				),
			).toBeInTheDocument();
		},
	);

	test("shows the same error when the server finds the name taken, keeping the dialog", async () => {
		const { handler } = typologiesApi({
			answer: () =>
				problem(409, TYPOLOGY_NAME_TAKEN, { names: ["Tipologia A (cópia)"] }),
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Copiar");

		await userEvent.click(copyDialog().getByRole("button", { name: "Copiar" }));

		expect(
			await copyDialog().findByText("Esse nome já existe nesta obra."),
		).toBeInTheDocument();
		expect(nameField()).toHaveValue("Tipologia A (cópia)");
		expect(copyDialog().getByRole("button", { name: "Copiar" })).toBeEnabled();
	});

	test("locks both buttons and the field while sending", async () => {
		const pending = deferred();
		const { handler } = typologiesApi({ answer: () => pending.promise });
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Copiar");

		await userEvent.click(copyDialog().getByRole("button", { name: "Copiar" }));

		const sending = await copyDialog().findByRole("button", {
			name: "Copiando…",
		});
		expect(sending).toBeDisabled();
		expect(
			copyDialog().getByRole("button", { name: "Cancelar" }),
		).toBeDisabled();
		expect(nameField()).toBeDisabled();
		pending.resolve(
			new Response(
				JSON.stringify({
					...tipologiaA,
					id: "0190a000-0000-7000-8000-0000000000a1",
				}),
				{ status: 201 },
			),
		);
		await screen.findByText("Tipologia A criada com 7 cômodos.");
	});

	test("keeps the name on a network failure and sends the same ids again, creating one copy", async () => {
		const { handler, writes } = typologiesApi({
			answer: (_write, attempt) =>
				attempt === 1
					? Promise.reject(new TypeError("Failed to fetch"))
					: undefined,
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Copiar");
		await userEvent.clear(nameField());
		await userEvent.type(nameField(), "Tipologia Z");

		await userEvent.click(copyDialog().getByRole("button", { name: "Copiar" }));

		const alert = await screen.findByRole("alert");
		expect(
			within(alert).getByText("Não foi possível copiar"),
		).toBeInTheDocument();
		expect(
			within(alert).getByText(
				"A cópia não foi criada. Confira a conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(nameField()).toHaveValue("Tipologia Z");
		expect(copyDialog().getByRole("button", { name: "Copiar" })).toBeEnabled();

		await userEvent.click(copyDialog().getByRole("button", { name: "Copiar" }));

		await screen.findByText("Tipologia Z criada com 7 cômodos.");
		expect(writes).toHaveLength(2);
		expect(nth(writes, 1)).toEqual(nth(writes, 0));
		expect(group("Unidades").getByText("5 tipologias")).toBeInTheDocument();
	});

	test("sends the same id again when the copy was created but its answer was lost, creating one copy", async () => {
		const server = typologiesApi();
		let answerLost = false;
		const handler: ApiHandler = (url, init) => {
			const reply = server.handler(url, init);
			if (init?.method !== "POST" || answerLost) return reply;
			answerLost = true;
			return Promise.reject(new TypeError("Failed to fetch"));
		};
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Copiar");
		await userEvent.clear(nameField());
		await userEvent.type(nameField(), "Tipologia Z");

		await userEvent.click(copyDialog().getByRole("button", { name: "Copiar" }));

		await screen.findByText("Não foi possível copiar");
		await screen.findByText("5 tipologias");

		await userEvent.click(copyDialog().getByRole("button", { name: "Copiar" }));

		await screen.findByText("Tipologia Z criada com 7 cômodos.");
		expect(server.writes).toHaveLength(2);
		expect(nth(server.writes, 1)).toEqual(nth(server.writes, 0));
		expect(group("Unidades").getByText("5 tipologias")).toBeInTheDocument();
	});

	test("creates what the dialog showed when the original changed meanwhile", async () => {
		const shorter = {
			...tipologiaA,
			rooms: tipologiaA.rooms.filter(({ name }) => name !== "Sacada"),
		};
		const { handler, writes } = typologiesApi();
		let changed = false;
		const { fetchMock } = await openConfiguration((url, init) =>
			changed &&
			url.pathname === `/api/projects/${OBRA.id}/typologies` &&
			(init?.method ?? "GET") === "GET"
				? json({
						typologies: EIGHT.map((each) =>
							each.id === tipologiaA.id ? shorter : each,
						),
					})
				: handler(url, init),
		);
		await chooseFromMenu("Tipologia A", "Copiar");
		const lists = () =>
			fetchMock.mock.calls.filter(
				([input, init]) =>
					String(input).endsWith("/typologies") &&
					(init?.method ?? "GET") === "GET",
			).length;
		const before = lists();

		changed = true;
		window.dispatchEvent(new Event("visibilitychange"));
		await waitFor(() => expect(lists()).toBeGreaterThan(before));
		expect(copyDialog().getByText("Leva 7 cômodos")).toBeInTheDocument();
		await userEvent.click(copyDialog().getByRole("button", { name: "Copiar" }));

		await screen.findByText("Tipologia A (cópia) criada com 7 cômodos.");
		expect(
			sentRooms(nth(typologyWrites(writes), 0)).map(({ name }) => name),
		).toContain("Sacada");
		expect(
			group("Unidades").getByText("6 cômodos · 44 unidades"),
		).toBeInTheDocument();
	});

	test.each([
		[
			"Cancelar",
			() => userEvent.click(screen.getByRole("button", { name: "Cancelar" })),
		],
		["Esc", () => userEvent.keyboard("{Escape}")],
		[
			"a tap outside",
			() =>
				userEvent.click(
					document.body.querySelector("[data-slot='dialog-overlay']") ??
						document.body,
				),
		],
	])(
		"creates nothing on %s and returns focus to the menu of the tipologia",
		async (_how, leave) => {
			const { handler, writes } = typologiesApi();
			await openConfiguration(handler);
			await chooseFromMenu("Tipologia A", "Copiar");

			await leave();

			await waitFor(() =>
				expect(
					screen.queryByRole("dialog", { name: "Copiar Tipologia A" }),
				).not.toBeInTheDocument(),
			);
			expect(writes).toEqual([]);
			await waitFor(() =>
				expect(
					screen.getByRole("button", { name: "Ações da Tipologia A" }),
				).toHaveFocus(),
			);
			expect(group("Unidades").getByText("4 tipologias")).toBeInTheDocument();
			expect(
				group("Unidades").getByText("7 cômodos · 44 unidades"),
			).toBeInTheDocument();
		},
	);

	test("starts a new dialog with a fresh suggestion and fresh ids after a cancel", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Copiar");
		await userEvent.clear(nameField());
		await userEvent.type(nameField(), "Rascunho");
		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);

		await chooseFromMenu("Tipologia A", "Copiar");

		expect(nameField()).toHaveValue("Tipologia A (cópia)");
		await userEvent.click(copyDialog().getByRole("button", { name: "Copiar" }));
		await screen.findByText("Tipologia A (cópia) criada com 7 cômodos.");
		expect(typologyWrites(writes)).toHaveLength(1);
	});

	test("copies while another tipologia is in edit, which stays open", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia B", "Editar cômodos");
		await addRoom("Lavabo");

		await userEvent.click(
			screen.getByRole("button", { name: "Ações da Tipologia A" }),
		);
		expect(
			await screen.findByRole("menuitem", { name: "Copiar" }),
		).not.toHaveAttribute("aria-disabled");
		await userEvent.click(screen.getByRole("menuitem", { name: "Copiar" }));
		await userEvent.click(copyDialog().getByRole("button", { name: "Copiar" }));

		await screen.findByText("Tipologia A (cópia) criada com 7 cômodos.");
		expect(
			removeButtons().map((button) => button.getAttribute("aria-label")),
		).toEqual(["Tirar Sala", "Tirar Quarto", "Tirar Banheiro", "Tirar Lavabo"]);
		expect(
			screen.getAllByRole("combobox", { name: /^Novo cômodo/ }),
		).toHaveLength(1);
		expect(
			card().getByRole("button", {
				name: /^Tipologia A \(cópia\)/,
				expanded: true,
			}),
		).toBeInTheDocument();
		expect(writes.map(({ method }) => method)).toEqual(["POST"]);
	});

	test("shows the new row even when a search would have hidden it", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);
		await userEvent.type(
			card().getByRole("textbox", { name: "Buscar tipologia" }),
			"Tipologia A",
		);
		await chooseFromMenu("Tipologia A", "Copiar");
		await userEvent.clear(nameField());
		await userEvent.type(nameField(), "Garden{Enter}");

		await screen.findByText("Garden criada com 7 cômodos.");

		expect(
			card().getByRole("textbox", { name: "Buscar tipologia" }),
		).toHaveValue("");
		expect(group("Unidades").getByText("Garden")).toBeInTheDocument();
	});
});

describe("editing a tipologia in place (C4)", () => {
	test("lists the rooms one per row, each with Tirar, the field and how many units change", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia B", "Editar cômodos");

		expect(
			removeButtons().map((button) => button.getAttribute("aria-label")),
		).toEqual(["Tirar Sala", "Tirar Quarto", "Tirar Banheiro"]);
		expect(field()).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Adicionar" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Salvar muda as 18 unidades da Tipologia B. Um local com alterações mantém o que foi mudado nele.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText("Novo")).not.toBeInTheDocument();
	});

	test("marks Novo only on the rooms not saved yet", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia B", "Editar cômodos");

		await addRoom("Lavabo");

		const lavabo = screen.getByText("Lavabo").closest("li");
		expect(
			within(lavabo ?? document.body).getByText("Novo"),
		).toBeInTheDocument();
		expect(screen.getAllByText("Novo")).toHaveLength(1);
	});

	test("speaks of common areas, of a single unit and of an unused tipologia", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Hall padrão", "Editar cômodos");
		expect(
			screen.getByText(
				"Salvar muda as 16 áreas comuns da Hall padrão. Um local com alterações mantém o que foi mudado nele.",
			),
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

		await chooseFromMenu("Duplex", "Editar cômodos");
		expect(
			screen.getByText(
				"Salvar muda 1 unidade da Duplex. Um local com alterações mantém o que foi mudado nele.",
			),
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

		await chooseFromMenu("Cobertura", "Editar cômodos");
		expect(
			screen.getByText("Nenhuma unidade usa a Cobertura ainda."),
		).toBeInTheDocument();
		expect(screen.getByText("Sem cômodo.")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

		await chooseFromMenu("Corredor", "Editar cômodos");
		expect(
			screen.getByText("Nenhuma área comum usa a Corredor ainda."),
		).toBeInTheDocument();
	});

	test("sends the whole ordered list with an id for the new room, toasts how many units changed and returns focus to the menu", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia B", "Editar cômodos");

		await userEvent.type(field(), "  Lavabo {Enter}");
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText("Tipologia B salva. 18 unidades atualizadas."),
		).toBeInTheDocument();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Ações da Tipologia B" }),
			).toHaveFocus(),
		);
		expect(writes).toHaveLength(1);
		expect(nth(writes, 0)).toMatchObject({
			method: "PATCH",
			path: `/typologies/${tipologiaB.id}`,
		});
		const rooms = sentRooms(nth(writes, 0));
		expect(rooms.slice(0, 3)).toEqual(tipologiaB.rooms);
		expect(nth(rooms, 3)).toEqual({
			id: expect.stringMatching(/^[0-9a-f-]{36}$/),
			name: "Lavabo",
		});
		expect(
			screen.queryByRole("combobox", { name: /^Novo cômodo da / }),
		).toBeNull();
	});

	test("says 1 área comum atualizada for a common-area tipologia of one", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Hall social", "Editar cômodos");

		await addRoom("Escada");
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText("Hall social salva. 1 área comum atualizada."),
		).toBeInTheDocument();
	});

	test("takes a room out of the list that is sent", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");

		await userEvent.click(
			screen.getByRole("button", { name: "Tirar Despensa" }),
		);
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => expect(writes).toHaveLength(1));
		expect(sentRooms(nth(writes, 0)).map(({ name }) => name)).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
			"Quarto",
			"Banheiro",
			"Suíte",
		]);
	});

	test("brings a room back with the id it had when the same name is added again", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");

		await userEvent.click(
			screen.getByRole("button", { name: "Tirar Despensa" }),
		);
		await addRoom("despensa");
		await userEvent.click(screen.getByRole("button", { name: "Tirar Sacada" }));
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => expect(writes).toHaveLength(1));
		expect(nth(sentRooms(nth(writes, 0)), 5)).toEqual(nth(tipologiaA.rooms, 6));
	});

	test("refuses a room the tipologia already has, ignoring accents", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");

		await addRoom(" suite ");

		expect(
			await screen.findByText("Esse cômodo já está na tipologia."),
		).toBeInTheDocument();
		expect(writes).toEqual([]);
	});

	test("closes without sending anything when nothing changed", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => {
			expect(
				screen.queryByRole("combobox", { name: /^Novo cômodo da / }),
			).not.toBeInTheDocument();
		});
		expect(writes).toEqual([]);
	});

	test("drops the draft on Cancelar without asking, and returns focus to the menu", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");
		await userEvent.click(screen.getByRole("button", { name: "Tirar Sala" }));

		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Ações da Tipologia A" }),
			).toHaveFocus(),
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		await chooseFromMenu("Tipologia A", "Editar cômodos");
		expect(
			screen.getByRole("button", { name: "Tirar Sala" }),
		).toBeInTheDocument();
		expect(writes).toEqual([]);
	});

	test("names the rooms a unit has that the tipologia cannot take over", async () => {
		const { handler } = typologiesApi({
			answer: () =>
				problem(409, ROOM_NAME_TAKEN, { names: ["Estar", "Varanda"] }),
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia A", "Editar cômodos");
		await addRoom("Estar");

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		const alert = await screen.findByRole("alert");
		expect(
			within(alert).getByText("Não foi possível salvar"),
		).toBeInTheDocument();
		expect(
			within(alert).getByText(
				"A tipologia não pode ter os cômodos Estar, Varanda: uma unidade já tem cômodos com esses nomes. Renomeie os cômodos na unidade e tente de novo.",
			),
		).toBeInTheDocument();
	});

	test("lays Salvar and Cancelar side by side on the phone", async () => {
		setViewport("phone");
		const { handler } = typologiesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia A", "Editar cômodos");

		expect(screen.getByRole("button", { name: "Salvar" }).parentElement).toBe(
			screen.getByRole("button", { name: "Cancelar" }).parentElement,
		);
	});
});

describe("saving a tipologia (C6, C7)", () => {
	test("locks the whole editor while saving", async () => {
		const pending = deferred();
		const { handler } = typologiesApi({ answer: () => pending.promise });
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia B", "Editar cômodos");
		await addRoom("Lavabo");

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		const saving = await screen.findByRole("button", { name: "Salvando…" });
		expect(saving).toBeDisabled();
		expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
		for (const button of removeButtons()) expect(button).toBeDisabled();
		expect(field()).toBeDisabled();
		expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled();
		pending.resolve(
			new Response(
				JSON.stringify({ typology: tipologiaB, updatedLocationCount: 18 }),
			),
		);
		expect(
			await screen.findByText("Tipologia B salva. 18 unidades atualizadas."),
		).toBeInTheDocument();
	});

	test("keeps the whole draft on a failure and sends the same list, with the same ids, on Tentar de novo", async () => {
		const { handler, writes } = typologiesApi({
			answer: (_write, attempt) =>
				attempt === 1 ? problem(500, "INTERNAL_ERROR") : undefined,
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia B", "Editar cômodos");
		await userEvent.click(screen.getByRole("button", { name: "Tirar Quarto" }));
		await addRoom("Lavabo");

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		const alert = await screen.findByRole("alert");
		expect(
			within(alert).getByText("Não foi possível salvar"),
		).toBeInTheDocument();
		expect(
			within(alert).getByText(
				"A Tipologia B não mudou. Confira a conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(
			removeButtons().map((button) => button.getAttribute("aria-label")),
		).toEqual(["Tirar Sala", "Tirar Banheiro", "Tirar Lavabo"]);
		const lavabo = screen.getByText("Lavabo").closest("li");
		expect(
			within(lavabo ?? document.body).getByText("Novo"),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();

		await userEvent.click(
			screen.getByRole("button", { name: "Tentar de novo" }),
		);

		expect(
			await screen.findByText("Tipologia B salva. 18 unidades atualizadas."),
		).toBeInTheDocument();
		expect(writes).toHaveLength(2);
		expect(nth(writes, 1)).toEqual(nth(writes, 0));
		expect(sentRooms(nth(writes, 1)).map(({ name }) => name)).toEqual([
			"Sala",
			"Banheiro",
			"Lavabo",
		]);
	});
});

describe("one tipologia in edit at a time", () => {
	test("turns off Editar cômodos of the others and both ways to create, keeping Renomear and Excluir", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia B", "Editar cômodos");
		await addRoom("Lavabo");

		await userEvent.click(
			screen.getByRole("button", { name: "Ações da Tipologia A" }),
		);
		expect(
			await screen.findByRole("menuitem", { name: "Editar cômodos" }),
		).toHaveAttribute("aria-disabled", "true");
		expect(
			screen.getByRole("menuitem", { name: "Renomear" }),
		).not.toHaveAttribute("aria-disabled");
		await userEvent.keyboard("{Escape}");
		expect(createButton("Nova tipologia")).toHaveAttribute(
			"aria-disabled",
			"true",
		);
		expect(createButton("Nova tipologia de área comum")).toHaveAttribute(
			"aria-disabled",
			"true",
		);
		await userEvent.click(createButton("Nova tipologia de área comum"));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

		await chooseFromMenu("Cobertura", "Excluir tipologia");
		expect(await screen.findByText("Cobertura excluída.")).toBeInTheDocument();
		await chooseFromMenu("Duplex", "Renomear");
		const name = screen.getByRole("textbox", { name: "Nome" });
		await userEvent.clear(name);
		await userEvent.type(name, "Duplex Garden{Enter}");
		expect(await card().findByText("Duplex Garden")).toBeInTheDocument();

		expect(
			screen.getAllByRole("combobox", { name: /^Novo cômodo da / }),
		).toHaveLength(1);
		expect(
			removeButtons().map((button) => button.getAttribute("aria-label")),
		).toEqual(["Tirar Sala", "Tirar Quarto", "Tirar Banheiro", "Tirar Lavabo"]);
		expect(writes.map(({ method }) => method)).toEqual(["DELETE", "PATCH"]);

		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(createButton("Nova tipologia")).not.toHaveAttribute("aria-disabled");
		expect(createButton("Nova tipologia de área comum")).not.toHaveAttribute(
			"aria-disabled",
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Ações da Tipologia A" }),
		);
		expect(
			await screen.findByRole("menuitem", { name: "Editar cômodos" }),
		).not.toHaveAttribute("aria-disabled");
	});

	test("keeps the tipologia in edit on screen while a search leaves it out", async () => {
		const { handler } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia B", "Editar cômodos");
		await addRoom("Lavabo");

		await userEvent.type(
			card().getByRole("textbox", { name: "Buscar tipologia" }),
			"hall",
		);

		expect(
			screen.getByRole("button", { name: "Tirar Lavabo" }),
		).toBeInTheDocument();
		expect(card().getByText("Hall padrão")).toBeInTheDocument();
	});
});

describe("renaming a tipologia", () => {
	test("sends the trimmed name and returns focus to the menu", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Tipologia B", "Renomear");
		const dialog = within(
			screen.getByRole("dialog", { name: "Renomear a tipologia" }),
		);
		expect(
			dialog.getByText("O nome novo vale em todos os locais da tipologia."),
		).toBeInTheDocument();
		const name = dialog.getByRole("textbox", { name: "Nome" });
		expect(name).toHaveValue("Tipologia B");
		await userEvent.clear(name);
		await userEvent.type(name, "  Tipologia Z {Enter}");

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Ações da Tipologia Z" }),
			).toHaveFocus(),
		);
		expect(writes).toEqual([
			{
				method: "PATCH",
				path: `/typologies/${tipologiaB.id}`,
				body: { version: 1, name: "Tipologia Z" },
			},
		]);
	});

	test("refuses a name the project has, before and after sending", async () => {
		const { handler } = typologiesApi({
			answer: () =>
				problem(409, TYPOLOGY_NAME_TAKEN, { names: ["Tipologia W"] }),
		});
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia B", "Renomear");
		const name = screen.getByRole("textbox", { name: "Nome" });

		await userEvent.clear(name);
		await userEvent.type(name, "corredor{Enter}");
		expect(
			await screen.findByText("Esse nome já existe nesta obra."),
		).toBeInTheDocument();

		await userEvent.clear(name);
		await userEvent.type(name, "Tipologia W{Enter}");
		expect(
			await screen.findByText("Esse nome já existe nesta obra."),
		).toBeInTheDocument();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	test("asks for a name before sending, and returns focus to the menu on Cancelar", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);
		await chooseFromMenu("Tipologia B", "Renomear");
		await userEvent.clear(screen.getByRole("textbox", { name: "Nome" }));

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
		expect(await screen.findByText("Informe o nome.")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Ações da Tipologia B" }),
			).toHaveFocus(),
		);
		expect(writes).toEqual([]);
	});
});

describe("deleting a tipologia", () => {
	test("deletes one without use at once and toasts it", async () => {
		const { handler, writes } = typologiesApi();
		await openConfiguration(handler);

		await chooseFromMenu("Cobertura", "Excluir tipologia");

		expect(await screen.findByText("Cobertura excluída.")).toBeInTheDocument();
		expect(writes).toEqual([
			{ method: "DELETE", path: `/typologies/${cobertura.id}`, body: null },
		]);
		await waitFor(() =>
			expect(group("Unidades").getByText("3 tipologias")).toBeInTheDocument(),
		);
	});

	test.each([
		[
			"Cobertura",
			"Não foi possível excluir a Cobertura: unidades passaram a usá-la.",
		],
		[
			"Corredor",
			"Não foi possível excluir a Corredor: áreas comuns passaram a usá-la.",
		],
	])(
		"says locations began to use %s when the server refuses",
		async (typeName, message) => {
			const { handler } = typologiesApi({
				answer: () => problem(409, TYPOLOGY_IN_USE),
			});
			await openConfiguration(handler);

			await chooseFromMenu(typeName, "Excluir tipologia");

			expect(await screen.findByText(message)).toBeInTheDocument();
		},
	);

	test("toasts a failure and keeps the row", async () => {
		const { handler } = typologiesApi({
			answer: () => problem(500, "INTERNAL_ERROR"),
		});
		await openConfiguration(handler);

		await chooseFromMenu("Cobertura", "Excluir tipologia");

		expect(
			await screen.findByText(
				"Não foi possível excluir a Cobertura. Confira sua conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(card().getByText("Cobertura")).toBeInTheDocument();
	});
});

describe("Tipologias of a delivered project (C9)", () => {
	const delivered: ProjectSummary = {
		...project(7, "manager", "delivered"),
		name: "Casa Moinhos",
	};

	test("reads, opens and searches them, with nothing to change and the lock line", async () => {
		const { handler } = typologiesApi({ summary: delivered });
		await openConfiguration(handler);

		expect(group("Unidades").getByText("4 tipologias")).toBeInTheDocument();
		expect(
			group("Unidades").getByText("7 cômodos · 44 unidades"),
		).toBeInTheDocument();
		expect(card().getAllByText("Sem uso")).toHaveLength(2);
		expect(card().getByText(LOCKED)).toBeInTheDocument();
		expect(card().queryByRole("button", { name: /^Ações da / })).toBeNull();
		expect(
			card().queryByRole("button", { name: /^Nova tipologia/ }),
		).toBeNull();

		await userEvent.click(row("Tipologia B"));
		expect(card().getByText("Banheiro")).toBeInTheDocument();
		await userEvent.type(
			card().getByRole("textbox", { name: "Buscar tipologia" }),
			"hall",
		);
		expect(card().queryByText("Tipologia A")).not.toBeInTheDocument();
		expect(card().getByText("Hall social")).toBeInTheDocument();
	});

	test("turns read-only when a save finds the project delivered", async () => {
		let closed = false;
		const open = typologiesApi({
			answer: () => {
				closed = true;
				return problem(409, PROJECT_DELIVERED);
			},
		});
		const closedApi = typologiesApi({ summary: delivered });
		await openConfiguration((url, init) =>
			(closed ? closedApi.handler : open.handler)(url, init),
		);
		await chooseFromMenu("Tipologia A", "Editar cômodos");
		await userEvent.click(screen.getByRole("button", { name: "Tirar Sala" }));

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await card().findByText(LOCKED)).toBeInTheDocument();
		expect(
			screen.queryByRole("combobox", { name: /^Novo cômodo da / }),
		).toBeNull();
		expect(card().queryByRole("button", { name: /^Ações da / })).toBeNull();
		expect(
			card().queryByRole("button", { name: /^Nova tipologia/ }),
		).toBeNull();
	});
});

const SUITE = { id: "0190b000-0000-7000-8000-00000000a002", name: "Suíte" };
const CHANGED =
	"Outra pessoa salvou enquanto você editava. Confira a lista atual antes de salvar de novo.";

const tags = () =>
	removeButtons().map((button) => button.getAttribute("aria-label"));

describe("a tipologia saved by someone else meanwhile", () => {
	async function brunoEditsRooms(
		options: Parameters<typeof typologiesApi>[0] = {},
	) {
		const api = typologiesApi(options);
		await openConfiguration(api.handler);
		await chooseFromMenu("Tipologia B", "Editar cômodos");
		return api;
	}

	async function brunoLosesLavabo() {
		const api = await brunoEditsRooms();
		api.server.saveElsewhere(tipologiaB.id, {
			rooms: [...tipologiaB.rooms, SUITE],
		});
		await userEvent.click(screen.getByRole("button", { name: "Tirar Quarto" }));
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
		await screen.findByText("A Tipologia B mudou");
		return api;
	}

	test("refuses the save, keeps the draft and warns without a failure alert", async () => {
		const { writes } = await brunoLosesLavabo();

		expect(writes).toHaveLength(1);
		expect(nth(writes, 0).body).toMatchObject({ version: 1 });
		expect(screen.getByText(CHANGED)).toBeInTheDocument();
		expect(tags()).toEqual(["Tirar Sala", "Tirar Banheiro"]);
		expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
		expect(screen.queryByText("Não foi possível salvar")).toBeNull();
		expect(
			screen.getByRole("button", { name: "Ver a lista atual" }),
		).toBeInTheDocument();
	});

	test("shows the list of the server on Ver a lista atual, and closes without sending on Salvar", async () => {
		const { writes } = await brunoLosesLavabo();

		await userEvent.click(
			screen.getByRole("button", { name: "Ver a lista atual" }),
		);

		expect(tags()).toEqual([
			"Tirar Sala",
			"Tirar Quarto",
			"Tirar Banheiro",
			"Tirar Suíte",
		]);
		expect(screen.queryByText("A Tipologia B mudou")).toBeNull();
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
		await waitFor(() =>
			expect(
				screen.queryByRole("combobox", { name: /^Novo cômodo/ }),
			).toBeNull(),
		);
		expect(writes).toHaveLength(1);
	});

	test("writes over it with the new version when saved again without seeing the list", async () => {
		const { writes, server } = await brunoLosesLavabo();

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText("Tipologia B salva. 18 unidades atualizadas."),
		).toBeInTheDocument();
		expect(writes).toHaveLength(2);
		expect(nth(writes, 1).body).toMatchObject({ version: 2 });
		expect(
			server
				.typologies()
				.find(({ id }) => id === tipologiaB.id)
				?.rooms.map(({ name }) => name),
		).toEqual(["Sala", "Banheiro"]);
	});

	test("tells the name the tipologia has now when someone renamed it", async () => {
		const { server } = await brunoEditsRooms();
		server.saveElsewhere(tipologiaB.id, { name: "Tipologia Z" });
		await addRoom("Lavabo");

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByText("A Tipologia Z mudou")).toBeInTheDocument();
		expect(tags()).toEqual([
			"Tirar Sala",
			"Tirar Quarto",
			"Tirar Banheiro",
			"Tirar Lavabo",
		]);
	});

	test("closes as saved when only the answer of the save was lost", async () => {
		const api = typologiesApi({
			answer: (write, attempt) => {
				if (attempt !== 1) return undefined;
				api.server.saveElsewhere(tipologiaB.id, { rooms: sentRooms(write) });
				return problem(500, "INTERNAL_ERROR");
			},
		});
		await openConfiguration(api.handler);
		await chooseFromMenu("Tipologia B", "Editar cômodos");
		await userEvent.type(field(), "Lavabo{Enter}");
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
		await userEvent.click(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		);

		expect(await screen.findByText("Tipologia B salva.")).toBeInTheDocument();
		expect(screen.queryByText("A Tipologia B mudou")).toBeNull();
		await waitFor(() =>
			expect(
				screen.queryByRole("combobox", { name: /^Novo cômodo/ }),
			).toBeNull(),
		);
		expect(api.writes).toHaveLength(2);
		expect(nth(api.writes, 1).body).toMatchObject({ version: 1 });
	});

	test("says the save failed, not that someone else saved, when the list cannot be reloaded after the refusal", async () => {
		const api = typologiesApi();
		const list = listGoesOffline(api);
		await openConfiguration(list.handler);
		await chooseFromMenu("Tipologia B", "Editar cômodos");
		api.server.saveElsewhere(tipologiaB.id, {
			rooms: [...tipologiaB.rooms, SUITE],
		});
		list.state.offline = true;
		await userEvent.click(screen.getByRole("button", { name: "Tirar Quarto" }));

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText("Não foi possível salvar"),
		).toBeInTheDocument();
		expect(screen.queryByText("A Tipologia B mudou")).toBeNull();
		expect(tags()).toEqual(["Tirar Sala", "Tirar Banheiro"]);

		list.state.offline = false;
		await userEvent.click(
			screen.getByRole("button", { name: "Tentar de novo" }),
		);

		expect(await screen.findByText("A Tipologia B mudou")).toBeInTheDocument();
		expect(nth(api.writes, 1).body).toMatchObject({ version: 1 });
	});

	test("closes the edit and says so when someone deleted the tipologia", async () => {
		const { server } = await brunoEditsRooms();
		server.deleteElsewhere(tipologiaB.id);
		await addRoom("Lavabo");

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText("A Tipologia B foi excluída por outra pessoa."),
		).toBeInTheDocument();
		await waitFor(() => expect(card().queryByText("Tipologia B")).toBeNull());
		expect(screen.queryByRole("combobox", { name: /^Novo cômodo/ })).toBeNull();
		expect(
			screen.getByRole("button", { name: "Nova tipologia" }),
		).not.toHaveAttribute("aria-disabled");
	});

	test("closes the edit when someone deleted the tipologia even if the list cannot be reloaded", async () => {
		const api = typologiesApi();
		const list = listGoesOffline(api);
		await openConfiguration(list.handler);
		await chooseFromMenu("Tipologia B", "Editar cômodos");
		api.server.deleteElsewhere(tipologiaB.id);
		list.state.offline = true;
		await addRoom("Lavabo");

		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText("A Tipologia B foi excluída por outra pessoa."),
		).toBeInTheDocument();
		await waitFor(() =>
			expect(
				screen.queryByRole("combobox", { name: /^Novo cômodo/ }),
			).toBeNull(),
		);
		expect(api.writes).toHaveLength(1);
	});
});

describe("a tipologia renamed over an old version", () => {
	async function brunoRenames(
		options: Parameters<typeof typologiesApi>[0] = {},
	) {
		const api = typologiesApi(options);
		await openConfiguration(api.handler);
		await chooseFromMenu("Tipologia B", "Renomear");
		return api;
	}

	const dialog = () =>
		within(screen.getByRole("dialog", { name: "Renomear a tipologia" }));

	async function typeName(name: string) {
		const input = dialog().getByRole("textbox", { name: "Nome" });
		await userEvent.clear(input);
		await userEvent.type(input, name);
	}

	test("refuses it, keeps the name typed without offering the list, and sends the new version on the next save", async () => {
		const { writes, server } = await brunoRenames();
		server.saveElsewhere(tipologiaB.id, {
			rooms: [...tipologiaB.rooms, SUITE],
		});
		await typeName("Tipologia Y");

		await userEvent.click(dialog().getByRole("button", { name: "Salvar" }));

		const alert = await dialog().findByText("A Tipologia B mudou");
		expect(alert).toBeInTheDocument();
		expect(dialog().getByText(CHANGED)).toBeInTheDocument();
		expect(dialog().getByRole("textbox", { name: "Nome" })).toHaveValue(
			"Tipologia Y",
		);
		expect(
			dialog().queryByRole("button", { name: "Ver a lista atual" }),
		).toBeNull();
		expect(nth(writes, 0).body).toEqual({ version: 1, name: "Tipologia Y" });

		await userEvent.click(dialog().getByRole("button", { name: "Salvar" }));

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Ações da Tipologia Y" }),
			).toBeInTheDocument(),
		);
		expect(nth(writes, 1).body).toEqual({ version: 2, name: "Tipologia Y" });
	});

	test("says the name the tipologia has now when someone renamed it first", async () => {
		const { server } = await brunoRenames();
		server.saveElsewhere(tipologiaB.id, { name: "Tipologia Z" });
		await typeName("Tipologia Y");

		await userEvent.click(dialog().getByRole("button", { name: "Salvar" }));

		expect(
			await dialog().findByText("A Tipologia Z mudou"),
		).toBeInTheDocument();
	});

	test("closes as renamed when only the answer of the rename was lost", async () => {
		const api = typologiesApi({
			answer: (_write, attempt) => {
				if (attempt !== 1) return undefined;
				api.server.saveElsewhere(tipologiaB.id, { name: "Tipologia Y" });
				return problem(500, "INTERNAL_ERROR");
			},
		});
		await openConfiguration(api.handler);
		await chooseFromMenu("Tipologia B", "Renomear");
		await typeName("Tipologia Y");
		await userEvent.click(dialog().getByRole("button", { name: "Salvar" }));
		await dialog().findByText(/Não foi possível salvar a tipologia/);

		await userEvent.click(dialog().getByRole("button", { name: "Salvar" }));

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Ações da Tipologia Y" }),
			).toBeInTheDocument(),
		);
		expect(screen.queryByText("A Tipologia B mudou")).toBeNull();
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(api.writes).toHaveLength(2);
		expect(nth(api.writes, 1).body).toEqual({
			version: 1,
			name: "Tipologia Y",
		});
	});

	test("sends the version of its own rename when the list fails to reload after it", async () => {
		const api = typologiesApi({
			answer: () => {
				list.state.offline = true;
				return undefined;
			},
		});
		const list = listGoesOffline(api);
		await openConfiguration(list.handler);
		await chooseFromMenu("Tipologia B", "Renomear");
		await typeName("Tipologia Y");
		await userEvent.click(dialog().getByRole("button", { name: "Salvar" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

		await chooseFromMenu("Tipologia Y", "Renomear");
		await typeName("Tipologia X");
		await userEvent.click(dialog().getByRole("button", { name: "Salvar" }));

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(screen.queryByText("A Tipologia Y mudou")).toBeNull();
		expect(nth(api.writes, 1).body).toEqual({
			version: 2,
			name: "Tipologia X",
		});
	});

	test("says the rename failed, not that someone else saved, when the list cannot be reloaded after the refusal", async () => {
		const api = typologiesApi();
		const list = listGoesOffline(api);
		await openConfiguration(list.handler);
		await chooseFromMenu("Tipologia B", "Renomear");
		api.server.saveElsewhere(tipologiaB.id, {
			rooms: [...tipologiaB.rooms, SUITE],
		});
		list.state.offline = true;
		await typeName("Tipologia Y");

		await userEvent.click(dialog().getByRole("button", { name: "Salvar" }));

		expect(
			await dialog().findByText(/Não foi possível salvar a tipologia/),
		).toBeInTheDocument();
		expect(dialog().queryByText("A Tipologia B mudou")).toBeNull();

		list.state.offline = false;
		await userEvent.click(dialog().getByRole("button", { name: "Salvar" }));

		expect(
			await dialog().findByText("A Tipologia B mudou"),
		).toBeInTheDocument();
		expect(nth(api.writes, 1).body).toEqual({
			version: 1,
			name: "Tipologia Y",
		});
	});

	test("closes the dialog and says so when someone deleted the tipologia", async () => {
		const { server } = await brunoRenames();
		server.deleteElsewhere(tipologiaB.id);
		await typeName("Tipologia Y");

		await userEvent.click(dialog().getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText("A Tipologia B foi excluída por outra pessoa."),
		).toBeInTheDocument();
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(card().queryByText("Tipologia B")).toBeNull();
	});
});
