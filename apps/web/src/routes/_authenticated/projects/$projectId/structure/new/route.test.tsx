import {
	type CreateStructure,
	LOCATION_NAME_TAKEN,
	NO_UNITS_LEFT,
	PROJECT_NOT_FOUND,
	type ProjectSummary,
	type ProjectUnitsBalance,
	type Structure,
	TYPOLOGY_NAME_TAKEN,
} from "@bluprint/shared";
import {
	act,
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import {
	readStructureDraft,
	structureDraftKey,
	writeStructureDraft,
} from "@/features/structure/StructureWizard/structureDraftStore";
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
	structureApi,
	structureOf,
	tower,
} from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const user = userEvent.setup({ delay: null });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const OBRA = { ...project(7), name: "Casa Moinhos" };
const WIZARD_PATH = `/projects/${OBRA.id}/structure/new`;
const LOCKED = "A obra foi entregue: a estrutura não pode mais ser alterada.";

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Conflict", status, code, ...extra },
		status,
	);
}

function balance(remaining: number, reserved = 150): ProjectUnitsBalance {
	return { reserved, used: reserved - remaining, remaining };
}

function wizardApi(
	options: {
		summary?: ProjectSummary;
		structure?: Structure;
		units?: ProjectUnitsBalance;
		unitsResponse?: () => Promise<Response> | Response;
		createAndLoseResponse?: boolean;
		lookup?: () => Promise<Response> | Response;
		create?: (
			body: CreateStructure,
			attempt: number,
		) => Promise<Response> | Response;
	} = {},
) {
	let summary = options.summary ?? OBRA;
	let structure = options.structure ?? emptyStructure;
	const sent: CreateStructure[] = [];
	const created: CreateStructure[] = [];
	const unitsReads: number[] = [];
	let units = options.units ?? balance(150);
	const handler: ApiHandler = combine(
		(url, init) => {
			if (
				options.lookup &&
				url.pathname.startsWith(`/api/projects/${summary.id}/locations/`) &&
				(init?.method ?? "GET") === "GET"
			)
				return options.lookup();
			if (url.pathname === "/api/organization/units") {
				return json({
					contracted: 500,
					reserved: 300,
					free: 200,
					reclaimable: 0,
				});
			}
			if (url.pathname === `/api/projects/${summary.id}`) return json(summary);
			if (
				url.pathname === `/api/projects/${summary.id}/units` &&
				init?.method === "PATCH"
			) {
				const { reserved } = JSON.parse(String(init.body)) as {
					reserved: number;
				};
				units = { ...units, reserved, remaining: reserved - units.used };
				summary = { ...summary, units: { ...summary.units, reserved } };
				return json(summary);
			}
			if (url.pathname === `/api/projects/${summary.id}/units`) {
				unitsReads.push(Date.now());
				return options.unitsResponse ? options.unitsResponse() : json(units);
			}
			if (
				url.pathname === `/api/projects/${summary.id}/structure` &&
				init?.method === "POST"
			) {
				const body = JSON.parse(String(init.body)) as CreateStructure;
				sent.push(body);
				if (options.createAndLoseResponse) {
					const first = body.locations[0];
					if (!first) throw new Error("missing tower");
					structure = structureOf([{ ...tower("Torre A"), id: first.id }]);
					created.push(body);
					return Promise.reject(new TypeError("connection lost"));
				}
				if (options.create) return options.create(body, sent.length);
				structure = structureOf([tower("Torre A")]);
				return json({ counts: countsOf(body) }, 201);
			}
			return undefined;
		},
		(url, init) => structureApi(summary.id, structure)(url, init),
	);
	return {
		handler,
		sent,
		created,
		unitsReads,
		setUnits(next: ProjectUnitsBalance) {
			units = next;
		},
	};
}

function countsOf(body: CreateStructure) {
	const count = (type: string) =>
		body.locations.filter((location) => location.type === type).length;
	return {
		towers: count("tower"),
		floors: count("floor"),
		units: count("unit"),
		commonAreas: count("common_area"),
	};
}

function open(api: ApiHandler, path = WIZARD_PATH) {
	const stub = stubApi(signedIn, { api });
	return { ...renderAt(path), ...stub };
}

async function typeInto(name: string, value: string, at = 0) {
	const fields = await screen.findAllByRole("textbox", { name });
	const field = nth(fields, at);
	await user.clear(field);
	if (value) await user.type(field, value);
}

async function describeTower(
	last: string,
	finals: string,
	options: { first?: string; at?: number } = {},
) {
	const at = options.at ?? 0;
	await typeInto("Primeiro andar", options.first ?? "1", at);
	await typeInto("Último andar", last, at);
	await typeInto("Finais", finals, at);
}

const hallCheckbox = (at = 0) =>
	nth(screen.getAllByRole("checkbox", { name: "Hall em cada andar" }), at);

async function checkHall(at = 0) {
	await user.click(hallCheckbox(at));
}

const rangeRegion = (number: number, at = 0) =>
	nth(screen.getAllByRole("region", { name: `Faixa ${number}` }), at);

const createButton = () =>
	screen.findByRole("button", { name: /Criar estrutura|Criando estrutura…/ });

async function addFloorArea(name: string, floor: string) {
	await user.click(
		await screen.findByRole("button", { name: "Área comum num andar" }),
	);
	await user.type(
		screen.getByRole("textbox", { name: "Nome da área comum" }),
		name,
	);
	await user.type(screen.getByRole("textbox", { name: "Andar" }), floor);
	await user.click(screen.getByRole("button", { name: "Adicionar ao andar" }));
	await screen.findByText(`· Torre A, ${floor}º andar`);
}

const floorAreaRow = (name: string) =>
	screen.getByRole("button", { name: `Tirar ${name}` }).closest("li");

async function toTypologiesOnPhone() {
	await user.click(
		await screen.findByRole("button", { name: "Continuar · Áreas comuns" }),
	);
	await user.click(
		await screen.findByRole("button", { name: "Continuar · Tipologias" }),
	);
}

async function toPreviewOnPhone() {
	await toTypologiesOnPhone();
	await user.click(
		await screen.findByRole("button", { name: "Continuar · Prévia" }),
	);
}

const ruleGroup = (number: number) =>
	screen.getByRole("group", { name: `Regra ${number}` });

async function addTypology(name = "Tipologia B") {
	await user.click(screen.getByRole("button", { name: "Nova tipologia" }));
	const field = await screen.findByRole("textbox", { name: "Nome" });
	await user.clear(field);
	await user.type(field, name);
	await user.click(screen.getByRole("button", { name: "Criar" }));
	await screen.findByDisplayValue(name);
}

async function addRule() {
	await user.click(screen.getByRole("button", { name: "Regra" }));
}

describe("structure wizard", () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
		toast.dismiss();
	});

	describe("on the desktop", () => {
		test("finds a creation whose response was lost after reopening", async () => {
			const { handler, sent, created } = wizardApi({
				createAndLoseResponse: true,
			});
			open(handler);
			await describeTower("2", "01, 02");
			await user.click(await createButton());
			await screen.findByText("Não foi possível confirmar");
			cleanup();
			const { router } = open(handler);
			await waitFor(() =>
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`),
			);
			expect(sent).toHaveLength(1);
			expect(created).toHaveLength(1);
			expect(
				created[0]?.locations
					.filter((location) => location.type === "floor")
					.map((location) => location.name),
			).toEqual(["Térreo", "1º andar", "2º andar"]);
			expect(
				localStorage.getItem(structureDraftKey(signedIn.user.id, OBRA.id)),
			).toBeNull();
		});

		test("checks a pending attempt before showing a delivered project", async () => {
			const first = wizardApi({
				create: () => Promise.reject(new TypeError("offline")),
			});
			open(first.handler);
			await describeTower("2", "01, 02");
			await user.click(await createButton());
			await screen.findByText("Não foi possível confirmar");
			const id = first.sent[0]?.locations[0]?.id;
			if (!id) throw new Error("missing first location");
			cleanup();
			const delivered = wizardApi({
				summary: { ...OBRA, status: "delivered" },
				structure: structureOf([{ ...tower("Torre A"), id }]),
			});
			const { router } = open(delivered.handler);
			await waitFor(() =>
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`),
			);
			expect(
				localStorage.getItem(structureDraftKey(signedIn.user.id, OBRA.id)),
			).toBeNull();
			expect(
				await screen.findByText("Estrutura criada: 1 torre e 4 unidades."),
			).toBeInTheDocument();
		});

		test("checks a lost response before retrying with the same ids", async () => {
			const { handler, sent } = wizardApi({
				create: (body, attempt) =>
					attempt === 1
						? Promise.reject(new TypeError("offline"))
						: json({ counts: countsOf(body) }, 201),
			});
			open(handler);
			await describeTower("2", "01, 02");
			await user.click(await createButton());
			expect(
				await screen.findByText("Não foi possível confirmar"),
			).toBeInTheDocument();
			expect(
				screen.getByRole("textbox", { name: "Último andar" }),
			).toBeDisabled();
			await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
			await waitFor(() => expect(sent).toHaveLength(2));
			expect(sent[1]).toEqual(sent[0]);
		});

		test("keeps editing locked when the attempt cannot be checked", async () => {
			const { handler } = wizardApi({
				create: () => Promise.reject(new TypeError("offline")),
				lookup: () => Promise.reject(new TypeError("offline")),
			});
			open(handler);
			await describeTower("2", "01, 02");
			await user.click(await createButton());
			await screen.findByText("Não foi possível confirmar");
			await user.click(screen.getByRole("button", { name: "Voltar a editar" }));
			expect(
				await screen.findByText(
					"Ainda sem conexão. Para editar, o app precisa confirmar antes que nada foi criado.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByRole("textbox", { name: "Último andar" }),
			).toBeDisabled();
		});

		test("checks before editing and creates only the revised floors", async () => {
			const { handler, sent } = wizardApi({
				create: (body, attempt) =>
					attempt === 1
						? Promise.reject(new TypeError("offline"))
						: json({ counts: countsOf(body) }, 201),
			});
			open(handler);
			await describeTower("4", "01, 02");
			await user.click(await createButton());
			await screen.findByText("Não foi possível confirmar");
			await user.click(screen.getByRole("button", { name: "Voltar a editar" }));
			await waitFor(() =>
				expect(
					screen.getByRole("textbox", { name: "Último andar" }),
				).toBeEnabled(),
			);
			await typeInto("Último andar", "2");
			await user.click(await createButton());
			await waitFor(() => expect(sent).toHaveLength(2));
			expect(
				sent[1]?.locations
					.filter((location) => location.type === "floor")
					.map((location) => location.name),
			).toEqual(["Térreo", "1º andar", "2º andar"]);
			expect(sent[1]?.locations[0]?.id).not.toEqual(sent[0]?.locations[0]?.id);
		});

		test("asks before leaving through the logo and discards only on confirmation", async () => {
			const { handler } = wizardApi();
			const { router } = open(handler);
			await typeInto("Primeiro andar", "1");
			await user.click(screen.getByRole("link", { name: "BluPrint, obras" }));
			expect(
				await screen.findByText("Descartar o que você montou?"),
			).toBeInTheDocument();
			await user.click(
				screen.getByRole("button", { name: "Continuar montando" }),
			);
			expect(router.state.location.pathname).toBe(WIZARD_PATH);
			await user.click(screen.getByRole("link", { name: "BluPrint, obras" }));
			await user.click(
				await screen.findByRole("button", { name: "Descartar" }),
			);
			await waitFor(() =>
				expect(router.state.location.pathname).toBe("/projects"),
			);
			expect(
				localStorage.getItem(structureDraftKey(signedIn.user.id, OBRA.id)),
			).toBeNull();
		});

		test("asks before signing out and preserves the session on cancel", async () => {
			const { fetchMock } = open(wizardApi().handler);
			await typeInto("Primeiro andar", "1");
			await user.click(
				screen.getByRole("button", { name: "Conta de Ana Ribeiro" }),
			);
			await user.click(screen.getByRole("menuitem", { name: "Sair" }));
			await user.click(
				await screen.findByRole("button", { name: "Continuar montando" }),
			);
			expect(
				fetchMock.mock.calls.some(([url]) => String(url).includes("/sign-out")),
			).toBe(false);
			await user.click(
				screen.getByRole("button", { name: "Conta de Ana Ribeiro" }),
			);
			await user.click(screen.getByRole("menuitem", { name: "Sair" }));
			await user.click(
				await screen.findByRole("button", { name: "Descartar" }),
			);
			await screen.findByLabelText("E-mail");
			expect(
				localStorage.getItem(structureDraftKey(signedIn.user.id, OBRA.id)),
			).toBeNull();
		});

		test("locks a stale tab until it loads the other tab's draft", async () => {
			const { handler } = wizardApi();
			open(handler);
			await typeInto("Primeiro andar", "1");
			const key = structureDraftKey(signedIn.user.id, OBRA.id);
			const stored = readStructureDraft(key);
			const range = stored?.draft.towers[0]?.ranges[0];
			if (!stored || !range) throw new Error("missing saved range");
			range.first = "7";
			writeStructureDraft(key, stored);
			act(() =>
				window.dispatchEvent(
					new StorageEvent("storage", {
						key,
						newValue: localStorage.getItem(key),
					}),
				),
			);
			expect(
				await screen.findByText("Este rascunho mudou em outra aba"),
			).toBeInTheDocument();
			expect(
				screen.getByRole("textbox", { name: "Primeiro andar" }),
			).toBeDisabled();
			await user.click(
				screen.getByRole("button", { name: "Carregar a versão mais recente" }),
			);
			expect(
				screen.getByRole("textbox", { name: "Primeiro andar" }),
			).toHaveValue("7");
		});

		test("restores a draft after reopening the wizard", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("4", "01, 02");
			cleanup();
			open(handler);
			expect(
				await screen.findByText("Rascunho restaurado"),
			).toBeInTheDocument();
			expect(
				await screen.findByRole("textbox", { name: "Último andar" }),
			).toHaveValue("4");
			expect(screen.getByRole("textbox", { name: "Finais" })).toHaveValue(
				"01, 02",
			);
		});

		test("unlocks editing after a 500 without the old nothing-saved alert", async () => {
			const { handler } = wizardApi({
				create: () =>
					json({ type: "about:blank", title: "Internal", status: 500 }, 500),
			});
			open(handler);
			await describeTower("2", "01, 02");
			await user.click(await createButton());
			await screen.findByText("Não foi possível confirmar");
			await user.click(screen.getByRole("button", { name: "Voltar a editar" }));
			await waitFor(() =>
				expect(
					screen.getByRole("textbox", { name: "Último andar" }),
				).toBeEnabled(),
			);

			expect(screen.queryByText(/Nada foi salvo/)).not.toBeInTheDocument();
			expect(
				screen.queryByText("Não foi possível confirmar"),
			).not.toBeInTheDocument();
		});

		test("leaves a stale tab without asking and keeps the other tab's draft", async () => {
			const { handler } = wizardApi();
			const { router } = open(handler);
			await typeInto("Primeiro andar", "1");
			const key = structureDraftKey(signedIn.user.id, OBRA.id);
			const stored = readStructureDraft(key);
			const range = stored?.draft.towers[0]?.ranges[0];
			if (!stored || !range) throw new Error("missing saved range");
			range.first = "7";
			writeStructureDraft(key, stored);
			const newer = localStorage.getItem(key);
			act(() =>
				window.dispatchEvent(
					new StorageEvent("storage", { key, newValue: newer }),
				),
			);
			await screen.findByText("Este rascunho mudou em outra aba");

			await user.click(screen.getByRole("link", { name: "BluPrint, obras" }));

			await waitFor(() =>
				expect(router.state.location.pathname).toBe("/projects"),
			);
			expect(
				screen.queryByText("Descartar o que você montou?"),
			).not.toBeInTheDocument();
			expect(localStorage.getItem(key)).toBe(newer);
		});

		test("asks before the browser's back leaves a changed draft", async () => {
			stubApi(signedIn, { api: wizardApi().handler });
			const { router } = renderAt("/projects", { browserHistory: true });
			await act(() =>
				router.navigate({
					to: "/projects/$projectId/structure/new",
					params: { projectId: OBRA.id },
				}),
			);
			await typeInto("Primeiro andar", "1");

			act(() => router.history.back());

			expect(
				await screen.findByText("Descartar o que você montou?"),
			).toBeInTheDocument();
			await user.click(
				screen.getByRole("button", { name: "Continuar montando" }),
			);
			expect(router.state.location.pathname).toBe(WIZARD_PATH);
			expect(
				localStorage.getItem(structureDraftKey(signedIn.user.id, OBRA.id)),
			).not.toBeNull();

			act(() => router.history.back());
			await user.click(
				await screen.findByRole("button", { name: "Descartar" }),
			);

			await waitFor(() =>
				expect(router.state.location.pathname).toBe("/projects"),
			);
			expect(
				localStorage.getItem(structureDraftKey(signedIn.user.id, OBRA.id)),
			).toBeNull();
			window.history.replaceState(null, "", "/");
		});

		test("leaves without asking when nothing changed", async () => {
			const { handler } = wizardApi();
			const { router } = open(handler);
			await screen.findByRole("textbox", { name: "Último andar" });

			await user.click(screen.getByRole("link", { name: "BluPrint, obras" }));

			await waitFor(() =>
				expect(router.state.location.pathname).toBe("/projects"),
			);
			expect(
				screen.queryByText("Descartar o que você montou?"),
			).not.toBeInTheDocument();
		});

		test("opens the project after creating without asking to discard", async () => {
			const { handler } = wizardApi();
			const { router } = open(handler);
			await describeTower("2", "01, 02");

			await user.click(await createButton());

			await waitFor(() =>
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`),
			);
			expect(
				screen.queryByText("Descartar o que você montou?"),
			).not.toBeInTheDocument();
			expect(
				localStorage.getItem(structureDraftKey(signedIn.user.id, OBRA.id)),
			).toBeNull();
		});

		test("drops the draft of another account that used this browser", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("4", "01, 02");
			cleanup();
			const mine = structureDraftKey(signedIn.user.id, OBRA.id);
			const theirs = structureDraftKey("another-account", OBRA.id);
			localStorage.setItem(theirs, localStorage.getItem(mine) ?? "");
			localStorage.removeItem(mine);

			open(handler);

			expect(
				await screen.findByRole("textbox", { name: "Último andar" }),
			).toHaveValue("");
			expect(screen.queryByText("Rascunho restaurado")).not.toBeInTheDocument();
			expect(localStorage.getItem(theirs)).toBeNull();
		});

		test("drops the draft with a notice when someone else created the structure", async () => {
			open(wizardApi().handler);
			await describeTower("4", "01, 02");
			cleanup();

			const { router } = open(
				wizardApi({ structure: structureOf([tower("Torre A")]) }).handler,
			);

			await waitFor(() =>
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`),
			);
			expect(
				await screen.findByText(
					"Esta obra já tem estrutura. O rascunho foi descartado.",
				),
			).toBeInTheDocument();
			expect(
				localStorage.getItem(structureDraftKey(signedIn.user.id, OBRA.id)),
			).toBeNull();
		});

		test("drops the draft and shows the delivered project", async () => {
			open(wizardApi().handler);
			await describeTower("4", "01, 02");
			cleanup();

			open(wizardApi({ summary: { ...OBRA, status: "delivered" } }).handler);

			expect(
				await screen.findByText("A obra foi entregue"),
			).toBeInTheDocument();
			await waitFor(() =>
				expect(
					localStorage.getItem(structureDraftKey(signedIn.user.id, OBRA.id)),
				).toBeNull(),
			);
		});

		test("opens with the band, one tower, both sections and an empty preview (W1)", async () => {
			const { handler } = wizardApi();
			open(handler);

			expect(
				await screen.findByRole("heading", {
					level: 1,
					name: "Montar estrutura",
				}),
			).toBeInTheDocument();
			expect(
				screen.getByText("Casa Moinhos · nada é salvo antes de criar"),
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Casa Moinhos" }),
			).toHaveAttribute("href", `/projects/${OBRA.id}`);
			for (const name of [
				"Torres e andares",
				"Áreas comuns",
				"Tipologias",
				"Prévia",
			]) {
				expect(
					screen.getByRole("heading", { level: 2, name }),
				).toBeInTheDocument();
			}
			expect(
				screen.getByText("1 torre · 0 andares · 0 unidades"),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"Com uma torre só, ela não aparece na navegação: a obra abre direto na fachada.",
				),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("textbox", { name: "Nome" }),
			).not.toBeInTheDocument();
			expect(
				screen.getByText(
					"Cada torre com as suas faixas de andares e os finais de cada faixa. Uma torre nova começa igual à anterior, sem o Hall em cada andar.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"Cada faixa vai de um andar a outro, com os seus finais. Andar fora de uma faixa não existe.",
				),
			).toBeInTheDocument();
			const range = within(rangeRegion(1));
			expect(
				range.getByRole("textbox", { name: "Primeiro andar" }),
			).toHaveValue("");
			expect(range.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"",
			);
			const finals = range.getByRole("textbox", { name: "Finais" });
			expect(finals).toHaveValue("");
			expect(finals).toHaveAttribute("placeholder", "Ex.: 01, 02");
			expect(finals).toHaveAccessibleDescription(
				"Separe os finais com vírgula e espaço.",
			);
			expect(
				range.getByText("Preencha a faixa para ver as unidades."),
			).toBeInTheDocument();
			expect(
				range.queryByRole("button", { name: "Tirar a faixa 1" }),
			).not.toBeInTheDocument();
			expect(
				screen.getByText("Total: 0 unidades em 0 andares"),
			).toBeInTheDocument();
			expect(
				screen.getByRole("checkbox", { name: "Térreo sem unidades" }),
			).toBeChecked();
			expect(
				screen.getByRole("checkbox", { name: "Térreo sem unidades" }),
			).toHaveAccessibleDescription("Com hall de entrada");
			expect(hallCheckbox()).not.toBeChecked();
			expect(hallCheckbox()).toHaveAccessibleDescription(
				"Um Hall em cada andar da torre. Cada um usa 1 da reserva.",
			);
			expect(
				screen.getByText(
					"Vale para a obra toda. Depois, qualquer nome se troca na própria unidade.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"O hall de entrada e o Hall em cada andar estão no passo 1. Aqui entram as outras. Cada área comum criada usa 1 da reserva, como uma unidade.",
				),
			).toBeInTheDocument();
			expect(screen.getByText("Torre única")).toBeInTheDocument();
			expect(
				screen.getByText("Preencha as faixas para ver os andares."),
			).toBeInTheDocument();
			expect(
				await screen.findByText(
					"Complete as faixas para ver quanto da reserva esta estrutura usa.",
				),
			).toBeInTheDocument();
		});

		test("counts the plan and says what it uses and what is left as the fields are typed (W4)", async () => {
			const { handler } = wizardApi({ units: balance(150) });
			open(handler);
			await describeTower("3", "01, 04");
			await checkHall();

			expect(
				await screen.findByText("1 torre · 4 andares · 12 unidades"),
			).toBeInTheDocument();
			expect(
				screen.getByText("4 áreas comuns · Tipologia A: 12"),
			).toBeInTheDocument();
			expect(
				await screen.findByText(
					"Esta estrutura usa 16 de 150 reservadas. Depois de criar, sobram 134.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText("12 unidades + 3 halls de andar + 1 hall de entrada"),
			).toBeInTheDocument();
			expect(
				within(rangeRegion(1)).getByText(
					"12 unidades · 3 andares · finais 01, 02, 03 e 04",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText("Total: 12 unidades em 3 andares"),
			).toBeInTheDocument();
			const facade = screen.getByRole("list", { name: "Fachada da Torre A" });
			expect(within(facade).getByText("Térreo")).toBeInTheDocument();
			expect(within(facade).getByText("Hall de entrada")).toBeInTheDocument();
			expect(within(facade).getByText("304")).toBeInTheDocument();
			expect(within(facade).getAllByText("Hall")).toHaveLength(3);
		});

		test("refuses floors that are not whole numbers and clears each message once its field is edited", async () => {
			const { handler, sent } = wizardApi();
			open(handler);
			await describeTower("2.5", "01, 04", { first: "2a" });
			await user.click(await createButton());

			expect(
				await screen.findByText("Use um andar a partir do 1º."),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"O último andar precisa ser igual ou maior que o primeiro.",
				),
			).toBeInTheDocument();
			expect(rangeRegion(1)).toHaveClass(
				"shadow-[inset_0_0_0_1px_var(--destructive)]",
			);
			expect(sent).toHaveLength(0);

			await user.type(
				screen.getByRole("textbox", { name: "Primeiro andar" }),
				"9",
			);

			expect(
				screen.queryByText("Use um andar a partir do 1º."),
			).not.toBeInTheDocument();
			expect(
				screen.getByText(
					"O último andar precisa ser igual ou maior que o primeiro.",
				),
			).toBeInTheDocument();
		});

		test("renumbers the units when the numbering changes", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("2", "01, 02");
			const facade = await screen.findByRole("list", {
				name: "Fachada da Torre A",
			});
			expect(within(facade).getByText("202")).toBeInTheDocument();

			await user.click(screen.getByRole("radio", { name: "1A, 1B" }));

			expect(within(facade).getByText("2B")).toBeInTheDocument();
			expect(within(facade).queryByText("202")).not.toBeInTheDocument();
			const finals = screen.getByRole("textbox", { name: "Finais" });
			expect(finals).toHaveValue("A, B");
			expect(finals).toHaveAttribute("placeholder", "Ex.: A, B");
			expect(screen.getByText(/finais A e B$/)).toBeInTheDocument();

			await user.click(screen.getByRole("radio", { name: "101, 102" }));

			expect(finals).toHaveValue("01, 02");
			expect(within(facade).getByText("202")).toBeInTheDocument();
		});

		test("leaves the ground floor and the halls out when unchecked", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("2", "01, 02");

			await checkHall();
			expect(await screen.findByText(/^3 áreas comuns/)).toBeInTheDocument();

			await user.click(
				screen.getByRole("checkbox", { name: /Térreo sem unidades/ }),
			);
			await checkHall();

			expect(
				await screen.findByText("1 torre · 2 andares · 4 unidades"),
			).toBeInTheDocument();
			expect(screen.getByText(/^0 áreas comuns/)).toBeInTheDocument();
		});

		test("asks for each name and copies the previous tower with the next letter, without the hall (W1 with two towers)", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("12", "01, 04");
			await checkHall();

			await user.click(
				await screen.findByRole("button", { name: "Uma torre a mais" }),
			);

			const names = screen.getAllByRole("textbox", { name: "Nome" });
			expect(names.map((field) => (field as HTMLInputElement).value)).toEqual([
				"Torre A",
				"Torre B",
			]);
			expect(
				nth(screen.getAllByRole("textbox", { name: "Último andar" }), 1),
			).toHaveValue("12");
			expect(
				nth(screen.getAllByRole("textbox", { name: "Finais" }), 1),
			).toHaveValue("01, 04");
			expect(hallCheckbox(0)).toBeChecked();
			expect(hallCheckbox(1)).not.toBeChecked();
			expect(
				nth(
					screen.getAllByRole("checkbox", { name: "Térreo sem unidades" }),
					1,
				),
			).toBeChecked();
			expect(
				await screen.findByText("2 torres · 26 andares · 96 unidades"),
			).toBeInTheDocument();
			expect(
				screen.getByText("Torre A: 48 unidades em 12 andares"),
			).toBeInTheDocument();
			expect(
				screen.getByText("Torre B: 48 unidades em 12 andares"),
			).toBeInTheDocument();
			expect(screen.queryByText("Torre única")).not.toBeInTheDocument();
			expect(screen.queryByText(/Com uma torre só/)).not.toBeInTheDocument();
		});

		test("takes the areas of the project, of each tower and of one floor (W2)", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("12", "01, 04");
			await user.click(
				await screen.findByRole("button", { name: "Uma torre a mais" }),
			);

			await user.type(
				screen.getByRole("textbox", { name: "Área comum da obra" }),
				"Guarita{Enter}",
			);
			await user.type(
				screen.getByRole("textbox", { name: "Área comum de cada torre" }),
				"Salão de festas{Enter}",
			);
			await user.click(
				screen.getByRole("button", { name: "Área comum num andar" }),
			);
			await user.type(
				screen.getByRole("textbox", { name: "Nome da área comum" }),
				"Terraço",
			);
			await user.selectOptions(
				screen.getByRole("combobox", { name: "Torre" }),
				"Torre B",
			);
			await user.type(screen.getByRole("textbox", { name: "Andar" }), "12");
			await user.click(
				screen.getByRole("button", { name: "Adicionar ao andar" }),
			);

			expect(
				await screen.findByText("· Torre B, 12º andar"),
			).toBeInTheDocument();
			expect(screen.getByText(/^6 áreas comuns/)).toBeInTheDocument();
			const facade = screen.getByRole("list", { name: "Fachada da Torre B" });
			expect(within(facade).getByText("Terraço")).toBeInTheDocument();
			const projectAreas = screen.getByRole("button", {
				name: "Tirar Guarita",
			});
			await user.click(projectAreas);
			expect(screen.getByText(/^5 áreas comuns/)).toBeInTheDocument();
		});

		test("refuses an area that is already listed and a floor outside the tower", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("12", "01, 04");
			const field = await screen.findByRole("textbox", {
				name: "Área comum da obra",
			});
			await user.type(field, "Guarita{Enter}");

			await user.type(field, " guarita {Enter}");

			expect(
				screen.getByText("Essa área comum já está na lista."),
			).toBeInTheDocument();
			expect(screen.getAllByText("Guarita")).toHaveLength(1);

			await user.click(
				screen.getByRole("button", { name: "Área comum num andar" }),
			);
			await user.type(
				screen.getByRole("textbox", { name: "Nome da área comum" }),
				"Terraço",
			);
			await user.type(screen.getByRole("textbox", { name: "Andar" }), "13");
			await user.click(
				screen.getByRole("button", { name: "Adicionar ao andar" }),
			);

			expect(
				screen.getByText("O andar precisa estar entre o 1º e o 12º."),
			).toBeInTheDocument();
			expect(
				screen.queryByText(/· Torre A, 13º andar/),
			).not.toBeInTheDocument();
		});

		test("explains each missing field, scrolls to the first and focuses it, and sends nothing (W5)", async () => {
			const { handler, sent } = wizardApi();
			open(handler);
			await user.click(await createButton());

			expect(
				await screen.findByText("Informe o primeiro andar."),
			).toBeInTheDocument();
			expect(screen.getByText("Informe o último andar.")).toBeInTheDocument();
			expect(
				screen.getByText("Informe os finais desta faixa."),
			).toBeInTheDocument();
			expect(
				screen.queryByText("Separe os finais com vírgula e espaço."),
			).not.toBeInTheDocument();
			await waitFor(() => {
				expect(
					screen.getByRole("textbox", { name: "Primeiro andar" }),
				).toHaveFocus();
			});
			expect(
				screen.getByRole("textbox", { name: "Último andar" }),
			).toHaveAttribute("aria-invalid", "true");
			expect(
				screen.getByRole("textbox", { name: "Finais" }),
			).toHaveAccessibleDescription("Informe os finais desta faixa.");
			expect(sent).toHaveLength(0);
		});

		test("compares the last floor with the first and clears the message once it is fixed (W5)", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("3", "01, 04", { first: "5" });
			await user.click(await createButton());

			expect(
				await screen.findByText(
					"O último andar precisa ser igual ou maior que o primeiro.",
				),
			).toBeInTheDocument();

			await typeInto("Último andar", "8");

			expect(
				screen.queryByText(
					"O último andar precisa ser igual ou maior que o primeiro.",
				),
			).not.toBeInTheDocument();
		});

		test("asks for a name and refuses a repeated one with several towers (W5)", async () => {
			const { handler, sent } = wizardApi();
			open(handler);
			await describeTower("3", "01, 04");
			await user.click(
				await screen.findByRole("button", { name: "Uma torre a mais" }),
			);
			await typeInto("Nome", "", 1);
			await user.click(await createButton());

			expect(
				await screen.findByText("Informe o nome da torre."),
			).toBeInTheDocument();

			await typeInto("Nome", " torre  a ", 1);
			await user.click(await createButton());

			expect(
				await screen.findByText("Já existe outra torre com esse nome."),
			).toBeInTheDocument();
			expect(sent).toHaveLength(0);
		});

		test("flags a one-floor area left outside the tower's floors, focuses its row and sends nothing (W5)", async () => {
			const { handler, sent } = wizardApi();
			open(handler);
			await describeTower("20", "01, 04");
			await addFloorArea("Terraço", "20");
			await typeInto("Último andar", "15");

			await user.click(await createButton());

			const row = floorAreaRow("Terraço");
			expect(row).toHaveAccessibleDescription(
				"O andar precisa estar entre o 1º e o 15º.",
			);
			await waitFor(() => expect(row).toHaveFocus());
			expect(screen.getByText("· Torre A, 20º andar")).toBeInTheDocument();
			expect(sent).toHaveLength(0);

			await typeInto("Último andar", "20");

			expect(row).not.toHaveAccessibleDescription();
			await user.click(await createButton());

			await waitFor(() => expect(sent).toHaveLength(1));
			expect(
				sent[0]?.locations.filter((location) => location.name === "Terraço"),
			).toHaveLength(1);
		});

		test("clears the last floor's message once the first floor is fixed (W5)", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("3", "01, 04", { first: "5" });
			await user.click(await createButton());
			await screen.findByText(
				"O último andar precisa ser igual ou maior que o primeiro.",
			);

			await typeInto("Primeiro andar", "1");

			expect(
				screen.queryByText(
					"O último andar precisa ser igual ou maior que o primeiro.",
				),
			).not.toBeInTheDocument();
		});

		test("refuses a one-floor area that repeats a name on its floor or the hall", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("12", "01, 04");
			await checkHall();
			await addFloorArea("Terraço", "12");

			await user.click(
				screen.getByRole("button", { name: "Área comum num andar" }),
			);
			await user.type(
				screen.getByRole("textbox", { name: "Nome da área comum" }),
				" terraço",
			);
			await user.type(screen.getByRole("textbox", { name: "Andar" }), "12");
			await user.click(
				screen.getByRole("button", { name: "Adicionar ao andar" }),
			);

			expect(
				screen.getByText("Esse andar já tem uma área comum com esse nome."),
			).toBeInTheDocument();

			await typeInto("Nome da área comum", "Hall");
			await typeInto("Andar", "5");
			await user.click(
				screen.getByRole("button", { name: "Adicionar ao andar" }),
			);

			expect(
				screen.getByText("Esse andar já tem uma área comum com esse nome."),
			).toBeInTheDocument();
			expect(screen.getAllByText(/· Torre A, \d+º andar/)).toHaveLength(1);
		});

		test("keeps an open one-floor area form across the phone breakpoint", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("12", "01, 04");
			await user.click(
				screen.getByRole("button", { name: "Área comum num andar" }),
			);
			await user.type(
				screen.getByRole("textbox", { name: "Nome da área comum" }),
				"Terraço",
			);
			await user.type(screen.getByRole("textbox", { name: "Andar" }), "12");

			act(() => setViewport("phone"));
			expect(await screen.findByText("Passo 1 de 4")).toBeInTheDocument();
			act(() => setViewport("desktop"));

			expect(
				await screen.findByRole("textbox", { name: "Nome da área comum" }),
			).toHaveValue("Terraço");
			expect(screen.getByRole("textbox", { name: "Andar" })).toHaveValue("12");
			await user.click(
				screen.getByRole("button", { name: "Adicionar ao andar" }),
			);
			expect(
				await screen.findByText("· Torre A, 12º andar"),
			).toBeInTheDocument();
		});

		test("refuses a one-floor area while its tower's floors are not filled in", async () => {
			const { handler } = wizardApi();
			open(handler);
			await user.click(
				await screen.findByRole("button", { name: "Área comum num andar" }),
			);
			await user.type(
				screen.getByRole("textbox", { name: "Nome da área comum" }),
				"Terraço",
			);
			await user.type(screen.getByRole("textbox", { name: "Andar" }), "5");
			await user.click(
				screen.getByRole("button", { name: "Adicionar ao andar" }),
			);

			expect(
				screen.getByText("Confira os andares da torre primeiro."),
			).toBeInTheDocument();
			expect(screen.queryByText(/· Torre A, 5º andar/)).not.toBeInTheDocument();
		});

		test("adds towers past a dozen", async () => {
			const { handler } = wizardApi();
			open(handler);
			const more = await screen.findByRole("button", {
				name: "Uma torre a mais",
			});

			for (let count = 1; count < 13; count++) await user.click(more);

			expect(screen.getAllByRole("textbox", { name: "Nome" })).toHaveLength(13);
			expect(more).toBeEnabled();
		});

		test("shows Criando estrutura… and blocks a second send (W6)", async () => {
			const { handler, sent } = wizardApi({
				create: () => new Promise(() => {}),
			});
			open(handler);
			await describeTower("3", "01, 04");
			await user.click(await createButton());

			const sending = await screen.findByRole("button", {
				name: "Criando estrutura…",
			});
			expect(sending).toBeDisabled();
			await user.click(sending);
			expect(sent).toHaveLength(1);
		});

		test("keeps the draft as sent while the request runs and still opens the project when it succeeds (W6)", async () => {
			let succeed: () => void = () => {};
			const { handler, sent } = wizardApi({
				create: (body) =>
					new Promise((resolve) => {
						succeed = () => resolve(json({ counts: countsOf(body) }, 201));
					}),
			});
			const { router } = open(handler);
			await describeTower("3", "01, 04");
			await user.click(await createButton());
			await screen.findByRole("button", { name: "Criando estrutura…" });

			await user.type(
				screen.getByRole("textbox", { name: "Último andar" }),
				"9",
			);
			await checkHall();

			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"3",
			);
			expect(hallCheckbox()).not.toBeChecked();
			succeed();
			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
			expect(
				await screen.findByText("Estrutura criada: 1 torre e 12 unidades."),
			).toBeInTheDocument();
			expect(sent).toHaveLength(1);
		});

		test("locks all common-area controls while the request runs (W11)", async () => {
			let fail: () => void = () => {};
			const { handler } = wizardApi({
				create: () =>
					new Promise((resolve) => {
						fail = () => resolve(json({}, 500));
					}),
			});
			open(handler);
			await describeTower("3", "01, 04");
			await user.click(await createButton());
			await screen.findByRole("button", { name: "Criando estrutura…" });

			const projectArea = screen.getByRole("textbox", {
				name: "Área comum da obra",
			});
			expect(projectArea).toBeDisabled();
			expect(
				screen.getByRole("button", { name: "Área comum num andar" }),
			).toBeDisabled();
			fail();
			await screen.findByText("Não foi possível confirmar");
			expect(projectArea).toBeDisabled();
		});

		test("creates the plan in one request with parents before children, then opens the project with the toast (W10)", async () => {
			const { handler, sent } = wizardApi();
			const { router } = open(handler);
			await describeTower("3", "01, 04");
			await user.type(
				screen.getByRole("textbox", { name: "Área comum da obra" }),
				"Guarita{Enter}",
			);
			await user.click(await createButton());

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
			expect(sent).toHaveLength(1);
			const { locations } = sent[0] as CreateStructure;
			expect(locations).toHaveLength(1 + 4 + 12 + 1 + 1);
			const seen = new Set<string>();
			for (const location of locations) {
				expect(z.uuid().safeParse(location.id).success).toBe(true);
				if (location.parentId !== null)
					expect(seen.has(location.parentId)).toBe(true);
				seen.add(location.id);
			}
			expect(
				locations.filter((l) => l.type === "tower").map((l) => l.name),
			).toEqual(["Torre A"]);
			expect(
				locations.filter((l) => l.type === "floor").map((l) => l.name),
			).toEqual(["Térreo", "1º andar", "2º andar", "3º andar"]);
			expect(
				locations
					.filter((l) => l.type === "unit")
					.slice(0, 5)
					.map((l) => l.name),
			).toEqual(["101", "102", "103", "104", "201"]);
			expect(
				await screen.findByText("Estrutura criada: 1 torre e 12 unidades."),
			).toBeInTheDocument();
		});

		test("keeps the draft after a failure and resends the same ids (W7)", async () => {
			const { handler, sent } = wizardApi({
				create: (body, attempt) =>
					attempt === 1 ? json({}, 500) : json({ counts: countsOf(body) }, 201),
			});
			const { router } = open(handler);
			await describeTower("3", "01, 04");
			await user.click(await createButton());

			expect(
				await screen.findByText("Não foi possível confirmar"),
			).toBeInTheDocument();
			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"3",
			);
			expect(await createButton()).toBeDisabled();

			await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
			expect(sent).toHaveLength(2);
			expect(sent[1]).toEqual(sent[0]);
		});

		test("uses new ids once the draft has changed since a failure and drops the alert (W7)", async () => {
			const { handler, sent } = wizardApi({
				create: (_body, attempt) =>
					attempt === 1 ? json({}, 500) : new Promise(() => {}),
			});
			open(handler);
			await describeTower("3", "01, 04");
			await user.click(await createButton());
			await screen.findByText("Não foi possível confirmar");
			await user.click(screen.getByRole("button", { name: "Voltar a editar" }));
			await waitFor(() =>
				expect(
					screen.getByRole("textbox", { name: "Último andar" }),
				).toBeEnabled(),
			);

			await typeInto("Último andar", "4");

			expect(
				screen.queryByText("Não foi possível confirmar"),
			).not.toBeInTheDocument();
			await user.click(await createButton());
			await waitFor(() => expect(sent).toHaveLength(2));
			const ids = (body: CreateStructure | undefined) =>
				new Set(body?.locations.map((location) => location.id));
			const first = ids(sent[0]);
			expect([...ids(sent[1])].some((id) => first.has(id))).toBe(false);
		});

		test("shows the names that clash and keeps the draft (LOCATION_NAME_TAKEN)", async () => {
			const { handler } = wizardApi({
				create: () =>
					problem(409, LOCATION_NAME_TAKEN, { names: ["Torre A", "Guarita"] }),
			});
			open(handler);
			await describeTower("3", "01, 04");
			await user.click(await createButton());

			expect(
				await screen.findByText(
					"Já existe um local com os nomes “Torre A” e “Guarita”. Troque esses nomes e tente de novo.",
				),
			).toBeInTheDocument();
			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"3",
			);
			expect(screen.queryByText(/Nada foi salvo/)).not.toBeInTheDocument();
		});
	});

	describe("the floor ranges", () => {
		async function teamRequest() {
			await describeTower("10", "01, 02", { first: "2" });
			await user.click(screen.getByRole("button", { name: "Faixa" }));
			expect(
				within(rangeRegion(2)).getByRole("textbox", {
					name: "Primeiro andar",
				}),
			).toHaveValue("11");
			await typeInto("Último andar", "17", 1);
			await typeInto("Finais", "01", 1);
		}

		test("builds the team's tower from two ranges and sends exactly what the preview shows", async () => {
			const { handler, sent } = wizardApi();
			const { router } = open(handler);
			await teamRequest();

			expect(
				within(rangeRegion(1)).getByText(
					"18 unidades · 9 andares · finais 01 e 02",
				),
			).toBeInTheDocument();
			expect(
				within(rangeRegion(2)).getByText("7 unidades · 7 andares · final 01"),
			).toBeInTheDocument();
			expect(
				screen.getByText("Total: 25 unidades em 16 andares"),
			).toBeInTheDocument();
			const facade = screen.getByRole("list", { name: "Fachada da Torre A" });
			for (const name of ["201", "202", "1001", "1002", "1101", "1701"]) {
				expect(within(facade).getByText(name)).toBeInTheDocument();
			}
			expect(within(facade).queryByText("1102")).not.toBeInTheDocument();
			expect(within(facade).queryByText("1º")).not.toBeInTheDocument();
			const shown = within(facade)
				.getAllByTitle("Tipologia A")
				.map((unit) => unit.textContent);

			await user.click(await createButton());

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
			const units = (sent[0] as CreateStructure).locations
				.filter(({ type }) => type === "unit")
				.map(({ name }) => name);
			expect(units).toHaveLength(25);
			expect(units.toSorted()).toEqual(shown.toSorted());
			expect(units).not.toContain("1102");
		});

		test("takes a range out with its own button", async () => {
			const { handler } = wizardApi();
			open(handler);
			await teamRequest();

			await user.click(screen.getByRole("button", { name: "Tirar a faixa 1" }));

			expect(
				screen.queryByRole("region", { name: "Faixa 2" }),
			).not.toBeInTheDocument();
			expect(
				within(rangeRegion(1)).getByRole("textbox", { name: "Primeiro andar" }),
			).toHaveValue("11");
			expect(
				screen.queryByRole("button", { name: "Tirar a faixa 1" }),
			).not.toBeInTheDocument();
			expect(
				screen.getByText("Total: 7 unidades em 7 andares"),
			).toBeInTheDocument();
		});

		test("creates a floor without units, with the Hall when it is on", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("2", "01, 02");
			await user.click(screen.getByRole("button", { name: "Faixa" }));
			await typeInto("Último andar", "3", 1);
			const leisure = within(rangeRegion(2));

			await user.click(
				leisure.getByRole("checkbox", { name: "Andares sem unidades" }),
			);

			expect(
				leisure.getByRole("checkbox", { name: "Andares sem unidades" }),
			).toHaveAccessibleDescription("Só áreas comuns, como um andar de lazer.");
			expect(
				leisure.queryByRole("textbox", { name: "Finais" }),
			).not.toBeInTheDocument();
			expect(leisure.getByText("0 unidades · 1 andar")).toBeInTheDocument();
			expect(
				screen.getByText("Total: 4 unidades em 3 andares"),
			).toBeInTheDocument();

			await checkHall();

			const facade = screen.getByRole("list", { name: "Fachada da Torre A" });
			const third = within(facade).getByText("3º").closest("li");
			expect(third).toHaveTextContent("3ºHall");
			expect(
				screen.getByText("1 torre · 4 andares · 4 unidades"),
			).toBeInTheDocument();
		});

		test("asks for the finals of a range and keeps the tower out of the preview", async () => {
			const { handler, sent } = wizardApi();
			open(handler);
			await describeTower("4", "", { first: "2" });

			expect(
				screen.getByText("Complete as faixas desta torre para ver os andares."),
			).toBeInTheDocument();
			expect(
				screen.getByText("Total: 0 unidades em 0 andares"),
			).toBeInTheDocument();
			await user.click(await createButton());

			expect(
				await screen.findByText("Informe os finais desta faixa."),
			).toBeInTheDocument();
			expect(
				within(rangeRegion(1)).getByText(
					"Preencha a faixa para ver as unidades.",
				),
			).toBeInTheDocument();
			await waitFor(() => {
				expect(screen.getByRole("textbox", { name: "Finais" })).toHaveFocus();
			});
			expect(sent).toHaveLength(0);
		});

		test("names the range a floor is already in, leaves the tower out of the preview and the count and focuses it", async () => {
			const { handler, sent } = wizardApi({ units: balance(30) });
			open(handler);
			await teamRequest();

			await typeInto("Primeiro andar", "10", 1);

			const overlap =
				"O 10º andar já está na faixa 1. Cada andar fica numa faixa só.";
			expect(within(rangeRegion(2)).getByText(overlap)).toBeInTheDocument();
			expect(rangeRegion(2)).toHaveClass(
				"shadow-[inset_0_0_0_1px_var(--destructive)]",
			);
			expect(rangeRegion(1)).not.toHaveClass(
				"shadow-[inset_0_0_0_1px_var(--destructive)]",
			);
			expect(
				screen.getByText("Total: 0 unidades em 0 andares"),
			).toBeInTheDocument();
			expect(
				screen.getByText("Complete as faixas desta torre para ver os andares."),
			).toBeInTheDocument();
			expect(
				await screen.findByText(
					"Complete as faixas para ver quanto da reserva esta estrutura usa.",
				),
			).toBeInTheDocument();
			expect(
				screen.queryByText(/Faltam \d+ unidades na reserva/),
			).not.toBeInTheDocument();

			await user.click(await createButton());

			const first = within(rangeRegion(2)).getByRole("textbox", {
				name: "Primeiro andar",
			});
			await waitFor(() => expect(first).toHaveFocus());
			expect(first).toHaveAttribute("aria-invalid", "true");
			expect(first).toHaveAccessibleDescription(overlap);
			expect(sent).toHaveLength(0);
		});

		test("refuses letters for a range with more than 26 finals and changes nothing", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("3", "01, 02");
			await user.click(screen.getByRole("button", { name: "Faixa" }));
			await typeInto("Último andar", "5", 1);
			await typeInto("Finais", "01, 28", 1);

			await user.click(screen.getByRole("radio", { name: "1A, 1B" }));

			expect(
				screen.getByText(
					"A faixa 2 da Torre A tem 28 finais. Com letras, o máximo é 26, de A a Z.",
				),
			).toBeInTheDocument();
			expect(screen.getByRole("radio", { name: "101, 102" })).toBeChecked();
			expect(
				screen
					.getAllByRole("textbox", { name: "Finais" })
					.map((field) => (field as HTMLInputElement).value),
			).toEqual(["01, 02", "01, 28"]);
			expect(
				within(
					screen.getByRole("list", { name: "Fachada da Torre A" }),
				).getByText("528"),
			).toBeInTheDocument();
		});

		test("refuses letters for a range with a final past 26 and changes nothing", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("3", "01, 02");
			await user.click(screen.getByRole("button", { name: "Faixa" }));
			await typeInto("Último andar", "5", 1);
			await typeInto("Finais", "05, 30", 1);

			await user.click(screen.getByRole("radio", { name: "1A, 1B" }));

			expect(
				screen.getByText(
					"A faixa 2 da Torre A vai até o final 30. Com letras, o máximo é 26, de A a Z.",
				),
			).toBeInTheDocument();
			expect(screen.getByRole("radio", { name: "101, 102" })).toBeChecked();
			expect(
				screen
					.getAllByRole("textbox", { name: "Finais" })
					.map((field) => (field as HTMLInputElement).value),
			).toEqual(["01, 02", "05, 30"]);
			expect(
				within(
					screen.getByRole("list", { name: "Fachada da Torre A" }),
				).getByText("530"),
			).toBeInTheDocument();
		});

		test("explains finals that are not numbers or letters", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("3", "01, x");
			await user.click(await createButton());

			expect(
				await screen.findByText("Use números de 1 a 30, como 01, 02."),
			).toBeInTheDocument();

			await typeInto("Finais", "A, B");
			await user.click(screen.getByRole("radio", { name: "1A, 1B" }));
			await typeInto("Finais", "A, 1");
			await user.click(await createButton());

			expect(
				await screen.findByText("Use letras de A a Z, como A, B."),
			).toBeInTheDocument();
		});
	});

	describe("the typologies", () => {
		test("starts with one typology applied to every final and floor, and says how to use it (W3)", async () => {
			const { handler } = wizardApi();
			open(handler);

			expect(
				await screen.findByRole("heading", { level: 2, name: "Tipologias" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("textbox", { name: "Nome da tipologia" }),
			).toHaveValue("Tipologia A");
			expect(screen.getByText("0 cômodos")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Nova tipologia" }),
			).toBeInTheDocument();
			const rule = within(ruleGroup(1));
			expect(
				rule.getByRole("textbox", { name: "Finais da regra 1" }),
			).toHaveValue("todos");
			expect(
				rule.getByRole("textbox", { name: "Do andar da regra 1" }),
			).toHaveValue("");
			expect(
				rule.getByRole("textbox", { name: "Até o andar da regra 1" }),
			).toHaveValue("");
			expect(
				rule.getByRole("combobox", { name: "Tipologia da regra 1" }),
			).toHaveDisplayValue("Tipologia A");
			expect(
				rule.queryByRole("combobox", { name: /Torre/ }),
			).not.toBeInTheDocument();
			expect(
				screen.getByText(
					"Uma obra com todas as unidades iguais tem uma tipologia só, em todos os finais e andares. Unidade sem regra fica sem tipologia, e os cômodos dela se cadastram nela.",
				),
			).toBeInTheDocument();
		});

		test("lists the rooms of a typology, refuses a repeated one and takes one out (W3)", async () => {
			const { handler } = wizardApi();
			open(handler);
			const rooms = await screen.findByRole("combobox", {
				name: "Novo cômodo",
			});

			await user.type(rooms, "Sala{Enter}");
			await user.type(rooms, "Cozinha{Enter}");

			expect(screen.getByText("2 cômodos")).toBeInTheDocument();
			expect(rooms).toHaveValue("");
			await user.type(rooms, " sala {Enter}");
			expect(
				screen.getByText("Esse cômodo já está na tipologia."),
			).toBeInTheDocument();
			expect(screen.getByText("2 cômodos")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Tirar Sala" }));

			expect(screen.getByText("1 cômodo")).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Tirar Sala" }),
			).not.toBeInTheDocument();
		});

		test("adds a second typology and applies each by final, counting them in the preview (W3, W4)", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("2", "01, 04");

			await addTypology();
			await addRule();
			await typeInto("Finais da regra 1", "01, 03");
			await typeInto("Finais da regra 2", "02, 04");
			await user.selectOptions(
				screen.getByRole("combobox", { name: "Tipologia da regra 2" }),
				"Tipologia B",
			);

			expect(
				await screen.findByText(
					"1 área comum · Tipologia A: 4 · Tipologia B: 4",
				),
			).toBeInTheDocument();
			expect(
				screen.queryByText(/Os cômodos delas se cadastram/),
			).not.toBeInTheDocument();
			const facade = screen.getByRole("list", { name: "Fachada da Torre A" });
			expect(within(facade).getByText("101")).toHaveAttribute(
				"title",
				"Tipologia A",
			);
			expect(within(facade).getByText("102")).toHaveAttribute(
				"title",
				"Tipologia B",
			);
		});

		test("limits a rule to a range of floors and warns of the units it leaves without a typology (W4)", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("4", "01, 02");

			await typeInto("Do andar da regra 1", "2");
			await typeInto("Até o andar da regra 1", "3");

			expect(
				await screen.findByText(
					"4 unidades ficam sem tipologia. Os cômodos delas se cadastram em cada uma.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText("1 área comum · Tipologia A: 4 · Sem tipologia: 4"),
			).toBeInTheDocument();
			const facade = screen.getByRole("list", { name: "Fachada da Torre A" });
			expect(within(facade).getByText("101")).toHaveAttribute(
				"title",
				"Sem tipologia",
			);
			expect(within(facade).getByText("201")).toHaveAttribute(
				"title",
				"Tipologia A",
			);
		});

		test("warns in the singular for one unit and clears the warning when a rule covers it (W4)", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("1", "01, 02");

			await typeInto("Finais da regra 1", "1");

			expect(
				await screen.findByText(
					"1 unidade fica sem tipologia. Os cômodos delas se cadastram em cada uma.",
				),
			).toBeInTheDocument();

			await addRule();
			await typeInto("Finais da regra 2", "2");

			await waitFor(() => {
				expect(
					screen.queryByText(/Os cômodos delas se cadastram/),
				).not.toBeInTheDocument();
			});
		});

		test("takes a typology out together with the rules that point at it", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("1", "01, 02");

			await user.click(
				await screen.findByRole("button", { name: "Tirar Tipologia A" }),
			);

			expect(
				screen.queryByRole("group", { name: "Regra 1" }),
			).not.toBeInTheDocument();
			expect(
				await screen.findByText(
					"2 unidades ficam sem tipologia. Os cômodos delas se cadastram em cada uma.",
				),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("textbox", { name: "Nome da tipologia" }),
			).not.toBeInTheDocument();
		});

		test("copies the previous tower's rules to a new tower and offers the tower in each rule (W3)", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("2", "01, 02");

			await user.click(
				await screen.findByRole("button", { name: "Uma torre a mais" }),
			);

			expect(
				within(ruleGroup(1)).getByRole("combobox", {
					name: "Torre da regra 1",
				}),
			).toHaveDisplayValue("Torre A");
			expect(
				within(ruleGroup(2)).getByRole("combobox", {
					name: "Torre da regra 2",
				}),
			).toHaveDisplayValue("Torre B");
			expect(
				await screen.findByText(/^2 áreas comuns · Tipologia A: 8$/),
			).toBeInTheDocument();
		});

		test("sends the typologies with their rooms and the typology of each unit (W10)", async () => {
			const { handler, sent } = wizardApi();
			const { router } = open(handler);
			await describeTower("1", "01, 02");
			const rooms = await screen.findByRole("combobox", {
				name: "Novo cômodo",
			});
			await user.type(rooms, "Sala{Enter}");
			await user.type(rooms, "Cozinha{Enter}");
			await user.click(await createButton());

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
			const { typologies, locations } = sent[0] as CreateStructure;
			expect(typologies).toEqual([
				{
					id: expect.stringMatching(UUID),
					name: "Tipologia A",
					locationType: "unit",
					rooms: [
						{ id: expect.stringMatching(UUID), name: "Sala" },
						{ id: expect.stringMatching(UUID), name: "Cozinha" },
					],
				},
			]);
			const units = locations.filter((l) => l.type === "unit");
			expect(units).toHaveLength(2);
			expect(units.map((l) => l.typologyId)).toEqual([
				typologies[0]?.id,
				typologies[0]?.id,
			]);
			expect(
				locations
					.filter((l) => l.type !== "unit")
					.every((l) => l.typologyId === undefined),
			).toBe(true);
		});

		test("resends the same typology and room ids after a failure (W7)", async () => {
			const { handler, sent } = wizardApi({
				create: (body, attempt) =>
					attempt === 1 ? json({}, 500) : json({ counts: countsOf(body) }, 201),
			});
			open(handler);
			await describeTower("1", "01, 02");
			await user.type(
				await screen.findByRole("combobox", {
					name: "Novo cômodo",
				}),
				"Sala{Enter}",
			);
			await user.click(await createButton());
			await screen.findByText("Não foi possível confirmar");

			await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

			await waitFor(() => expect(sent).toHaveLength(2));
			expect(sent[1]).toEqual(sent[0]);
		});

		test("asks for the typology's name and explains finals that are not numbers, and focuses the first (W5)", async () => {
			const { handler, sent } = wizardApi();
			open(handler);
			await describeTower("2", "01, 04");
			await typeInto("Nome da tipologia", "");
			await typeInto("Finais da regra 1", "um");

			await user.click(await createButton());

			expect(
				await screen.findByText("Informe o nome da tipologia."),
			).toBeInTheDocument();
			expect(
				screen.getByText("Use números como 01, 03, ou escreva todos."),
			).toBeInTheDocument();
			await waitFor(() => {
				expect(
					screen.getByRole("textbox", { name: "Nome da tipologia" }),
				).toHaveFocus();
			});
			expect(sent).toHaveLength(0);
		});

		test("refuses a repeated typology name and a rule that ends before it starts (W5)", async () => {
			const { handler, sent } = wizardApi();
			open(handler);
			await describeTower("2", "01, 04");
			await addTypology();
			await typeInto("Nome da tipologia", " tipologia  a ", 1);
			await typeInto("Do andar da regra 1", "5");
			await typeInto("Até o andar da regra 1", "2");

			await user.click(await createButton());

			expect(
				await screen.findByText("Esse nome já existe nesta obra."),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"O andar final precisa ser igual ou maior que o inicial.",
				),
			).toBeInTheDocument();
			expect(sent).toHaveLength(0);

			await typeInto("Até o andar da regra 1", "7");
			expect(
				screen.queryByText(
					"O andar final precisa ser igual ou maior que o inicial.",
				),
			).not.toBeInTheDocument();
		});

		test("shows the typology names that clash and keeps the draft (TYPOLOGY_NAME_TAKEN)", async () => {
			const { handler } = wizardApi({
				create: () =>
					problem(409, TYPOLOGY_NAME_TAKEN, { names: ["Tipologia A"] }),
			});
			open(handler);
			await describeTower("3", "01, 04");
			await user.click(await createButton());

			expect(
				await screen.findByText("Esse nome já existe nesta obra."),
			).toBeInTheDocument();
			expect(
				screen.getByRole("textbox", { name: "Nome da tipologia" }),
			).toHaveValue("Tipologia A");
			expect(screen.queryByText(/Nada foi salvo/)).not.toBeInTheDocument();
		});
	});

	describe("the project's reservation", () => {
		test("tells a manager how much is missing, asks for more and disables the button (W10)", async () => {
			const { handler, sent } = wizardApi({
				summary: { ...OBRA, role: "manager" },
				units: balance(6),
			});
			open(handler);
			await describeTower("3", "01, 04");
			await checkHall();

			const alert = await screen.findByRole("alert");
			expect(alert).toHaveTextContent("Faltam 10 unidades na reserva");
			expect(alert).toHaveTextContent(
				"Esta estrutura usa 16 e a obra ainda tem 6. Peça mais ao admin da construtora.",
			);
			expect(
				screen.getByText("Esta estrutura usa 16 de 150 reservadas."),
			).toBeInTheDocument();
			expect(screen.queryByText(/Depois de criar/)).not.toBeInTheDocument();
			const button = await createButton();
			expect(button).toBeDisabled();
			expect(button).toHaveAccessibleDescription(
				/Faltam 10 unidades na reserva Esta estrutura usa\s16 e a obra ainda tem\s6\./,
			);
			expect(
				screen.queryByRole("button", { name: "Alterar reserva" }),
			).not.toBeInTheDocument();
			await user.click(button);
			expect(sent).toHaveLength(0);
		});

		test("counts the common areas of the plan against what remains, so nothing is sent that the server refuses (M1)", async () => {
			const { handler, sent } = wizardApi({
				summary: { ...OBRA, role: "manager" },
				units: balance(10),
			});
			open(handler);
			await describeTower("3", "01, 02");
			await checkHall();
			expect(
				await screen.findByText(
					"Esta estrutura usa 10 de 150 reservadas. Depois de criar, sobram 0.",
				),
			).toBeInTheDocument();
			expect(await createButton()).toBeEnabled();

			await addFloorArea("Terraço", "3");

			const button = await createButton();
			await waitFor(() => expect(button).toBeDisabled());
			expect(
				screen.getByText("Falta 1 unidade na reserva"),
			).toBeInTheDocument();
			expect(
				screen.getByText(/Esta estrutura usa 11 e a obra ainda tem 10\./),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"6 unidades + 3 halls de andar + 1 hall de entrada + 1 outra área comum",
				),
			).toBeInTheDocument();
			await user.click(button);
			expect(sent).toHaveLength(0);
		});

		test("tells an assistant the reservation is over when nothing is left", async () => {
			const { handler } = wizardApi({
				summary: { ...OBRA, role: "assistant" },
				units: balance(0),
			});
			open(handler);
			await describeTower("3", "01, 04");

			expect(
				await screen.findByText("Faltam 13 unidades na reserva"),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					/Esta estrutura usa 13 e a reserva da obra acabou\. Peça mais ao admin da construtora\./,
				),
			).toBeInTheDocument();
			expect(await createButton()).toBeDisabled();
		});

		test("adds up the whole structure against the reservation and what is left (W2)", async () => {
			const { handler } = wizardApi({ units: balance(400, 400) });
			open(handler);
			await describeTower("10", "01, 02", { first: "2" });
			await user.click(screen.getByRole("button", { name: "Faixa" }));
			await describeTower("17", "01", { first: "11", at: 1 });
			await checkHall();
			await user.click(
				screen.getByRole("button", { name: "Uma torre a mais" }),
			);
			await user.click(
				nth(screen.getAllByRole("button", { name: "Tirar a faixa 2" }), 1),
			);
			await typeInto("Finais", "01, 04", 2);
			for (const area of ["Garagem", "Salão de festas"]) {
				await user.type(
					screen.getByRole("textbox", { name: "Área comum da obra" }),
					`${area}{Enter}`,
				);
			}

			expect(
				await screen.findByText(
					"Esta estrutura usa 81 de 400 reservadas. Depois de criar, sobram 319.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"61 unidades + 16 halls de andar + 2 halls de entrada + 2 outras áreas comuns",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText("2 torres · 27 andares · 61 unidades"),
			).toBeInTheDocument();
		});

		test("says what is left in the singular", async () => {
			const { handler } = wizardApi({ units: balance(6) });
			open(handler);
			await describeTower("1", "01, 04");

			expect(
				await screen.findByText(
					"Esta estrutura usa 5 de 150 reservadas. Depois de criar, sobra 1.",
				),
			).toBeInTheDocument();
		});

		test("waits for complete ranges before counting the reservation", async () => {
			const { handler } = wizardApi({ units: balance(30) });
			open(handler);
			await describeTower("10", "01, 02", { first: "2" });
			await user.click(screen.getByRole("button", { name: "Faixa" }));
			await typeInto("Último andar", "17", 1);

			expect(
				await screen.findByText(
					"Complete as faixas para ver quanto da reserva esta estrutura usa.",
				),
			).toBeInTheDocument();
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
			expect(await createButton()).toBeEnabled();
		});

		test("offers the admin Alterar reserva over the wizard, keeps the draft and recomputes once saved (W10b)", async () => {
			const { handler, unitsReads } = wizardApi({
				summary: { ...OBRA, units: { reserved: 150, used: 144 } },
				units: balance(6),
			});
			const { router } = open(handler);
			await describeTower("3", "01, 04");

			expect(
				await screen.findByText("Faltam 7 unidades na reserva"),
			).toBeInTheDocument();
			expect(
				screen.getByText(/Esta estrutura usa 13 e a obra ainda tem 6\./),
			).toBeInTheDocument();
			expect(screen.queryByText(/Peça mais ao admin/)).not.toBeInTheDocument();
			expect(await createButton()).toBeDisabled();
			const readsBefore = unitsReads.length;
			await user.click(screen.getByRole("button", { name: "Alterar reserva" }));
			const dialog = await screen.findByRole("dialog", {
				name: "Alterar reserva",
			});
			const field = within(dialog).getByRole("textbox", {
				name: "Unidades reservadas",
			});
			await user.clear(field);
			await user.type(field, "160");
			await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

			expect(
				await screen.findByText(
					"Esta estrutura usa 13 de 160 reservadas. Depois de criar, sobram 3.",
				),
			).toBeInTheDocument();
			expect(unitsReads.length).toBeGreaterThan(readsBefore);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: "Alterar reserva" }),
				).not.toBeInTheDocument();
			});
			expect(screen.queryByText(/na reserva$/)).not.toBeInTheDocument();
			expect(await createButton()).toBeEnabled();
			await waitFor(async () => {
				expect(await createButton()).toHaveFocus();
			});
			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"3",
			);
			expect(router.state.location.pathname).toBe(WIZARD_PATH);
		});

		test("keeps an open Alterar reserva and its typed number across the phone breakpoint", async () => {
			const { handler } = wizardApi({
				summary: { ...OBRA, units: { reserved: 150, used: 144 } },
				units: balance(6),
			});
			open(handler);
			await describeTower("3", "01, 04");
			await user.click(
				await screen.findByRole("button", { name: "Alterar reserva" }),
			);
			const field = within(
				await screen.findByRole("dialog", { name: "Alterar reserva" }),
			).getByRole("textbox", { name: "Unidades reservadas" });
			await user.clear(field);
			await user.type(field, "155");

			act(() => setViewport("phone"));
			expect(await screen.findByText("Passo 1 de 4")).toBeInTheDocument();
			act(() => setViewport("desktop"));

			expect(
				within(
					await screen.findByRole("dialog", { name: "Alterar reserva" }),
				).getByRole("textbox", { name: "Unidades reservadas" }),
			).toHaveValue("155");
		});

		test("enables the button again once the plan fits", async () => {
			const { handler } = wizardApi({ units: balance(6) });
			open(handler);
			await describeTower("3", "01, 04");
			expect(await createButton()).toBeDisabled();

			await typeInto("Último andar", "1");

			expect(await createButton()).toBeEnabled();
			expect(
				screen.getByText(
					"Esta estrutura usa 5 de 150 reservadas. Depois de criar, sobra 1.",
				),
			).toBeInTheDocument();
			expect(screen.queryByText(/na reserva$/)).not.toBeInTheDocument();
		});

		test("shows the server's numbers when someone spent units meanwhile and keeps the draft", async () => {
			const { handler, sent, setUnits } = wizardApi({
				create: () => {
					setUnits(balance(5));
					return problem(409, NO_UNITS_LEFT, { requested: 13, available: 5 });
				},
			});
			open(handler);
			await describeTower("3", "01, 04");
			await screen.findByText(/Esta estrutura usa 13 de 150 reservadas/);
			await user.click(await createButton());

			expect(
				await screen.findByText("Faltam 8 unidades na reserva"),
			).toBeInTheDocument();
			expect(
				screen.getByText(/Esta estrutura usa 13 e a obra ainda tem 5\./),
			).toBeInTheDocument();
			expect(screen.queryByText(/Depois de criar/)).not.toBeInTheDocument();
			expect(await createButton()).toBeDisabled();
			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"3",
			);
			expect(screen.queryByText(/Nada foi salvo/)).not.toBeInTheDocument();
			expect(sent).toHaveLength(1);

			await typeInto("Último andar", "1");
			await typeInto("Finais", "01");

			expect(await createButton()).toBeEnabled();
		});

		test("shows the server's numbers when the units could not be read before", async () => {
			const { handler, sent } = wizardApi({
				unitsResponse: () => json({}, 500),
				create: () =>
					problem(409, NO_UNITS_LEFT, { requested: 13, available: 5 }),
			});
			open(handler);
			await describeTower("3", "01, 04");
			await user.click(await createButton());

			expect(
				await screen.findByText("Faltam 8 unidades na reserva"),
			).toBeInTheDocument();
			expect(
				screen.getByText(/Esta estrutura usa 13 e a obra ainda tem 5\./),
			).toBeInTheDocument();
			expect(await createButton()).toBeDisabled();
			expect(sent).toHaveLength(1);
		});

		test("checks nothing and still lets the server decide when the units cannot be read", async () => {
			const { handler, sent } = wizardApi({
				unitsResponse: () => json({}, 500),
			});
			open(handler);
			await describeTower("3", "01, 04");

			await waitFor(() => expect(sent).toHaveLength(0));
			expect(await createButton()).toBeEnabled();
			expect(screen.queryByText(/reservadas/)).not.toBeInTheDocument();
			await user.click(await createButton());
			await waitFor(() => expect(sent).toHaveLength(1));
		});

		test("blocks a plan with more than 5.000 locations", async () => {
			const { handler } = wizardApi({ units: balance(9000, 9000) });
			open(handler);
			for (const [name, value] of [
				["Primeiro andar", "1"],
				["Último andar", "200"],
				["Finais", "01, 30"],
			] as const) {
				fireEvent.change(await screen.findByRole("textbox", { name }), {
					target: { value },
				});
			}

			expect(
				await screen.findByText(
					"Esta estrutura tem 6.203 locais e o limite é 5.000 por vez. Reduza andares, unidades ou áreas comuns.",
				),
			).toBeInTheDocument();
			expect(await createButton()).toBeDisabled();
		});
	});

	describe("who may open it", () => {
		test("shows the lock line and the delivered block with the way back, and no wizard, on a delivered project (W15)", async () => {
			const { handler } = wizardApi({
				summary: { ...OBRA, status: "delivered", role: "manager" },
			});
			open(handler);

			expect(await screen.findByText(LOCKED)).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 1, name: "Montar estrutura" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "A obra foi entregue" }),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"A estrutura não pode mais ser alterada. Dá para conferir tudo na fachada e na configuração.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Voltar para a obra" }),
			).toHaveAttribute("href", `/projects/${OBRA.id}`);
			expect(
				screen.queryByRole("button", { name: "Criar estrutura" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("textbox", { name: "Primeiro andar" }),
			).not.toBeInTheDocument();
		});

		test("opens the project instead of the wizard when it already has a structure", async () => {
			const { handler, sent } = wizardApi({
				structure: structureOf([tower("Torre A")]),
			});
			const { router } = open(handler);

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
			expect(
				screen.queryByRole("heading", { level: 1, name: "Montar estrutura" }),
			).not.toBeInTheDocument();
			expect(sent).toHaveLength(0);
		});

		test("opens from the project home without waiting for the structure again", async () => {
			const { handler } = wizardApi();
			let structureHangs = false;
			open(
				combine(
					(url) =>
						structureHangs &&
						url.pathname === `/api/projects/${OBRA.id}/structure`
							? new Promise<Response>(() => {})
							: undefined,
					handler,
				),
				`/projects/${OBRA.id}`,
			);
			const start = await screen.findByRole("link", {
				name: "Montar estrutura",
			});
			structureHangs = true;
			await user.click(start);

			expect(
				await screen.findByRole("heading", {
					level: 1,
					name: "Montar estrutura",
				}),
			).toBeInTheDocument();
		});

		test("does not reopen the wizard with Back once the structure is created (W10)", async () => {
			const { handler, sent } = wizardApi();
			const { router } = open(handler, `/projects/${OBRA.id}`);
			await user.click(
				await screen.findByRole("link", { name: "Montar estrutura" }),
			);
			await describeTower("3", "01, 04");
			await user.click(await createButton());
			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});

			act(() => router.history.back());

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
			expect(
				await screen.findByRole("heading", { name: "Fachada" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { level: 1, name: "Montar estrutura" }),
			).not.toBeInTheDocument();
			expect(sent).toHaveLength(1);
		});

		test("shows the not found page for a project that is not visible", async () => {
			open(
				combine((url) =>
					url.pathname.startsWith("/api/projects/")
						? problem(404, PROJECT_NOT_FOUND)
						: undefined,
				),
			);

			expect(
				await screen.findByRole("heading", { name: "Obra não encontrada" }),
			).toBeInTheDocument();
		});

		test("shows the not found page for a malformed project id", async () => {
			const { handler } = wizardApi();
			open(handler, "/projects/xyz/structure/new");

			expect(
				await screen.findByRole("heading", { name: "Obra não encontrada" }),
			).toBeInTheDocument();
		});
	});

	describe("on the phone", () => {
		test("shows one step at a time with a bar to continue (W1, W2, W4)", async () => {
			setViewport("phone");
			const { handler } = wizardApi({ units: balance(150) });
			open(handler);

			expect(await screen.findByText("Passo 1 de 4")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "Torres e andares" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { level: 2, name: "Áreas comuns" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Voltar" }),
			).not.toBeInTheDocument();
			await describeTower("3", "01, 04");
			await checkHall();

			await user.click(
				screen.getByRole("button", { name: "Continuar · Áreas comuns" }),
			);

			expect(screen.getByText("Passo 2 de 4")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "Áreas comuns" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Voltar" }),
			).toBeInTheDocument();

			await user.click(
				screen.getByRole("button", { name: "Continuar · Tipologias" }),
			);

			expect(screen.getByText("Passo 3 de 4")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "Tipologias" }),
			).toBeInTheDocument();

			await user.click(
				screen.getByRole("button", { name: "Continuar · Prévia" }),
			);

			expect(screen.getByText("Passo 4 de 4")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "Prévia" }),
			).toBeInTheDocument();
			expect(
				screen.getByText("1 torre · 4 andares · 12 unidades"),
			).toBeInTheDocument();
			expect(
				await screen.findByText(
					"Esta estrutura usa 16 de 150 reservadas. Depois de criar, sobram 134.",
				),
			).toBeInTheDocument();
			expect(screen.getByText("Torre única")).toBeInTheDocument();
			expect(await createButton()).toBeEnabled();
			expect(
				screen.queryByRole("button", { name: /Continuar/ }),
			).not.toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Voltar" }));
			expect(screen.getByText("Passo 3 de 4")).toBeInTheDocument();
		});

		test("stays on the first step, shows the messages and focuses the first wrong field (W5)", async () => {
			setViewport("phone");
			const { handler } = wizardApi();
			open(handler);
			await describeTower("", "01, 04");
			await user.click(
				await screen.findByRole("button", { name: "Continuar · Áreas comuns" }),
			);

			expect(await screen.findByText("Passo 1 de 4")).toBeInTheDocument();
			expect(screen.getByText("Informe o último andar.")).toBeInTheDocument();
			await waitFor(() => {
				expect(
					screen.getByRole("textbox", { name: "Último andar" }),
				).toHaveFocus();
			});
		});

		test("goes to the common areas step and focuses a one-floor area left outside the tower (W5)", async () => {
			setViewport("phone");
			const { handler, sent } = wizardApi();
			open(handler);
			await describeTower("20", "01, 04");
			await user.click(
				screen.getByRole("button", { name: "Continuar · Áreas comuns" }),
			);
			await addFloorArea("Terraço", "20");
			await user.click(screen.getByRole("button", { name: "Voltar" }));
			await typeInto("Último andar", "15");

			await user.click(
				screen.getByRole("button", { name: "Continuar · Áreas comuns" }),
			);

			expect(await screen.findByText("Passo 2 de 4")).toBeInTheDocument();
			const row = floorAreaRow("Terraço");
			expect(row).toHaveAccessibleDescription(
				"O andar precisa estar entre o 1º e o 15º.",
			);
			await waitFor(() => expect(row).toHaveFocus());
			expect(sent).toHaveLength(0);
		});

		test("puts the over-reservation alert beside the disabled button in the bar (W10)", async () => {
			setViewport("phone");
			const { handler } = wizardApi({
				summary: { ...OBRA, role: "assistant" },
				units: balance(6),
			});
			open(handler);
			await describeTower("3", "01, 04");
			await toPreviewOnPhone();

			const button = await createButton();
			expect(button).toBeDisabled();
			const alert = await screen.findByRole("alert");
			expect(alert).toHaveTextContent("Faltam 7 unidades na reserva");
			expect(alert).toHaveTextContent(
				"Esta estrutura usa 13 e a obra ainda tem 6. Peça mais ao admin da construtora.",
			);
			expect(button).toHaveAccessibleDescription(
				/Faltam 7 unidades na reserva Esta estrutura usa\s13 e a obra ainda tem\s6\./,
			);
			expect(
				within(alert.parentElement as HTMLElement).getByRole("button", {
					name: "Criar estrutura",
				}),
			).toBe(button);
			expect(
				screen.getByText("Esta estrutura usa 13 de 150 reservadas."),
			).toBeInTheDocument();
		});

		test("creates from the preview and opens the project with the toast (W10)", async () => {
			setViewport("phone");
			const { handler, sent } = wizardApi();
			const { router } = open(handler);
			await describeTower("3", "01, 04");
			await toPreviewOnPhone();
			await user.click(await createButton());

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
			expect(sent).toHaveLength(1);
			expect(
				await screen.findByText("Estrutura criada: 1 torre e 12 unidades."),
			).toBeInTheDocument();
		});

		test("keeps the draft and the step after a failure (W7)", async () => {
			setViewport("phone");
			const { handler } = wizardApi({ create: () => json({}, 500) });
			open(handler);
			await describeTower("3", "01, 04");
			await toPreviewOnPhone();
			await user.click(await createButton());

			expect(
				await screen.findByText("Não foi possível confirmar"),
			).toBeInTheDocument();
			expect(screen.getByText("Passo 4 de 4")).toBeInTheDocument();
			expect(await createButton()).toBeDisabled();
		});
		test("shows each rule as a card with its own labels (W3)", async () => {
			setViewport("phone");
			const { handler } = wizardApi();
			open(handler);
			await describeTower("3", "01, 04");

			await toTypologiesOnPhone();

			expect(screen.getByText("Passo 3 de 4")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "Tipologias" }),
			).toBeInTheDocument();
			const rule = within(ruleGroup(1));
			expect(
				rule.getByRole("combobox", { name: "Tipologia" }),
			).toHaveDisplayValue("Tipologia A");
			expect(rule.getByRole("textbox", { name: "Finais" })).toHaveValue(
				"todos",
			);
			expect(rule.getByRole("textbox", { name: "Do andar" })).toHaveValue("");
			expect(rule.getByRole("textbox", { name: "Até o andar" })).toHaveValue(
				"",
			);
			expect(
				screen.getByRole("button", { name: "Continuar · Prévia" }),
			).toBeInTheDocument();
		});

		test("counts the units of each typology and warns of the ones without in the preview (W4)", async () => {
			setViewport("phone");
			const { handler } = wizardApi();
			open(handler);
			await describeTower("2", "01, 04");
			await toTypologiesOnPhone();
			await typeInto("Finais", "01, 03");

			await user.click(
				screen.getByRole("button", { name: "Continuar · Prévia" }),
			);

			expect(screen.getByText("Passo 4 de 4")).toBeInTheDocument();
			expect(
				screen.getByText("1 área comum · Tipologia A: 4 · Sem tipologia: 4"),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"4 unidades ficam sem tipologia. Os cômodos delas se cadastram em cada uma.",
				),
			).toBeInTheDocument();
		});

		test("goes back to the typologies step and focuses a wrong rule field (W5)", async () => {
			setViewport("phone");
			const { handler, sent } = wizardApi();
			open(handler);
			await describeTower("2", "01, 04");
			await toTypologiesOnPhone();
			await typeInto("Finais", "um");
			await user.click(
				screen.getByRole("button", { name: "Continuar · Prévia" }),
			);
			await user.click(await createButton());

			expect(await screen.findByText("Passo 3 de 4")).toBeInTheDocument();
			expect(
				screen.getByText("Use números como 01, 03, ou escreva todos."),
			).toBeInTheDocument();
			await waitFor(() => {
				expect(screen.getByRole("textbox", { name: "Finais" })).toHaveFocus();
			});
			expect(sent).toHaveLength(0);
		});
	});
});
