import { type CreateStructure, TYPOLOGY_NAME_TAKEN } from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { project } from "@/test/projectsApi";
import {
	type ApiHandler,
	json,
	renderAt,
	signedIn,
	stubApi,
} from "@/test/renderApp";
import { expiringServer, signInAgain } from "@/test/sessionExpiry";
import {
	combine,
	emptyStructure,
	floor,
	structureApi,
	structureOf,
	tower,
	typologiesApi,
	typologyOf,
} from "@/test/structureApi";

const user = userEvent.setup({ delay: null });
const OBRA = { ...project(7), name: "Casa Moinhos" };
const PATH = `/projects/${OBRA.id}/structure/new`;

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Conflict", status, code, ...extra },
		status,
	);
}

function wizardApi(create?: (body: CreateStructure) => Response): {
	handler: ApiHandler;
	sent: CreateStructure[];
} {
	const sent: CreateStructure[] = [];
	const handler: ApiHandler = combine(
		(url, init) => {
			if (url.pathname === `/api/projects/${OBRA.id}`) return json(OBRA);
			if (url.pathname === `/api/projects/${OBRA.id}/units`) {
				return json({ reserved: 150, used: 0, remaining: 150 });
			}
			if (
				url.pathname === `/api/projects/${OBRA.id}/structure` &&
				init?.method === "POST"
			) {
				const body = JSON.parse(String(init.body)) as CreateStructure;
				sent.push(body);
				return create
					? create(body)
					: json(
							{ counts: { towers: 1, floors: 1, units: 1, commonAreas: 1 } },
							201,
						);
			}
			return undefined;
		},
		structureApi(OBRA.id, emptyStructure),
		typologiesApi(OBRA.id, { typologies: [] }),
	);
	return { handler, sent };
}

function open(handler: ApiHandler) {
	const stub = stubApi(signedIn, { api: handler });
	return { ...renderAt(PATH), ...stub };
}

const writesOf = (fetchMock: ReturnType<typeof stubApi>["fetchMock"]) =>
	fetchMock.mock.calls.filter(([, init]) => {
		const method = init?.method ?? "GET";
		return method !== "GET";
	});

async function createCommonType(name: string) {
	await user.click(
		screen.getByRole("button", { name: "Nova tipologia de área comum" }),
	);
	await user.type(await screen.findByRole("textbox", { name: "Nome" }), name);
	await user.click(screen.getByRole("button", { name: "Criar" }));
	await screen.findByDisplayValue(name);
}

function cardOf(name: string): HTMLElement {
	const field = screen
		.getAllByRole("textbox", { name: "Nome da tipologia" })
		.find((item) => (item as HTMLInputElement).value === name);
	const card = field?.closest("[id$='-card']");
	if (!card) throw new Error(`no card for ${name}`);
	return card as HTMLElement;
}

async function addRoom(name: string, cardName: string) {
	await user.type(
		within(cardOf(cardName)).getByRole("combobox", { name: "Novo cômodo" }),
		`${name}{Enter}`,
	);
}

describe("typologies in the wizard", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		toast.dismiss();
	});

	test("keeps two catalogs in the draft until create, and refuses a name the other catalog already has", async () => {
		const { handler, sent } = wizardApi();
		const { fetchMock } = open(handler);
		await user.type(
			await screen.findByRole("textbox", { name: "Primeiro andar" }),
			"1",
		);
		await user.type(screen.getByRole("textbox", { name: "Último andar" }), "1");
		await user.type(screen.getByRole("textbox", { name: "Finais" }), "01");
		await user.click(
			screen.getByRole("checkbox", { name: "Hall em cada andar" }),
		);
		await createCommonType("Hall padrão");
		await addRoom("Salão", "Hall padrão");
		await user.selectOptions(
			screen.getByRole("combobox", { name: "Tipologia dos halls (opcional)" }),
			"Hall padrão",
		);

		await user.click(screen.getByRole("button", { name: "Nova tipologia" }));
		await user.type(
			await screen.findByRole("textbox", { name: "Nome" }),
			"hall  padrao",
		);
		await user.click(screen.getByRole("button", { name: "Criar" }));
		expect(
			await screen.findByText("Esse nome já existe nesta obra."),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		const rooms = within(cardOf("Tipologia A")).getByRole("combobox", {
			name: "Novo cômodo",
		});
		await user.type(rooms, "sa");
		expect(
			within(screen.getByRole("group", { name: "Sugestões" })).getByRole(
				"option",
				{ name: "Sala" },
			),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("group", { name: "Sugestões" })).getByRole(
				"option",
				{ name: "Sacada" },
			),
		).toBeInTheDocument();
		expect(
			within(
				screen.getByRole("group", { name: "Usados nesta obra" }),
			).getByRole("option", { name: "Salão" }),
		).toBeInTheDocument();
		await user.type(rooms, "{Escape}");
		await user.clear(rooms);
		await user.type(rooms, "Copa");
		await user.tab();
		expect(
			screen.queryByRole("button", { name: "Tirar Copa" }),
		).not.toBeInTheDocument();
		await user.type(rooms, "{Enter}");
		expect(
			screen.getByRole("button", { name: "Tirar Copa" }),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Copiar Tipologia A" }),
		);
		expect(screen.getByRole("textbox", { name: "Nome da cópia" })).toHaveValue(
			"Tipologia A (cópia)",
		);
		await user.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(
			screen.queryByDisplayValue("Tipologia A (cópia)"),
		).not.toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Copiar Tipologia A" }),
		);
		await user.click(screen.getByRole("button", { name: "Copiar" }));
		await screen.findByDisplayValue("Tipologia A (cópia)");
		const copy = cardOf("Tipologia A (cópia)");
		await user.click(
			within(cardOf("Tipologia A")).getByRole("button", { name: "Tirar Copa" }),
		);
		expect(
			within(copy.closest("[id$='-card']") as HTMLElement).getByRole("button", {
				name: "Tirar Copa",
			}),
		).toBeInTheDocument();

		expect(writesOf(fetchMock)).toHaveLength(0);
		await user.click(screen.getByRole("button", { name: "Tirar Hall padrão" }));
		expect(
			screen.getByRole("combobox", { name: "Tipologia dos halls (opcional)" }),
		).toHaveValue("");

		await user.click(screen.getByRole("button", { name: "Criar estrutura" }));
		await waitFor(() => expect(sent).toHaveLength(1));
		const body = sent[0] as CreateStructure;
		expect(
			body.typologies.map(({ name, locationType }) => [name, locationType]),
		).toEqual([
			["Tipologia A", "unit"],
			["Tipologia A (cópia)", "unit"],
		]);
		expect(
			body.locations.find((location) => location.name === "Hall")?.typologyId,
		).toBeUndefined();
	});

	test("shows a taken typology name on the typology and keeps the draft", async () => {
		const { handler } = wizardApi(() =>
			problem(409, TYPOLOGY_NAME_TAKEN, { names: ["Tipologia A"] }),
		);
		open(handler);
		await user.type(
			await screen.findByRole("textbox", { name: "Primeiro andar" }),
			"1",
		);
		await user.type(screen.getByRole("textbox", { name: "Último andar" }), "1");
		await user.type(screen.getByRole("textbox", { name: "Finais" }), "01");
		await user.click(screen.getByRole("button", { name: "Criar estrutura" }));

		expect(
			await screen.findByText("Esse nome já existe nesta obra."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Nome da tipologia" }),
		).toHaveValue("Tipologia A");
		expect(
			screen.getByRole("textbox", { name: "Nome da tipologia" }),
		).toHaveFocus();
	});

	test("links the created structure to the typologies section", async () => {
		const { handler } = wizardApi();
		open(handler);
		await user.type(
			await screen.findByRole("textbox", { name: "Primeiro andar" }),
			"1",
		);
		await user.type(screen.getByRole("textbox", { name: "Último andar" }), "1");
		await user.type(screen.getByRole("textbox", { name: "Finais" }), "01");
		await user.click(screen.getByRole("button", { name: "Criar estrutura" }));

		const link = await screen.findByRole("link", { name: "Ver tipologias" });
		expect(link).toHaveAttribute(
			"href",
			`/projects/${OBRA.id}/configuration#tipologias`,
		);
		expect(
			screen.getByText("Estrutura criada: 1 torre e 1 unidade."),
		).toBeInTheDocument();
	});

	test("a common-area typology created from the halls selector is selected there", async () => {
		const { handler } = wizardApi();
		open(handler);
		await screen.findByRole("heading", { level: 2, name: "Tipologias" });
		await user.click(
			screen.getByRole("checkbox", { name: "Hall em cada andar" }),
		);
		const halls = screen.getByRole("combobox", {
			name: "Tipologia dos halls (opcional)",
		});
		await user.selectOptions(halls, "new-common-area-type");
		await user.type(
			await screen.findByRole("textbox", { name: "Nome" }),
			"Corredor",
		);
		await user.click(screen.getByRole("button", { name: "Criar" }));

		expect(halls).toHaveDisplayValue("Corredor");
		expect(halls).toHaveFocus();
	});

	test("returns focus to whoever opened the name dialog and the copy dialog", async () => {
		const { handler } = wizardApi();
		open(handler);
		await screen.findByRole("heading", { level: 2, name: "Tipologias" });
		const create = screen.getByRole("button", { name: "Nova tipologia" });
		await user.click(create);
		await user.click(await screen.findByRole("button", { name: "Cancelar" }));
		expect(create).toHaveFocus();

		const copy = screen.getByRole("button", { name: "Copiar Tipologia A" });
		await user.click(copy);
		await user.click(await screen.findByRole("button", { name: "Cancelar" }));
		expect(copy).toHaveFocus();
	});

	test("restores the hall typology and the copy after the session expires, without reopening a dialog", async () => {
		const sent: CreateStructure[] = [];
		const api: ApiHandler = combine(
			(url, init) => {
				if (url.pathname === `/api/projects/${OBRA.id}`) return json(OBRA);
				if (url.pathname === `/api/projects/${OBRA.id}/units`) {
					return json({ reserved: 150, used: 0, remaining: 150 });
				}
				if (
					url.pathname === `/api/projects/${OBRA.id}/structure` &&
					init?.method === "POST"
				) {
					sent.push(JSON.parse(String(init.body)) as CreateStructure);
					return json(
						{ counts: { towers: 1, floors: 1, units: 1, commonAreas: 0 } },
						201,
					);
				}
				return undefined;
			},
			structureApi(OBRA.id, emptyStructure),
			typologiesApi(OBRA.id, { typologies: [] }),
		);
		const server = expiringServer(api);
		renderAt(PATH);
		await user.type(
			await screen.findByRole("textbox", { name: "Primeiro andar" }),
			"1",
		);
		await user.type(screen.getByRole("textbox", { name: "Último andar" }), "1");
		await user.type(screen.getByRole("textbox", { name: "Finais" }), "01");
		await user.click(
			screen.getByRole("checkbox", { name: "Hall em cada andar" }),
		);
		await createCommonType("Hall padrão");
		await user.selectOptions(
			screen.getByRole("combobox", { name: "Tipologia dos halls (opcional)" }),
			"Hall padrão",
		);
		await user.click(
			screen.getByRole("button", { name: "Copiar Tipologia A" }),
		);
		await user.click(screen.getByRole("button", { name: "Copiar" }));
		await screen.findByDisplayValue("Tipologia A (cópia)");

		server.expireNextWrite();
		await user.click(screen.getByRole("button", { name: "Criar estrutura" }));
		await signInAgain();

		expect(
			await screen.findByRole("combobox", {
				name: "Tipologia dos halls (opcional)",
			}),
		).toHaveDisplayValue("Hall padrão");
		expect(screen.getByDisplayValue("Tipologia A (cópia)")).toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	test("shows an existing typology without editing it, and preselects the tower's hall typology when adding floors", async () => {
		const hall = typologyOf("Hall padrão", ["Circulação"], {
			locationType: "common_area",
		});
		const typeC = typologyOf("Tipologia C", ["Sala"]);
		const towerB = tower("Torre B", [
			floor("1º andar", ["101"], [{ name: "Hall", typology: "Hall padrão" }]),
		]);
		const handler = combine(
			(url) => {
				if (url.pathname === `/api/projects/${OBRA.id}`) return json(OBRA);
				if (url.pathname === `/api/projects/${OBRA.id}/units`) {
					return json({ reserved: 100, used: 0, remaining: 100 });
				}
				return undefined;
			},
			typologiesApi(OBRA.id, { typologies: [typeC, hall] }),
			structureApi(OBRA.id, structureOf([towerB])),
		);
		stubApi(signedIn, { api: handler });
		renderAt(`/projects/${OBRA.id}/structure/new?tower=${towerB.id}`);

		expect(await screen.findByText("Tipologia C")).toBeInTheDocument();
		expect(
			screen.getAllByText(
				"Já existe na obra. Os cômodos mudam na Configuração.",
			).length,
		).toBeGreaterThan(0);
		expect(
			screen.queryByRole("textbox", { name: "Nome da tipologia" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Copiar Tipologia C" }),
		).toBeInTheDocument();
		expect(
			await screen.findByRole("combobox", {
				name: "Tipologia dos halls (opcional)",
			}),
		).toHaveDisplayValue("Hall padrão");
	});
});
