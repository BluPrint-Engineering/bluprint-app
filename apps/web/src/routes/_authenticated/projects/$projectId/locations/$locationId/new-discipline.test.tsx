import {
	type CreateDiscipline,
	DISCIPLINE_LIMIT_REACHED,
	DISCIPLINE_NAME_TAKEN,
	type Discipline,
	type LocationDetail,
	PROJECT_DELIVERED,
	type ProjectSummary,
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
import { signInAgain } from "@/test/sessionExpiry";
import {
	baseCatalog,
	catalogApi,
	catalogDiscipline,
	combine,
	floor,
	structureApi,
	structureOf,
	tower,
} from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const OBRA: ProjectSummary = { ...project(3), name: "Casa Moinhos" };

const user = userEvent.setup({ delay: null });

function serverFor({
	summary = OBRA,
	extras = [],
	answer,
}: {
	summary?: ProjectSummary;
	extras?: Discipline[];
	answer?: (body: CreateDiscipline, attempt: number) => Response | undefined;
} = {}) {
	const second = floor("2º andar", ["201", "202"], ["Hall"]);
	const towerA = tower("Torre A", [second]);
	const structure = structureOf([towerA]);
	const catalog = [...baseCatalog(), ...extras];
	const listed = (applies: (discipline: Discipline) => boolean) =>
		catalog
			.filter(({ type }) => type !== "general")
			.map((each) => ({
				id: each.id,
				name: each.name,
				applies: applies(each),
			}));
	const leaf = listed(({ type, appliesEverywhere }) =>
		type === "base" ? true : appliesEverywhere,
	);
	const parent = listed(({ type }) => type === "base");
	const details: Record<string, Partial<LocationDetail>> = {
		[nth(second.units, 0).id]: { disciplines: leaf },
		[nth(second.commonAreas, 0).id]: { disciplines: leaf },
		[second.id]: { disciplines: parent },
		[towerA.id]: { disciplines: parent },
	};
	const disciplines = catalogApi(OBRA.id, structure, details, {
		catalog,
		...(answer && { answer }),
	});
	const handler: ApiHandler = combine(
		disciplines.handler,
		(url) =>
			url.pathname === `/api/projects/${OBRA.id}` ? json(summary) : undefined,
		structureApi(OBRA.id, structure, details),
	);
	return {
		handler,
		created: disciplines.created,
		unit201: nth(second.units, 0),
		hall: nth(second.commonAreas, 0),
		second,
		towerA,
	};
}

function response(status: number, body: object) {
	return new Response(JSON.stringify(body), { status });
}

function refusal(code: string, extra: object = {}) {
	return response(409, {
		type: "about:blank",
		title: "Conflict",
		status: 409,
		code,
		...extra,
	});
}

async function open(handler: ApiHandler, locationId: string, title: string) {
	const stubbed = stubApi(signedIn, { api: handler });
	renderAt(`/projects/${OBRA.id}/locations/${locationId}`);
	await screen.findByRole("heading", { level: 1, name: title });
	return stubbed;
}

const newButton = () =>
	screen.findByRole("button", { name: "Nova disciplina" });
const dialog = () => screen.getByRole("dialog", { name: "Nova disciplina" });
const nameField = () => within(dialog()).getByRole("textbox", { name: "Nome" });
const scope = (name: "Na obra toda" | "Só onde for ligada") =>
	within(dialog()).getByRole("radio", { name });
const createButton = () =>
	within(dialog()).getByRole("button", { name: /^(Criar|Criando…)$/ });

async function fill(
	name: string,
	choice?: "Na obra toda" | "Só onde for ligada",
) {
	await user.click(await newButton());
	await user.type(nameField(), name);
	if (choice) await user.click(scope(choice));
}

function extrasNamed(count: number): Discipline[] {
	return Array.from({ length: count }, (_, index) =>
		catalogDiscipline(`Extra ${index + 1}`),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
	localStorage.clear();
	toast.dismiss();
	setViewport("desktop");
});

describe("Nova disciplina on the Disciplinas card", () => {
	test.each([
		["unit", "201"],
		["common area", "Hall"],
		["floor", "2º andar"],
		["tower", "Torre A"],
	] as const)("shows the button on a %s page", async (_kind, title) => {
		const server = serverFor();
		const id = {
			"201": server.unit201.id,
			Hall: server.hall.id,
			"2º andar": server.second.id,
			"Torre A": server.towerA.id,
		}[title];
		await open(server.handler, id, title);

		expect(await newButton()).toBeEnabled();
	});

	test("has no button in a delivered project", async () => {
		const server = serverFor({ summary: { ...OBRA, status: "delivered" } });
		await open(server.handler, server.unit201.id, "201");
		await screen.findByText("Hidráulica · ligada");

		expect(
			screen.queryByRole("button", { name: "Nova disciplina" }),
		).not.toBeInTheDocument();
	});

	test("opens with no choice marked and Criar off until there is a name and a choice", async () => {
		const server = serverFor();
		await open(server.handler, server.unit201.id, "201");

		await user.click(await newButton());

		expect(nameField()).toHaveValue("");
		expect(nameField()).toHaveFocus();
		expect(scope("Na obra toda")).not.toBeChecked();
		expect(scope("Só onde for ligada")).not.toBeChecked();
		expect(createButton()).toBeDisabled();
		expect(
			within(dialog()).getByText("Ex.: Pintura, Gesso, Impermeabilização."),
		).toBeInTheDocument();
		expect(
			within(dialog()).getByText(
				"Essa escolha não muda depois. Andares e torres começam só com Hidráulica e Elétrica.",
			),
		).toBeInTheDocument();
		expect(
			within(dialog()).getByText(
				"Cor e planta própria se ajustam na configuração da obra, em Disciplinas.",
			),
		).toBeInTheDocument();

		await user.type(nameField(), "Gesso{Enter}");
		expect(createButton()).toBeDisabled();
		expect(server.created).toEqual([]);

		await user.click(scope("Só onde for ligada"));
		expect(scope("Só onde for ligada")).toBeChecked();
		expect(createButton()).toBeEnabled();
	});

	test("creates Gesso for the whole project from 201, on at 201 and off on the 2º andar", async () => {
		const server = serverFor();
		await open(server.handler, server.unit201.id, "201");
		await screen.findByText("2 de 2");

		await fill("Gesso", "Na obra toda");
		await user.click(createButton());

		expect(await screen.findByText("Disciplina Gesso criada.")).toBeVisible();
		expect(
			screen.queryByRole("dialog", { name: "Nova disciplina" }),
		).not.toBeInTheDocument();
		expect(await screen.findByText("3 de 3")).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: "Gesso" })).toBeChecked();
		await waitFor(async () => expect(await newButton()).toHaveFocus());
		expect(server.created).toEqual([
			{ id: expect.any(String), name: "Gesso", appliesEverywhere: true },
		]);

		await user.click(screen.getByRole("link", { name: "2º andar" }));
		await screen.findByRole("heading", { level: 1, name: "2º andar" });
		expect(await screen.findByText("2 de 3")).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: "Gesso" })).not.toBeChecked();
	});

	test("creates Piscina only where turned on from the Hall, off at the Hall", async () => {
		const server = serverFor();
		await open(server.handler, server.hall.id, "Hall");
		await screen.findByText("2 de 2");

		await fill("Piscina", "Só onde for ligada");
		await user.click(createButton());

		expect(await screen.findByText("Disciplina Piscina criada.")).toBeVisible();
		expect(await screen.findByText("2 de 3")).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: "Piscina" })).not.toBeChecked();
		expect(server.created).toEqual([
			{ id: expect.any(String), name: "Piscina", appliesEverywhere: false },
		]);
	});

	test.each([
		["", "Informe o nome."],
		["   ", "Informe o nome."],
		["x".repeat(61), "Use até 60 caracteres."],
		["eletrica", "Elétrica já existe nesta obra."],
		["  ELÉTRICA  ", "Elétrica já existe nesta obra."],
		["pintura", "Pintura já existe nesta obra."],
		["Geral", "Geral vale em todo local e não entra na lista."],
		["geral", "Geral vale em todo local e não entra na lista."],
	])("refuses %j on the screen with no request", async (typed, message) => {
		const server = serverFor({ extras: [catalogDiscipline("Pintura")] });
		await open(server.handler, server.unit201.id, "201");

		await user.click(await newButton());
		if (typed) await user.type(nameField(), typed);
		await user.click(scope("Na obra toda"));
		await user.click(createButton());

		expect(await within(dialog()).findByText(message)).toBeInTheDocument();
		expect(nameField()).toHaveAttribute("aria-invalid", "true");
		expect(server.created).toEqual([]);
	});

	test("shows DISCIPLINE_NAME_TAKEN in the field with the server's spelling, keeping the name and the choice", async () => {
		const server = serverFor({
			answer: () => refusal(DISCIPLINE_NAME_TAKEN, { name: "Gésso" }),
		});
		await open(server.handler, server.unit201.id, "201");

		await fill("Gesso", "Só onde for ligada");
		await user.click(createButton());

		expect(
			await within(dialog()).findByText("Gésso já existe nesta obra."),
		).toBeInTheDocument();
		expect(nameField()).toHaveValue("Gesso");
		expect(scope("Só onde for ligada")).toBeChecked();
		expect(server.created).toHaveLength(1);
	});

	test("sends one request when Criar is tapped twice", async () => {
		let release: () => void = () => {};
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		const server = serverFor();
		const slow: ApiHandler = (url, init) => {
			const reply = server.handler(url, init);
			if (init?.method !== "POST" || !reply) return reply;
			return held.then(() => reply);
		};
		await open(slow, server.unit201.id, "201");

		await fill("Gesso", "Na obra toda");
		await user.dblClick(createButton());
		expect(createButton()).toHaveTextContent("Criando…");
		expect(createButton()).toBeDisabled();
		await user.type(nameField(), "{Enter}");
		release();

		expect(await screen.findByText("Disciplina Gesso criada.")).toBeVisible();
		expect(server.created).toHaveLength(1);
	});

	test("sends the same id again after an answer is lost, and the card lists one Gesso", async () => {
		const server = serverFor();
		let lost = false;
		const lossy: ApiHandler = (url, init) => {
			const reply = server.handler(url, init);
			if (init?.method === "POST" && !lost) {
				lost = true;
				return Promise.reject(new TypeError("Failed to fetch"));
			}
			return reply;
		};
		await open(lossy, server.unit201.id, "201");
		await screen.findByText("2 de 2");

		await fill("Gesso", "Na obra toda");
		await user.click(createButton());

		expect(
			await within(dialog()).findByText(
				"Não foi possível criar a disciplina. Confira a conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(nameField()).toHaveValue("Gesso");
		expect(scope("Na obra toda")).toBeChecked();

		await user.click(createButton());

		expect(await screen.findByText("Disciplina Gesso criada.")).toBeVisible();
		expect(server.created).toHaveLength(2);
		expect(nth(server.created, 1).id).toBe(nth(server.created, 0).id);
		expect(await screen.findByText("3 de 3")).toBeInTheDocument();
		expect(screen.getAllByRole("checkbox", { name: "Gesso" })).toHaveLength(1);
		expect(screen.getByRole("checkbox", { name: "Gesso" })).toBeChecked();
	});

	test("a new opening after Cancelar sends a new id", async () => {
		const server = serverFor({ answer: () => response(500, {}) });
		await open(server.handler, server.unit201.id, "201");

		await fill("Gesso", "Na obra toda");
		await user.click(createButton());
		await within(dialog()).findByText(/Não foi possível criar a disciplina/);
		await user.click(
			within(dialog()).getByRole("button", { name: "Cancelar" }),
		);
		await fill("Gesso", "Na obra toda");
		await user.click(createButton());
		await within(dialog()).findByText(/Não foi possível criar a disciplina/);

		expect(server.created).toHaveLength(2);
		expect(nth(server.created, 1).id).not.toBe(nth(server.created, 0).id);
	});

	test("shows the limit sentence in place of the button with 10 extras", async () => {
		const server = serverFor({ extras: extrasNamed(10) });
		await open(server.handler, server.unit201.id, "201");

		expect(
			await screen.findByText(
				"Esta obra já tem 10 disciplinas extras, o máximo.",
			),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Nova disciplina" }),
		).not.toBeInTheDocument();
	});

	test("shows DISCIPLINE_LIMIT_REACHED in the dialog, keeping the name and the choice", async () => {
		const server = serverFor({
			extras: extrasNamed(9),
			answer: () => refusal(DISCIPLINE_LIMIT_REACHED),
		});
		await open(server.handler, server.unit201.id, "201");

		await fill("Gesso", "Na obra toda");
		await user.click(createButton());

		expect(
			await within(dialog()).findByText(
				"Esta obra já tem 10 disciplinas extras, o máximo.",
			),
		).toBeInTheDocument();
		expect(nameField()).toHaveValue("Gesso");
		expect(scope("Na obra toda")).toBeChecked();
		expect(createButton()).toBeDisabled();
	});

	test("moves focus to the card when the creation reaches the limit", async () => {
		const server = serverFor({ extras: extrasNamed(9) });
		await open(server.handler, server.unit201.id, "201");

		await fill("Gesso", "Na obra toda");
		await user.click(createButton());

		expect(await screen.findByText("Disciplina Gesso criada.")).toBeVisible();
		expect(
			await screen.findByText(
				"Esta obra já tem 10 disciplinas extras, o máximo.",
			),
		).toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByRole("region", { name: "Disciplinas" })).toHaveFocus(),
		);
	});

	test.each([
		[
			"Cancelar",
			() => user.click(screen.getByRole("button", { name: "Cancelar" })),
		],
		["Esc", () => user.keyboard("{Escape}")],
	])(
		"%s creates nothing and returns focus to the button",
		async (_how, close) => {
			const server = serverFor();
			await open(server.handler, server.unit201.id, "201");

			await fill("Gesso", "Na obra toda");
			await close();

			await waitFor(() =>
				expect(
					screen.queryByRole("dialog", { name: "Nova disciplina" }),
				).not.toBeInTheDocument(),
			);
			await waitFor(async () => expect(await newButton()).toHaveFocus());
			expect(server.created).toEqual([]);
			await user.click(await newButton());
			expect(nameField()).toHaveValue("");
			expect(scope("Na obra toda")).not.toBeChecked();
		},
	);

	test("closes the dialog and turns the card read-only when the project was delivered", async () => {
		let delivered = false;
		const server = serverFor({
			answer: () => {
				delivered = true;
				return refusal(PROJECT_DELIVERED);
			},
		});
		const handler: ApiHandler = (url, init) =>
			delivered && url.pathname === `/api/projects/${OBRA.id}`
				? json({ ...OBRA, status: "delivered" })
				: server.handler(url, init);
		await open(handler, server.unit201.id, "201");

		await fill("Gesso", "Na obra toda");
		await user.click(createButton());

		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Nova disciplina" }),
			).not.toBeInTheDocument(),
		);
		expect(await screen.findByText("Hidráulica · ligada")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Nova disciplina" }),
		).not.toBeInTheDocument();
	});

	test("on a phone, opens as a bottom panel with the same fields", async () => {
		setViewport("phone");
		const server = serverFor();
		await open(server.handler, server.unit201.id, "201");

		await fill("Gesso", "Na obra toda");
		await user.click(createButton());

		expect(await screen.findByText("Disciplina Gesso criada.")).toBeVisible();
		expect(server.created).toEqual([
			{ id: expect.any(String), name: "Gesso", appliesEverywhere: true },
		]);
	});

	test("reopens after an expired session with the name, the choice and the same id, and creates one Gesso", async () => {
		let stubbed: ReturnType<typeof stubApi> | undefined;
		const server = serverFor({
			answer: (_body, attempt) => {
				if (attempt > 1) return undefined;
				stubbed?.setSession(null);
				return response(401, {});
			},
		});
		stubbed = await open(server.handler, server.unit201.id, "201");
		await screen.findByText("2 de 2");

		await fill("Gesso", "Na obra toda");
		await user.click(createButton());
		await signInAgain();

		await screen.findByRole("heading", {
			level: 1,
			name: "201",
			hidden: true,
		});
		expect(
			await screen.findByRole("dialog", { name: "Nova disciplina" }),
		).toBeVisible();
		expect(nameField()).toHaveValue("Gesso");
		expect(scope("Na obra toda")).toBeChecked();
		await user.click(createButton());

		expect(await screen.findByText("Disciplina Gesso criada.")).toBeVisible();
		expect(server.created).toHaveLength(2);
		expect(nth(server.created, 1)).toEqual(nth(server.created, 0));
		expect(await screen.findByText("3 de 3")).toBeInTheDocument();
		expect(screen.getAllByRole("checkbox", { name: "Gesso" })).toHaveLength(1);
		await waitFor(async () => expect(await newButton()).toHaveFocus());
	});
});
