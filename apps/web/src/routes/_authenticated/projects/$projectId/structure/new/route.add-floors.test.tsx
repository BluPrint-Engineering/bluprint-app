import {
	type CreateStructure,
	LOCATION_NAME_TAKEN,
	NO_UNITS_LEFT,
	type ProjectSummary,
	type Structure,
	type StructureFloor,
	type StructureTower,
} from "@bluprint/shared";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { structureDraftKey } from "@/features/structure";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import {
	combine,
	floor,
	structureOf,
	tower,
	typologiesApi,
	typologyOf,
	writableApi,
} from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const user = userEvent.setup({ delay: null });

const OBRA: ProjectSummary = { ...project(7), name: "Casa Moinhos" };
const LOCKED = "A obra foi entregue: a estrutura não pode mais ser alterada.";

const typeA = typologyOf("Tipologia A", ["Sala", "Quarto"]);
const typeB = typologyOf("Tipologia B", ["Sala"]);

function typedFloors(
	from: number,
	to: number,
	typeNames: string[],
): StructureFloor[] {
	return Array.from({ length: to - from + 1 }, (_, at) => {
		const number = from + at;
		return floor(
			`${number}º andar`,
			typeNames.map((typology, unit) => ({
				name: `${number}${String(unit + 1).padStart(2, "0")}`,
				typology,
			})),
			["Hall"],
		);
	});
}

function scenario(
	options: {
		summary?: ProjectSummary;
		reserved?: number;
		remaining?: number;
		several?: boolean;
		towerB?: StructureTower;
		create?: Parameters<typeof writableApi>[2] extends infer O
			? O extends { create?: infer C }
				? C
				: never
			: never;
	} = {},
) {
	const towerA = tower("Torre A", typedFloors(1, 2, ["Tipologia A"]));
	const towerB =
		options.towerB ??
		tower("Torre B", [
			floor("Térreo", [], ["Hall de entrada"]),
			...typedFloors(1, 10, [
				"Tipologia A",
				"Tipologia B",
				"Tipologia A",
				"Tipologia B",
			]),
		]);
	const structure: Structure = structureOf(
		options.several === false ? [towerB] : [towerA, towerB],
	);
	const summary: ProjectSummary = {
		...(options.summary ?? OBRA),
		units: { reserved: options.reserved ?? 100, used: 0 },
	};
	const api = writableApi(summary, structure, {
		remaining: options.remaining ?? 12,
		...(options.create && { create: options.create }),
	});
	const handler = combine(
		typologiesApi(summary.id, { typologies: [typeA, typeB] }),
		api.handler,
	);
	return { ...api, handler, towerB, structure };
}

const pathFor = (towerId: string, projectId = OBRA.id) =>
	`/projects/${projectId}/structure/new?tower=${towerId}`;

function open(handler: ReturnType<typeof scenario>["handler"], path: string) {
	const stub = stubApi(signedIn, { api: handler });
	return { ...renderAt(path), ...stub };
}

async function typeInto(name: string, value: string) {
	const field = await screen.findByRole("textbox", { name });
	await user.clear(field);
	if (value) await user.type(field, value);
}

const addButton = () =>
	screen.findByRole("button", {
		name: /^(Adicionar \d+ andares?|Adicionar andares|Adicionando andares…)$/,
	});

async function toPreviewOnPhone() {
	await user.click(
		await screen.findByRole("button", { name: "Continuar · Tipologias" }),
	);
	await user.click(
		await screen.findByRole("button", { name: "Continuar · Prévia" }),
	);
}

describe("adding floors to a tower (W9)", () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
		toast.dismiss();
	});

	describe("on the desktop", () => {
		test("keeps a tower's draft out of another tower and out of setting up", async () => {
			const { handler, towerB, structure } = scenario();
			const towerA = nth(structure.towers, 0);
			const keyB = structureDraftKey(signedIn.user.id, OBRA.id, towerB.id);
			const setUpKey = structureDraftKey(signedIn.user.id, OBRA.id);
			open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "14");
			cleanup();

			open(handler, pathFor(towerA.id));

			expect(
				await screen.findByRole("heading", {
					level: 1,
					name: "Adicionar andares à Torre A",
				}),
			).toBeInTheDocument();
			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"",
			);
			expect(screen.queryByText("Rascunho restaurado")).not.toBeInTheDocument();
			cleanup();
			localStorage.setItem(setUpKey, localStorage.getItem(keyB) ?? "");
			localStorage.removeItem(keyB);

			open(handler, pathFor(towerB.id));

			expect(
				await screen.findByRole("heading", {
					level: 1,
					name: "Adicionar andares à Torre B",
				}),
			).toBeInTheDocument();
			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"",
			);
			expect(screen.queryByText("Rascunho restaurado")).not.toBeInTheDocument();
			expect(localStorage.getItem(setUpKey)).not.toBeNull();
		});

		test("drops the draft with a notice when its tower no longer exists", async () => {
			const { handler, towerB } = scenario();
			const gone = "0199a1f4-3c2e-7d5a-9b1e-000000000099";
			const goneKey = structureDraftKey(signedIn.user.id, OBRA.id, gone);
			open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "14");
			cleanup();
			localStorage.setItem(
				goneKey,
				localStorage.getItem(
					structureDraftKey(signedIn.user.id, OBRA.id, towerB.id),
				) ?? "",
			);

			const { router } = open(handler, pathFor(gone));

			await waitFor(() =>
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`),
			);
			expect(
				await screen.findByText(
					"A torre não existe mais. O rascunho foi descartado.",
				),
			).toBeInTheDocument();
			expect(localStorage.getItem(goneKey)).toBeNull();
		});

		test("starts after the floors another tab added when the stale tab loads the latest version", async () => {
			const { handler, towerB, created } = scenario();
			open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "14");
			const key = structureDraftKey(signedIn.user.id, OBRA.id, towerB.id);
			towerB.floors.push(
				...typedFloors(11, 12, [
					"Tipologia A",
					"Tipologia B",
					"Tipologia A",
					"Tipologia B",
				]),
			);
			localStorage.removeItem(key);
			act(() =>
				window.dispatchEvent(
					new StorageEvent("storage", { key, newValue: null }),
				),
			);
			await screen.findByText("Este rascunho mudou em outra aba");

			await user.click(
				screen.getByRole("button", { name: "Carregar a versão mais recente" }),
			);

			await waitFor(() =>
				expect(screen.getByRole("textbox", { name: "Do andar" })).toHaveValue(
					"13",
				),
			);
			expect(screen.getByRole("textbox", { name: "Do andar" })).toBeEnabled();
			expect(created).toHaveLength(0);
		});

		test("opens the band, the tower's fields and nothing for a new tower (W9)", async () => {
			const { handler, towerB } = scenario();
			open(handler, pathFor(towerB.id));

			expect(
				await screen.findByRole("heading", {
					level: 1,
					name: "Adicionar andares à Torre B",
				}),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"A Torre B tem hoje do 1º ao 10º andar. Use andares que ela ainda não tem.",
				),
			).toBeInTheDocument();
			expect(screen.getByRole("link", { name: "Torre B" })).toHaveAttribute(
				"href",
				`/projects/${OBRA.id}/locations/${towerB.id}`,
			);
			for (const name of ["Novos andares", "Tipologias", "Prévia"]) {
				expect(
					screen.getByRole("heading", { level: 2, name }),
				).toBeInTheDocument();
			}
			expect(
				screen.queryByRole("heading", { level: 2, name: "Áreas comuns" }),
			).not.toBeInTheDocument();
			expect(
				screen.getByText(
					"Os andares novos entram na Torre B pela ordem do número, com as suas faixas e finais.",
				),
			).toBeInTheDocument();
			expect(screen.getByRole("textbox", { name: "Do andar" })).toHaveValue(
				"11",
			);
			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"",
			);
			expect(screen.getByRole("textbox", { name: "Finais" })).toHaveValue("");
			expect(
				screen.getByText("Preencha a faixa para ver as unidades."),
			).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Faixa" })).toBeInTheDocument();
			expect(
				screen.getByRole("checkbox", { name: "Andares sem unidades" }),
			).not.toBeChecked();
			expect(
				screen.getByRole("checkbox", { name: "Hall em cada andar" }),
			).toBeChecked();
			expect(
				screen.getByText(
					"Repete a escolha da Torre B. Desmarque para não criar os halls só nesta adição.",
				),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("checkbox", { name: /Térreo sem unidades/ }),
			).not.toBeInTheDocument();
			expect(screen.queryByText("Quantas torres?")).not.toBeInTheDocument();
			expect(
				screen.queryByText("Numeração das unidades"),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("textbox", { name: "Área comum da obra" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("textbox", { name: "Área comum de cada torre" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Área comum num andar" }),
			).not.toBeInTheDocument();
		});

		test("shows the tipologias the project already has as they are, and mirrors the finals of the last floor", async () => {
			const { handler, towerB } = scenario();
			open(handler, pathFor(towerB.id));
			await screen.findByRole("heading", { level: 1 });

			const cards = screen.getAllByText(/^Tipologia [AB]$/, {
				selector: "span.font-semibold",
			});
			expect(cards.map((card) => card.textContent)).toEqual([
				"Tipologia A",
				"Tipologia B",
			]);
			expect(
				screen.queryByRole("textbox", { name: "Nome da tipologia" }),
			).not.toBeInTheDocument();
			expect(screen.getByText("Quarto")).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Tirar Quarto" }),
			).not.toBeInTheDocument();
			expect(
				screen.getAllByText(
					"Já existe na obra. Os cômodos mudam na Configuração.",
				),
			).toHaveLength(2);
			expect(
				screen.getByRole("button", { name: "Copiar Tipologia A" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Tirar Tipologia A" }),
			).not.toBeInTheDocument();
			const first = within(screen.getByRole("group", { name: "Regra 1" }));
			expect(first.getByRole("textbox", { name: /^Finais/ })).toHaveValue(
				"01, 03",
			);
			expect(first.getByRole("combobox")).toHaveValue(typeA.id);
			const second = within(screen.getByRole("group", { name: "Regra 2" }));
			expect(second.getByRole("textbox", { name: /^Finais/ })).toHaveValue(
				"02, 04",
			);
		});

		test("counts what the new floors use and what is left, marking the new floors in the preview (W9)", async () => {
			const { handler, towerB } = scenario({ remaining: 12 });
			open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "12");
			await typeInto("Finais", "01, 04");

			expect(
				await screen.findByText("Torre B ganha 2 andares e 8 unidades"),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"Estes andares usam 10 das 12 que restam na reserva. Depois de adicionar, sobram 2.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText("8 unidades + 2 halls de andar"),
			).toBeInTheDocument();
			expect(
				screen.getByText("8 unidades · 2 andares · finais 01, 02, 03 e 04"),
			).toBeInTheDocument();
			expect(
				screen.getByText("2 áreas comuns · Tipologia A: 4 · Tipologia B: 4"),
			).toBeInTheDocument();
			const facade = screen.getByRole("list", { name: "Fachada da Torre B" });
			const floors = within(facade).getAllByRole("listitem");
			expect(floors.map((item) => item.firstChild?.textContent)).toEqual([
				"12º",
				"11º",
			]);
			expect(within(facade).getByText("1104").className).toMatch(
				/border-dashed/,
			);
			expect(
				await screen.findByRole("button", { name: "Adicionar 2 andares" }),
			).toBeEnabled();
			expect(
				screen.getByText(
					"Nada é salvo antes de adicionar. Depois, tudo se ajusta na fachada e na configuração. O rascunho fica guardado até lá, mesmo se a página for atualizada.",
				),
			).toBeInTheDocument();
		});

		test("refuses floors above what remains and disables the button (W9b)", async () => {
			const { handler, towerB, created } = scenario({
				summary: { ...OBRA, role: "manager" },
				remaining: 6,
			});
			open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "12");
			await typeInto("Finais", "01, 04");

			expect(
				await screen.findByText("Faltam 4 unidades na reserva"),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					/Estes andares usam 10 e a obra ainda tem 6\. Peça mais ao admin da construtora\./,
				),
			).toBeInTheDocument();
			expect(
				screen.getByText("Estes andares usam 10 de 100 reservadas."),
			).toBeInTheDocument();
			expect(screen.queryByText(/Depois de adicionar/)).not.toBeInTheDocument();
			const button = await addButton();
			expect(button).toBeDisabled();
			await user.click(button);
			expect(created).toHaveLength(0);
		});

		test("sends the new floors under the existing tower with the existing tipologias, then opens the tower with the toast (W10)", async () => {
			const { handler, towerB, created } = scenario({ remaining: 12 });
			const { router } = open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "12");
			await typeInto("Finais", "01, 04");
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 2 andares" }),
			);

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(
					`/projects/${OBRA.id}/locations/${towerB.id}`,
				);
			});
			expect(created).toHaveLength(1);
			const body = nth(created, 0) as CreateStructure;
			expect(body.typologies).toEqual([]);
			expect(
				body.locations
					.filter(({ type }) => type === "floor")
					.map(({ name, parentId, position }) => [name, parentId, position]),
			).toEqual([
				["11º andar", towerB.id, 11],
				["12º andar", towerB.id, 12],
			]);
			expect(
				body.locations
					.filter(({ type }) => type === "unit")
					.map(({ name, typologyId }) => [name, typologyId]),
			).toEqual([
				["1101", typeA.id],
				["1102", typeB.id],
				["1103", typeA.id],
				["1104", typeB.id],
				["1201", typeA.id],
				["1202", typeB.id],
				["1203", typeA.id],
				["1204", typeB.id],
			]);
			expect(body.locations.some(({ type }) => type === "tower")).toBe(false);
			expect(
				await screen.findByText("2 andares adicionados à Torre B."),
			).toBeInTheDocument();
			expect(
				await screen.findByRole("list", { name: "Fachada da Torre B" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "12º andar" }),
			).toBeInTheDocument();
		});

		test("drops the halls of this addition without changing the tower's own choice", async () => {
			const { handler, towerB, created } = scenario({ remaining: 12 });
			open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "12");
			await typeInto("Finais", "01");
			expect(
				await screen.findByText(
					"Estes andares usam 4 das 12 que restam na reserva. Depois de adicionar, sobram 8.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText("2 unidades + 2 halls de andar"),
			).toBeInTheDocument();

			await user.click(
				screen.getByRole("checkbox", { name: "Hall em cada andar" }),
			);
			expect(
				await screen.findByText(
					"Estes andares usam 2 das 12 que restam na reserva. Depois de adicionar, sobram 10.",
				),
			).toBeInTheDocument();
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 2 andares" }),
			);

			await waitFor(() => expect(created).toHaveLength(1));
			const body = nth(created, 0) as CreateStructure;
			expect(body.locations.some(({ name }) => name === "Hall")).toBe(false);
			expect(
				towerB.floors
					.find((one) => one.name === "10º andar")
					?.commonAreas.some((area) => area.name === "Hall"),
			).toBe(true);
		});

		test("creates a floor with no units when the range says so", async () => {
			const { handler, towerB, created } = scenario({ remaining: 12 });
			open(handler, pathFor(towerB.id));
			await user.click(
				await screen.findByRole("checkbox", { name: "Andares sem unidades" }),
			);
			await typeInto("Último andar", "11");
			expect(screen.getByText("0 unidades · 1 andar")).toBeInTheDocument();
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 1 andar" }),
			);

			await waitFor(() => expect(created).toHaveLength(1));
			const body = nth(created, 0) as CreateStructure;
			expect(body.locations.filter(({ type }) => type === "unit")).toEqual([]);
			expect(
				body.locations
					.filter(({ type }) => type === "floor")
					.map(({ name }) => name),
			).toEqual(["11º andar"]);
		});

		test("validates against the tower read again, not against what the draft stored", async () => {
			const { handler, towerB, created } = scenario({ remaining: 20 });
			const { queryClient } = open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "12");
			await typeInto("Finais", "01");
			towerB.floors.push(floor("11º andar", ["1101"], ["Hall"], 11));
			await queryClient.invalidateQueries({ queryKey: ["structure", OBRA.id] });

			expect(
				await screen.findByText("A Torre B já tem o 11º andar."),
			).toBeInTheDocument();
			await user.click(await addButton());
			expect(created).toHaveLength(0);
		});

		test("refuses floors the tower already has before sending anything", async () => {
			const { handler, towerB, created } = scenario({ remaining: 20 });
			open(handler, pathFor(towerB.id));
			await typeInto("Do andar", "9");
			await typeInto("Último andar", "12");
			await typeInto("Finais", "01");
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 4 andares" }),
			);

			expect(
				await screen.findByText("A Torre B já tem o 9º andar."),
			).toBeInTheDocument();
			expect(created).toHaveLength(0);
			expect(screen.getByRole("textbox", { name: "Do andar" })).toHaveFocus();
		});

		test("continues past a renamed top floor", async () => {
			const withCobertura = tower("Torre B", [
				...typedFloors(1, 3, ["Tipologia A"]),
				floor("Cobertura", [{ name: "401", typology: "Tipologia A" }]),
			]);
			const { handler } = scenario({ towerB: withCobertura });
			open(handler, pathFor(withCobertura.id));
			expect(
				await screen.findByRole("textbox", { name: "Do andar" }),
			).toHaveValue("4");
		});

		test("refuses floors whose units a renamed top floor already has before sending anything", async () => {
			const withCobertura = tower("Torre B", [
				...typedFloors(1, 12, ["Tipologia A", "Tipologia A"]),
				floor("Cobertura", [
					{ name: "1301", typology: "Tipologia A" },
					{ name: "1302", typology: "Tipologia A" },
				]),
			]);
			const { handler, created } = scenario({ towerB: withCobertura });
			open(handler, pathFor(withCobertura.id));
			expect(
				await screen.findByRole("textbox", { name: "Do andar" }),
			).toHaveValue("13");
			await typeInto("Último andar", "14");
			await typeInto("Finais", "01");
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 2 andares" }),
			);

			expect(
				await screen.findByText(
					"A Torre B já tem a unidade 1301. Use outro andar ou outros finais.",
				),
			).toBeInTheDocument();
			expect(created).toHaveLength(0);
			expect(screen.getByRole("textbox", { name: "Do andar" })).toHaveFocus();
		});

		test("starts a tower without floors at the 1º", async () => {
			const empty = tower("Torre B");
			const { handler } = scenario({ towerB: empty });
			open(handler, pathFor(empty.id));

			expect(
				await screen.findByRole("textbox", { name: "Do andar" }),
			).toHaveValue("1");
			expect(
				screen.getByText("A Torre B ainda não tem andares."),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"Os andares novos entram na Torre B pela ordem do número, com as suas faixas e finais.",
				),
			).toBeInTheDocument();
			expect(screen.getByRole("textbox", { name: "Finais" })).toHaveValue("");
		});

		test("shows the server's refusal when a name is taken and keeps the draft", async () => {
			const { handler, towerB } = scenario({
				create: () =>
					json(
						{
							type: "about:blank",
							title: "Conflict",
							status: 409,
							code: LOCATION_NAME_TAKEN,
							names: ["11º andar"],
						},
						409,
					),
			});
			open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "12");
			await typeInto("Finais", "01");
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 2 andares" }),
			);

			expect(
				await screen.findByText(/Já existe um local com o nome “11º andar”/),
			).toBeInTheDocument();
			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"12",
			);
		});

		test("takes the server's numbers when someone spent the units first (W7b)", async () => {
			const refused: ReturnType<typeof scenario> = scenario({
				summary: { ...OBRA, role: "manager" },
				create: () => {
					refused.state.units.remaining = 6;
					return json(
						{
							type: "about:blank",
							title: "Conflict",
							status: 409,
							code: NO_UNITS_LEFT,
							requested: 10,
							available: 6,
						},
						409,
					);
				},
			});
			open(refused.handler, pathFor(refused.towerB.id));
			await typeInto("Último andar", "12");
			await typeInto("Finais", "01, 04");
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 2 andares" }),
			);

			expect(
				await screen.findByText("Faltam 4 unidades na reserva"),
			).toBeInTheDocument();
			expect(
				screen.getByText(/Estes andares usam 10 e a obra ainda tem 6\./),
			).toBeInTheDocument();
			expect(await addButton()).toBeDisabled();
		});

		test.each([
			[
				319,
				"Estes andares usam 4 das 319 que restam na reserva. Depois de adicionar, sobram 315.",
				undefined,
			],
			[
				2,
				"Estes andares usam 4 de 400 reservadas.",
				"Estes andares usam 4 e a obra ainda tem 2.",
			],
			[
				0,
				"Estes andares usam 4 de 400 reservadas.",
				"Estes andares usam 4 e a reserva da obra acabou.",
			],
		])(
			"counts units and floor halls against %i left in the reservation",
			async (remaining, line, missing) => {
				const { handler, towerB } = scenario({
					summary: { ...OBRA, role: "manager" },
					reserved: 400,
					remaining,
				});
				open(handler, pathFor(towerB.id));
				await typeInto("Último andar", "12");
				await typeInto("Finais", "01");

				expect(await screen.findByText(line)).toBeInTheDocument();
				expect(
					screen.getByText("2 unidades + 2 halls de andar"),
				).toBeInTheDocument();
				if (missing === undefined) {
					expect(screen.queryByRole("alert")).not.toBeInTheDocument();
					expect(await addButton()).toBeEnabled();
				} else {
					const alert = await screen.findByRole("alert");
					expect(alert).toHaveTextContent(
						`Faltam ${4 - remaining} unidades na reserva`,
					);
					expect(alert).toHaveTextContent(
						`${missing} Peça mais ao admin da construtora.`,
					);
					expect(await addButton()).toBeDisabled();
				}
			},
		);

		test("says nothing of units for a number that holds common areas", async () => {
			const { handler, towerB } = scenario({ remaining: 3 });
			open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "12");
			await typeInto("Finais", "01");

			const alert = await screen.findByRole("alert");
			expect(alert).toHaveTextContent("Falta 1 unidade na reserva");
			expect(document.body).not.toHaveTextContent(/\d+\s+unidades?\s+e a obra/);
			expect(document.body).not.toHaveTextContent(/Tire \d/);
		});
	});

	describe("on a project with a single tower", () => {
		test("drops the tower from the band, the lines and the toast, and goes back to the project", async () => {
			const { handler, towerB, created } = scenario({
				several: false,
				remaining: 12,
			});
			const { router } = open(handler, pathFor(towerB.id));

			expect(
				await screen.findByRole("heading", {
					level: 1,
					name: "Adicionar andares",
				}),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"A obra tem hoje do 1º ao 10º andar. Use andares que ela ainda não tem.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Casa Moinhos" }),
			).toHaveAttribute("href", `/projects/${OBRA.id}`);
			await typeInto("Último andar", "11");
			await typeInto("Finais", "01, 04");
			expect(
				await screen.findByText("A obra ganha 1 andar e 4 unidades"),
			).toBeInTheDocument();
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 1 andar" }),
			);

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
			expect(created).toHaveLength(1);
			expect(
				await screen.findByText("1 andar adicionado."),
			).toBeInTheDocument();
		});
	});

	describe("who may open it", () => {
		test("shows the lock line and the delivered block, and no wizard, on a delivered project", async () => {
			const { handler, towerB } = scenario({
				summary: { ...OBRA, status: "delivered" },
			});
			open(handler, pathFor(towerB.id));

			expect(await screen.findByText(LOCKED)).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "A obra foi entregue" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Voltar para a obra" }),
			).toHaveAttribute("href", `/projects/${OBRA.id}`);
			expect(
				screen.getByRole("heading", {
					level: 1,
					name: "Adicionar andares à Torre B",
				}),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("textbox", { name: "Último andar" }),
			).not.toBeInTheDocument();
		});

		test("opens the project when the tower does not exist", async () => {
			const { handler } = scenario();
			const { router } = open(
				handler,
				pathFor("0190a000-0000-7000-8000-00000000ffff"),
			);

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
			expect(
				screen.queryByRole("heading", { level: 1, name: /Adicionar andares/ }),
			).not.toBeInTheDocument();
		});

		test("opens the project when the tower is not an id, as it does without one", async () => {
			const { handler } = scenario();
			const { router } = open(
				handler,
				`/projects/${OBRA.id}/structure/new?tower=Torre%20B`,
			);

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
		});

		test("shows the failure and loads again when the tipologias do not load", async () => {
			const { handler, towerB } = scenario();
			let broken = true;
			open(
				combine(
					(url) =>
						broken && url.pathname === `/api/projects/${OBRA.id}/typologies`
							? json({}, 500)
							: undefined,
					handler,
				),
				pathFor(towerB.id),
			);

			expect(
				await screen.findByText("Não foi possível carregar a torre"),
			).toBeInTheDocument();
			broken = false;
			await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

			expect(
				await screen.findByRole("textbox", { name: "Último andar" }),
			).toBeInTheDocument();
		});
	});

	describe("on the phone", () => {
		test("goes through three steps to the preview and adds the floors (A1, A8)", async () => {
			setViewport("phone");
			const { handler, towerB, created } = scenario({ remaining: 12 });
			const { router } = open(handler, pathFor(towerB.id));

			expect(await screen.findByText("Passo 1 de 3")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "Novos andares" }),
			).toBeInTheDocument();
			await typeInto("Último andar", "12");
			await typeInto("Finais", "01, 04");
			await toPreviewOnPhone();

			expect(screen.getByText("Passo 3 de 3")).toBeInTheDocument();
			expect(
				screen.getByText("Torre B ganha 2 andares e 8 unidades"),
			).toBeInTheDocument();
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 2 andares" }),
			);

			await waitFor(() => {
				expect(router.state.location.pathname).toBe(
					`/projects/${OBRA.id}/locations/${towerB.id}`,
				);
			});
			expect(created).toHaveLength(1);
			expect(
				await screen.findByText("2 andares adicionados à Torre B."),
			).toBeInTheDocument();
		});

		test("rides the over-reserve alert in the bottom bar above the disabled button (W9b)", async () => {
			setViewport("phone");
			const { handler, towerB } = scenario({
				summary: { ...OBRA, role: "manager" },
				remaining: 6,
			});
			open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "12");
			await typeInto("Finais", "01, 04");
			await toPreviewOnPhone();

			const alert = await screen.findByText("Faltam 4 unidades na reserva");
			const button = await addButton();
			expect(button).toBeDisabled();
			expect(button).toHaveAccessibleDescription(
				/^Faltam 4 unidades na reserva Estes andares usam\s10 e a obra ainda tem\s6\./,
			);
			expect(alert.closest("div[class*='fixed']")).toContainElement(button);
		});
	});
});
