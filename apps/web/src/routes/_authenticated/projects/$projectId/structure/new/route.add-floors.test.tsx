import {
	type CreateStructure,
	LOCATION_NAME_TAKEN,
	NO_UNITS_LEFT,
	type ProjectSummary,
	type Structure,
	type StructureFloor,
	type StructureTower,
} from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import {
	combine,
	floor,
	structureOf,
	tower,
	unitTypeOf,
	unitTypesApi,
	writableApi,
} from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const user = userEvent.setup({ delay: null });

const OBRA: ProjectSummary = { ...project(7), name: "Casa Moinhos" };
const LOCKED = "A obra foi entregue: a estrutura não pode mais ser alterada.";

const typeA = unitTypeOf("Tipologia A", ["Sala", "Quarto"]);
const typeB = unitTypeOf("Tipologia B", ["Sala"]);

function typedFloors(
	from: number,
	to: number,
	typeNames: string[],
): StructureFloor[] {
	return Array.from({ length: to - from + 1 }, (_, at) => {
		const number = from + at;
		return floor(
			`${number}º andar`,
			typeNames.map((unitType, unit) => ({
				name: `${number}${String(unit + 1).padStart(2, "0")}`,
				unitType,
			})),
			["Hall"],
		);
	});
}

function scenario(
	options: {
		summary?: ProjectSummary;
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
		units: { reserved: 100, used: 0 },
	};
	const api = writableApi(summary, structure, {
		remaining: options.remaining ?? 12,
		...(options.create && { create: options.create }),
	});
	const handler = combine(
		unitTypesApi(summary.id, { unitTypes: [typeA, typeB] }),
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
		await screen.findByRole("button", { name: "Continuar · Áreas comuns" }),
	);
	await user.click(
		await screen.findByRole("button", { name: "Continuar · Tipologias" }),
	);
	await user.click(
		await screen.findByRole("button", { name: "Continuar · Prévia" }),
	);
}

describe("adding floors to a tower (W9)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		toast.dismiss();
	});

	describe("on the desktop", () => {
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
					"A Torre B tem hoje 11 andares, do 1º ao 10º, com 4 unidades por andar.",
				),
			).toBeInTheDocument();
			expect(screen.getByRole("link", { name: "Torre B" })).toHaveAttribute(
				"href",
				`/projects/${OBRA.id}/locations/${towerB.id}`,
			);
			for (const name of [
				"Novos andares",
				"Áreas comuns",
				"Tipologias",
				"Prévia",
			]) {
				expect(
					screen.getByRole("heading", { level: 2, name }),
				).toBeInTheDocument();
			}
			expect(
				screen.getByText(
					"Os andares entram acima do último andar da Torre B, com a mesma numeração.",
				),
			).toBeInTheDocument();
			expect(screen.getByRole("textbox", { name: "Do andar" })).toHaveValue(
				"11",
			);
			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"",
			);
			expect(
				screen.getByRole("textbox", { name: "Unidades por andar" }),
			).toHaveValue("4");
			expect(
				screen.getByRole("checkbox", { name: "Hall em cada andar" }),
			).toBeChecked();
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
				screen.getByRole("button", { name: "Área comum num andar" }),
			).toBeInTheDocument();
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
				screen.queryByRole("button", { name: "Tirar Quarto da Tipologia A" }),
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

			expect(
				await screen.findByText("Torre B ganha 2 andares e 8 unidades"),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"Usa 8 das 12 unidades que restam nesta obra. Depois de adicionar, sobram 4.",
				),
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
					"Nada é salvo antes de adicionar. Depois, tudo se ajusta na fachada.",
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

			expect(
				await screen.findByText(
					"Esta estrutura tem 8 unidades e a obra tem 6. Tire 2 unidades ou peça mais reserva ao admin da construtora.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText("Restam 6 unidades nesta obra."),
			).toBeInTheDocument();
			const button = await addButton();
			expect(button).toBeDisabled();
			await user.click(button);
			expect(created).toHaveLength(0);
		});

		test("sends the new floors under the existing tower with the existing tipologias, then opens the tower with the toast (W10)", async () => {
			const { handler, towerB, created } = scenario({ remaining: 12 });
			const { router } = open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "12");
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
			expect(body.unitTypes).toEqual([]);
			expect(
				body.locations
					.filter(({ type }) => type === "floor")
					.map(({ name, parentId, position }) => [name, parentId, position]),
			).toEqual([
				["11º andar", towerB.id, undefined],
				["12º andar", towerB.id, undefined],
			]);
			expect(
				body.locations
					.filter(({ type }) => type === "unit")
					.map(({ name, unitTypeId }) => [name, unitTypeId]),
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

		test("adds a common area of one of the new floors and a tipologia of its own", async () => {
			const { handler, towerB, created } = scenario({ remaining: 12 });
			open(handler, pathFor(towerB.id));
			await typeInto("Último andar", "12");
			await user.click(
				await screen.findByRole("button", { name: "Área comum num andar" }),
			);
			await user.type(
				screen.getByRole("textbox", { name: "Nome da área comum" }),
				"Terraço",
			);
			await user.type(screen.getByRole("textbox", { name: "Andar" }), "12");
			await user.click(
				screen.getByRole("button", { name: "Adicionar ao andar" }),
			);
			expect(
				await screen.findByText("· Torre B, 12º andar"),
			).toBeInTheDocument();
			await user.click(screen.getByRole("button", { name: "Nova tipologia" }));
			const field = (
				await screen.findAllByRole("textbox", { name: "Nome da tipologia" })
			)[0];
			if (!field) throw new Error("No new tipologia.");
			await user.clear(field);
			await user.type(field, "Cobertura");
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 2 andares" }),
			);

			await waitFor(() => expect(created).toHaveLength(1));
			const body = nth(created, 0) as CreateStructure;
			expect(body.unitTypes.map(({ name }) => name)).toEqual(["Cobertura"]);
			const terraco = body.locations.find(({ name }) => name === "Terraço");
			const twelfth = body.locations.find(({ name }) => name === "12º andar");
			expect(terraco?.parentId).toBe(twelfth?.id);
		});

		test("refuses floors the tower already has before sending anything", async () => {
			const { handler, towerB, created } = scenario({ remaining: 20 });
			open(handler, pathFor(towerB.id));
			await typeInto("Do andar", "9");
			await typeInto("Último andar", "12");
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
				floor("Cobertura", [{ name: "401", unitType: "Tipologia A" }]),
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
					{ name: "1301", unitType: "Tipologia A" },
					{ name: "1302", unitType: "Tipologia A" },
				]),
			]);
			const { handler, created } = scenario({ towerB: withCobertura });
			open(handler, pathFor(withCobertura.id));
			expect(
				await screen.findByRole("textbox", { name: "Do andar" }),
			).toHaveValue("13");
			await typeInto("Último andar", "14");
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 2 andares" }),
			);

			expect(
				await screen.findByText(
					"A Torre B já tem a unidade 1301. Comece em um andar acima dela.",
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
				screen.getByText("Os andares entram na Torre B, a partir do 1º."),
			).toBeInTheDocument();
			expect(
				screen.getByRole("textbox", { name: "Unidades por andar" }),
			).toHaveValue("");
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
							requested: 8,
							available: 6,
						},
						409,
					);
				},
			});
			open(refused.handler, pathFor(refused.towerB.id));
			await typeInto("Último andar", "12");
			await user.click(
				await screen.findByRole("button", { name: "Adicionar 2 andares" }),
			);

			expect(
				await screen.findByText(
					"Esta estrutura tem 8 unidades e a obra tem 6. Tire 2 unidades ou peça mais reserva ao admin da construtora.",
				),
			).toBeInTheDocument();
			expect(await addButton()).toBeDisabled();
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
					"A obra tem hoje 11 andares, do 1º ao 10º, com 4 unidades por andar.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Casa Moinhos" }),
			).toHaveAttribute("href", `/projects/${OBRA.id}`);
			await typeInto("Último andar", "11");
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
		test("shows the lock line and no wizard on a delivered project", async () => {
			const { handler, towerB } = scenario({
				summary: { ...OBRA, status: "delivered" },
			});
			open(handler, pathFor(towerB.id));

			expect(await screen.findByText(LOCKED)).toBeInTheDocument();
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
						broken && url.pathname === `/api/projects/${OBRA.id}/unit-types`
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
		test("goes through four steps to the preview and adds the floors (W9, W10)", async () => {
			setViewport("phone");
			const { handler, towerB, created } = scenario({ remaining: 12 });
			const { router } = open(handler, pathFor(towerB.id));

			expect(await screen.findByText("Passo 1 de 4")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "Novos andares" }),
			).toBeInTheDocument();
			await typeInto("Último andar", "12");
			await toPreviewOnPhone();

			expect(screen.getByText("Passo 4 de 4")).toBeInTheDocument();
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
			await toPreviewOnPhone();

			const alert = await screen.findByText(
				"Esta estrutura tem 8 unidades e a obra tem 6. Tire 2 unidades ou peça mais reserva ao admin da construtora.",
			);
			const button = await addButton();
			expect(button).toBeDisabled();
			expect(button).toHaveAccessibleDescription(
				/Esta estrutura tem 8 unidades/,
			);
			expect(alert.closest("div[class*='fixed']")).toContainElement(button);
		});
	});
});
