import {
	type CreateStructure,
	LOCATION_NAME_TAKEN,
	NO_UNITS_LEFT,
	PROJECT_NOT_FOUND,
	type ProjectSummary,
	type ProjectUnitsBalance,
} from "@bluprint/shared";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import {
	type ApiHandler,
	json,
	renderAt,
	signedIn,
	stubApi,
} from "@/test/renderApp";
import { combine, emptyStructure, structureApi } from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const user = userEvent.setup({ delay: null });

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
		units?: ProjectUnitsBalance;
		unitsResponse?: () => Promise<Response> | Response;
		create?: (
			body: CreateStructure,
			attempt: number,
		) => Promise<Response> | Response;
	} = {},
) {
	const summary = options.summary ?? OBRA;
	const sent: CreateStructure[] = [];
	const unitsReads: number[] = [];
	let units = options.units ?? balance(150);
	const handler: ApiHandler = combine(
		(url, init) => {
			if (url.pathname === `/api/projects/${summary.id}`) return json(summary);
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
				if (options.create) return options.create(body, sent.length);
				return json({ counts: countsOf(body) }, 201);
			}
			return undefined;
		},
		structureApi(summary.id, emptyStructure),
	);
	return {
		handler,
		sent,
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
	perFloor: string,
	options: { first?: string; at?: number } = {},
) {
	const at = options.at ?? 0;
	if (options.first !== undefined) {
		await typeInto("Primeiro andar", options.first, at);
	}
	await typeInto("Último andar", last, at);
	await typeInto("Unidades por andar", perFloor, at);
}

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

async function toPreviewOnPhone() {
	await user.click(
		await screen.findByRole("button", { name: "Continuar · Áreas comuns" }),
	);
	await user.click(
		await screen.findByRole("button", { name: "Continuar · Prévia" }),
	);
}

describe("structure wizard", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		toast.dismiss();
	});

	describe("on the desktop", () => {
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
			for (const name of ["Torres e andares", "Áreas comuns", "Prévia"]) {
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
				screen.getByRole("checkbox", { name: /Térreo sem unidades/ }),
			).toBeChecked();
			expect(
				screen.getByRole("checkbox", { name: "Hall em cada andar" }),
			).toBeChecked();
		});

		test("counts the plan and says what it uses and what is left as the fields are typed (W4)", async () => {
			const { handler } = wizardApi({ units: balance(150) });
			open(handler);
			await describeTower("3", "4");

			expect(
				await screen.findByText("1 torre · 4 andares · 12 unidades"),
			).toBeInTheDocument();
			expect(screen.getByText("4 áreas comuns")).toBeInTheDocument();
			expect(
				await screen.findByText(
					"Usa 12 das 150 unidades que restam nesta obra. Depois de criar, sobram 138.",
				),
			).toBeInTheDocument();
			const facade = screen.getByRole("list", { name: "Fachada da Torre A" });
			expect(within(facade).getByText("Térreo")).toBeInTheDocument();
			expect(within(facade).getByText("Hall de entrada")).toBeInTheDocument();
			expect(within(facade).getByText("304")).toBeInTheDocument();
			expect(within(facade).getAllByText("Hall")).toHaveLength(3);
		});

		test("drops anything but digits from the number fields", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("1a2.b", "4");

			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"12",
			);
		});

		test("renumbers the units when the numbering changes", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("2", "2");
			const facade = await screen.findByRole("list", {
				name: "Fachada da Torre A",
			});
			expect(within(facade).getByText("202")).toBeInTheDocument();

			await user.click(screen.getByRole("radio", { name: "1A, 1B" }));

			expect(within(facade).getByText("2B")).toBeInTheDocument();
			expect(within(facade).queryByText("202")).not.toBeInTheDocument();
		});

		test("leaves the ground floor and the halls out when unchecked", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("2", "2");

			await user.click(
				screen.getByRole("checkbox", { name: /Térreo sem unidades/ }),
			);
			await user.click(
				screen.getByRole("checkbox", { name: "Hall em cada andar" }),
			);

			expect(
				await screen.findByText("1 torre · 2 andares · 4 unidades"),
			).toBeInTheDocument();
			expect(screen.getByText("0 áreas comuns")).toBeInTheDocument();
		});

		test("asks for each name and copies the previous tower with the next letter (W1 with two towers)", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("12", "4");

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
				await screen.findByText("2 torres · 26 andares · 96 unidades"),
			).toBeInTheDocument();
			expect(screen.queryByText(/Com uma torre só/)).not.toBeInTheDocument();
		});

		test("takes the areas of the project, of each tower and of one floor (W2)", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("12", "4");
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
			expect(screen.getByText("30 áreas comuns")).toBeInTheDocument();
			const facade = screen.getByRole("list", { name: "Fachada da Torre B" });
			expect(within(facade).getByText("Terraço")).toBeInTheDocument();
			const projectAreas = screen.getByRole("button", {
				name: "Tirar Guarita",
			});
			await user.click(projectAreas);
			expect(screen.getByText("29 áreas comuns")).toBeInTheDocument();
		});

		test("refuses an area that is already listed and a floor outside the tower", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("12", "4");
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
			await typeInto("Último andar", "");
			await user.click(await createButton());

			expect(
				await screen.findByText("Informe o último andar."),
			).toBeInTheDocument();
			expect(
				screen.getByText("De 1 a 30 unidades por andar."),
			).toBeInTheDocument();
			await waitFor(() => {
				expect(
					screen.getByRole("textbox", { name: "Último andar" }),
				).toHaveFocus();
			});
			expect(
				screen.getByRole("textbox", { name: "Último andar" }),
			).toHaveAttribute("aria-invalid", "true");
			expect(sent).toHaveLength(0);
		});

		test("compares the last floor with the first and clears the message once it is fixed (W5)", async () => {
			const { handler } = wizardApi();
			open(handler);
			await describeTower("3", "4", { first: "5" });
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
			await describeTower("3", "4");
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
			await describeTower("20", "4");
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
			await describeTower("3", "4", { first: "5" });
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
			await describeTower("12", "4");
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
			await describeTower("3", "4");
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
			await describeTower("3", "4");
			await user.click(await createButton());
			await screen.findByRole("button", { name: "Criando estrutura…" });

			await user.type(
				screen.getByRole("textbox", { name: "Último andar" }),
				"9",
			);
			await user.click(
				screen.getByRole("checkbox", { name: "Hall em cada andar" }),
			);

			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"3",
			);
			expect(
				screen.getByRole("checkbox", { name: "Hall em cada andar" }),
			).toBeChecked();
			succeed();
			await waitFor(() => {
				expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
			});
			expect(
				await screen.findByText("Estrutura criada: 1 torre e 12 unidades."),
			).toBeInTheDocument();
			expect(sent).toHaveLength(1);
		});

		test("creates the plan in one request with parents before children, then opens the project with the toast (W10)", async () => {
			const { handler, sent } = wizardApi();
			const { router } = open(handler);
			await describeTower("3", "4");
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
			expect(locations).toHaveLength(1 + 4 + 12 + 4 + 1);
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
			await describeTower("3", "4");
			await user.click(await createButton());

			expect(
				await screen.findByText(
					"Não foi possível criar a estrutura. Confira sua conexão e tente de novo. Nada foi salvo.",
				),
			).toBeInTheDocument();
			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"3",
			);
			expect(await createButton()).toBeEnabled();

			await user.click(await createButton());

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
			await describeTower("3", "4");
			await user.click(await createButton());
			await screen.findByText(/Nada foi salvo/);

			await typeInto("Último andar", "4");

			expect(screen.queryByText(/Nada foi salvo/)).not.toBeInTheDocument();
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
			await describeTower("3", "4");
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

	describe("the project's reservation", () => {
		test("tells a manager how many units to take out and disables the button (W4b)", async () => {
			const { handler, sent } = wizardApi({
				summary: { ...OBRA, role: "manager" },
				units: balance(6),
			});
			open(handler);
			await describeTower("3", "4");

			const alert = await screen.findByText(
				"Esta estrutura tem 12 unidades e a obra tem 6. Tire 6 unidades ou peça mais reserva ao admin da construtora.",
			);
			expect(alert).toBeInTheDocument();
			expect(
				screen.getByText("Restam 6 unidades nesta obra."),
			).toBeInTheDocument();
			const button = await createButton();
			expect(button).toBeDisabled();
			expect(button).toHaveAccessibleDescription(
				/Esta estrutura tem 12 unidades/,
			);
			expect(
				screen.queryByRole("link", { name: "Alterar reserva" }),
			).not.toBeInTheDocument();
			await user.click(button);
			expect(sent).toHaveLength(0);
		});

		test("tells an assistant the reservation is over when nothing is left (W4b)", async () => {
			const { handler } = wizardApi({
				summary: { ...OBRA, role: "assistant" },
				units: balance(0),
			});
			open(handler);
			await describeTower("3", "4");

			expect(
				await screen.findByText(
					"Esta estrutura tem 12 unidades e a reserva da obra acabou. Peça mais reserva ao admin da construtora.",
				),
			).toBeInTheDocument();
			expect(screen.getByText("A reserva da obra acabou.")).toBeInTheDocument();
			expect(await createButton()).toBeDisabled();
		});

		test("offers the admin Alterar reserva beside the sentence (W4c)", async () => {
			const { handler } = wizardApi({ units: balance(6) });
			open(handler);
			await describeTower("3", "4");

			expect(
				await screen.findByText(
					/Esta estrutura tem 12 unidades e a obra tem 6\. Tire 6 unidades ou aumente a reserva\./,
				),
			).toBeInTheDocument();
			const link = screen.getByRole("link", { name: "Alterar reserva" });
			expect(link).toHaveAttribute(
				"href",
				`/projects/${OBRA.id}/configuration`,
			);
			expect(link).toHaveAttribute("target", "_blank");
			expect(await createButton()).toBeDisabled();
		});

		test("enables the button again once the plan fits", async () => {
			const { handler } = wizardApi({ units: balance(6) });
			open(handler);
			await describeTower("3", "4");
			expect(await createButton()).toBeDisabled();

			await typeInto("Unidades por andar", "2");

			expect(await createButton()).toBeEnabled();
			expect(
				screen.getByText(
					"Usa 6 das 6 unidades que restam nesta obra. Depois de criar, sobram 0.",
				),
			).toBeInTheDocument();
			expect(screen.queryByText(/Esta estrutura tem/)).not.toBeInTheDocument();
		});

		test("shows the server's numbers when someone spent units meanwhile and keeps the draft (W7b)", async () => {
			const { handler, sent, setUnits } = wizardApi({
				create: () => {
					setUnits(balance(5));
					return problem(409, NO_UNITS_LEFT, { requested: 12, available: 5 });
				},
			});
			open(handler);
			await describeTower("3", "4");
			await screen.findByText(/Usa 12 das 150 unidades/);
			await user.click(await createButton());

			expect(
				await screen.findByText(
					/Esta estrutura tem 12 unidades e a obra tem 5\. Tire 7 unidades ou aumente a reserva\./,
				),
			).toBeInTheDocument();
			expect(
				screen.getByText("Restam 5 unidades nesta obra."),
			).toBeInTheDocument();
			expect(await createButton()).toBeDisabled();
			expect(screen.getByRole("textbox", { name: "Último andar" })).toHaveValue(
				"3",
			);
			expect(screen.queryByText(/Nada foi salvo/)).not.toBeInTheDocument();
			expect(sent).toHaveLength(1);

			await typeInto("Unidades por andar", "1");

			expect(await createButton()).toBeEnabled();
		});

		test("shows the server's numbers when the units could not be read before (W7b)", async () => {
			const { handler, sent } = wizardApi({
				unitsResponse: () => json({}, 500),
				create: () =>
					problem(409, NO_UNITS_LEFT, { requested: 12, available: 5 }),
			});
			open(handler);
			await describeTower("3", "4");
			await user.click(await createButton());

			expect(
				await screen.findByText(
					/Esta estrutura tem 12 unidades e a obra tem 5\. Tire 7 unidades ou aumente a reserva\./,
				),
			).toBeInTheDocument();
			expect(await createButton()).toBeDisabled();
			expect(sent).toHaveLength(1);
		});

		test("checks nothing and still lets the server decide when the units cannot be read", async () => {
			const { handler, sent } = wizardApi({
				unitsResponse: () => json({}, 500),
			});
			open(handler);
			await describeTower("3", "4");

			await waitFor(() => expect(sent).toHaveLength(0));
			expect(await createButton()).toBeEnabled();
			expect(screen.queryByText(/unidades que restam/)).not.toBeInTheDocument();
			await user.click(await createButton());
			await waitFor(() => expect(sent).toHaveLength(1));
		});

		test("blocks a plan with more than 5.000 locations", async () => {
			const { handler } = wizardApi({ units: balance(9000, 9000) });
			open(handler);
			fireEvent.change(
				await screen.findByRole("textbox", { name: "Último andar" }),
				{
					target: { value: "200" },
				},
			);
			fireEvent.change(
				screen.getByRole("textbox", { name: "Unidades por andar" }),
				{
					target: { value: "30" },
				},
			);

			expect(
				await screen.findByText(
					"Esta estrutura tem 6.403 locais e o limite é 5.000 por vez. Reduza andares, unidades ou áreas comuns.",
				),
			).toBeInTheDocument();
			expect(await createButton()).toBeDisabled();
		});
	});

	describe("who may open it", () => {
		test("shows the lock line and no wizard on a delivered project", async () => {
			const { handler } = wizardApi({
				summary: { ...OBRA, status: "delivered" },
			});
			open(handler);

			expect(await screen.findByText(LOCKED)).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 1, name: "Montar estrutura" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Criar estrutura" }),
			).not.toBeInTheDocument();
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

			expect(await screen.findByText("Passo 1 de 3")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "Torres e andares" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { level: 2, name: "Áreas comuns" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Voltar" }),
			).not.toBeInTheDocument();
			await describeTower("3", "4");

			await user.click(
				screen.getByRole("button", { name: "Continuar · Áreas comuns" }),
			);

			expect(screen.getByText("Passo 2 de 3")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "Áreas comuns" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Voltar" }),
			).toBeInTheDocument();

			await user.click(
				screen.getByRole("button", { name: "Continuar · Prévia" }),
			);

			expect(screen.getByText("Passo 3 de 3")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 2, name: "Prévia" }),
			).toBeInTheDocument();
			expect(
				screen.getByText("1 torre · 4 andares · 12 unidades"),
			).toBeInTheDocument();
			expect(
				await screen.findByText(
					"Usa 12 das 150 unidades que restam nesta obra. Depois de criar, sobram 138.",
				),
			).toBeInTheDocument();
			expect(await createButton()).toBeEnabled();
			expect(
				screen.queryByRole("button", { name: /Continuar/ }),
			).not.toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Voltar" }));
			expect(screen.getByText("Passo 2 de 3")).toBeInTheDocument();
		});

		test("stays on the first step, shows the messages and focuses the first wrong field (W5)", async () => {
			setViewport("phone");
			const { handler } = wizardApi();
			open(handler);
			await typeInto("Último andar", "");
			await user.click(
				await screen.findByRole("button", { name: "Continuar · Áreas comuns" }),
			);

			expect(await screen.findByText("Passo 1 de 3")).toBeInTheDocument();
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
			await describeTower("20", "4");
			await user.click(
				screen.getByRole("button", { name: "Continuar · Áreas comuns" }),
			);
			await addFloorArea("Terraço", "20");
			await user.click(screen.getByRole("button", { name: "Voltar" }));
			await typeInto("Último andar", "15");

			await user.click(
				screen.getByRole("button", { name: "Continuar · Áreas comuns" }),
			);

			expect(await screen.findByText("Passo 2 de 3")).toBeInTheDocument();
			const row = floorAreaRow("Terraço");
			expect(row).toHaveAccessibleDescription(
				"O andar precisa estar entre o 1º e o 15º.",
			);
			await waitFor(() => expect(row).toHaveFocus());
			expect(sent).toHaveLength(0);
		});

		test("puts the over-reservation alert beside the disabled button in the bar (W4b)", async () => {
			setViewport("phone");
			const { handler } = wizardApi({
				summary: { ...OBRA, role: "assistant" },
				units: balance(6),
			});
			open(handler);
			await describeTower("3", "4");
			await toPreviewOnPhone();

			const button = await createButton();
			expect(button).toBeDisabled();
			const alert = await screen.findByRole("alert");
			expect(alert).toHaveTextContent(
				"Esta estrutura tem 12 unidades e a obra tem 6. Tire 6 unidades ou peça mais reserva ao admin da construtora.",
			);
			expect(button).toHaveAccessibleDescription(
				/Esta estrutura tem 12 unidades/,
			);
			expect(
				within(alert.parentElement as HTMLElement).getByRole("button", {
					name: "Criar estrutura",
				}),
			).toBe(button);
			expect(
				screen.getByText("Restam 6 unidades nesta obra."),
			).toBeInTheDocument();
		});

		test("creates from the preview and opens the project with the toast (W10)", async () => {
			setViewport("phone");
			const { handler, sent } = wizardApi();
			const { router } = open(handler);
			await describeTower("3", "4");
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
			await describeTower("3", "4");
			await toPreviewOnPhone();
			await user.click(await createButton());

			expect(
				await screen.findByText(
					"Não foi possível criar a estrutura. Confira sua conexão e tente de novo. Nada foi salvo.",
				),
			).toBeInTheDocument();
			expect(screen.getByText("Passo 3 de 3")).toBeInTheDocument();
			expect(await createButton()).toBeEnabled();
		});
	});
});
