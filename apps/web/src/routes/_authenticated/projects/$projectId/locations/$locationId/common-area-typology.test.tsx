import type {
	LocationDetail,
	ProjectSummary,
	TypologyList,
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
	disciplineOf,
	droppedRoom,
	floor,
	locationIn,
	room,
	structureApi,
	structureOf,
	tower,
	typologyOf,
} from "@/test/structureApi";

const OBRA: ProjectSummary = { ...project(3), name: "Casa Moinhos" };

const second = floor(
	"2º andar",
	[{ name: "201", typology: "Tipologia A" }],
	[{ name: "Hall", typology: "Hall padrão" }, "Depósito"],
);
const towerA = tower("Torre A", [second]);
const structure = structureOf([towerA]);
const unit201 = nth(second.units, 0);
const hall = nth(second.commonAreas, 0);
const deposito = nth(second.commonAreas, 1);

const corredor = room("Corredor", { fromType: true, renamed: true });
const escada = room("Escada", { fromType: true });
const lixeira = room("Lixeira");
const elevadoresTaken = droppedRoom("Elevadores");

const hallPadrao = typologyOf(
	"Hall padrão",
	["Circulação", "Escada", "Elevadores"],
	{ locationType: "common_area", locations: 1, changed: 1 },
);
const corredorType = typologyOf("Corredor", ["Circulação"], {
	locationType: "common_area",
});
const TYPOLOGIES: TypologyList = {
	typologies: [
		typologyOf("Tipologia A", ["Sala", "Cozinha"], { locations: 1 }),
		hallPadrao,
		typologyOf("Tipologia B", ["Suíte"]),
		corredorType,
	],
};

const CHANGED: Partial<LocationDetail> = {
	rooms: [corredor, escada, lixeira],
	droppedRooms: [elevadoresTaken],
	changes: 3,
	disciplines: [disciplineOf("Hidráulica")],
};

function hallDetail(own: Partial<LocationDetail> = {}): LocationDetail {
	const found = locationIn(structure, hall.id, { [hall.id]: own });
	if (!found) throw new Error("The Hall is not in the structure.");
	return found;
}

interface Write {
	method: string;
	path: string;
	body: unknown;
}

function locationApi({
	details = { [hall.id]: CHANGED },
	summary = OBRA,
	answer,
}: {
	details?: Record<string, Partial<LocationDetail>>;
	summary?: ProjectSummary;
	answer?: (write: Write) => Promise<Response> | undefined;
} = {}) {
	const writes: Write[] = [];
	const base = `/api/projects/${OBRA.id}`;
	const handler: ApiHandler = combine(
		(url, init) => {
			const method = init?.method ?? "GET";
			if (method !== "GET" && url.pathname.startsWith(base)) {
				const write = {
					method,
					path: url.pathname.slice(base.length),
					body: init?.body ? (JSON.parse(String(init.body)) as unknown) : null,
				};
				writes.push(write);
				return answer?.(write);
			}
			if (url.pathname === `${base}/typologies`) return json(TYPOLOGIES);
			if (url.pathname === base) return json(summary);
			return undefined;
		},
		structureApi(OBRA.id, structure, details),
	);
	return { handler, writes };
}

function problem(status: number, code: string) {
	return json({ type: "about:blank", title: "Error", status, code }, status);
}

async function open(handler: ApiHandler, location = hall) {
	stubApi(signedIn, { api: handler });
	renderAt(`/projects/${OBRA.id}/locations/${location.id}`);
	await screen.findByRole("heading", { level: 1, name: location.name });
}

const changeButton = () =>
	screen.getByRole("button", { name: "Trocar tipologia" });

async function openTypeDialog() {
	await userEvent.click(changeButton());
	return screen.findByRole("dialog", {
		name: "Trocar a tipologia da área comum Hall",
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
	toast.dismiss();
});

describe("the Tipologia card of a common area", () => {
	test("says the area follows its typology, how many changes it has and what was changed only here", async () => {
		await open(locationApi().handler);

		expect(
			screen.getByText(
				"Os cômodos acompanham a tipologia Hall padrão. O que foi mudado só nesta área comum continua assim quando a tipologia muda.",
			),
		).toBeInTheDocument();
		expect(screen.getByText("3 alterações")).toBeInTheDocument();
		expect(changeButton()).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Voltar à tipologia" }),
		).toBeInTheDocument();
		const rooms = within(screen.getByRole("list", { name: "Cômodos" }))
			.getAllByRole("listitem")
			.map((item) => item.textContent);
		expect(rooms).toEqual([
			"Corredor",
			"Escada",
			"LixeiraSó desta área comum",
			"Adicionar cômodo",
		]);
		const dropped = screen.getByRole("list", {
			name: "Tirados desta área comum",
		});
		expect(dropped).toHaveTextContent("ElevadoresDa tipologia Hall padrão");
		expect(
			screen.getByRole("heading", { name: "Tirados desta área comum" }),
		).toBeInTheDocument();
	});

	test("offers Remover desta área comum on a room of the typology and Remover cômodo on its own", async () => {
		await open(locationApi().handler);

		await userEvent.click(
			screen.getByRole("button", { name: "Ações do cômodo Escada" }),
		);
		expect(
			await screen.findByRole("menuitem", { name: "Remover desta área comum" }),
		).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await userEvent.click(
			screen.getByRole("button", { name: "Ações do cômodo Lixeira" }),
		);
		expect(
			await screen.findByRole("menuitem", { name: "Remover cômodo" }),
		).toBeInTheDocument();
	});

	test("puts Tipologia above Disciplinas", async () => {
		await open(locationApi().handler);

		const headings = screen
			.getAllByRole("heading", { level: 2 })
			.map((heading) => heading.textContent);
		expect(headings.indexOf("Tipologia")).toBeGreaterThanOrEqual(0);
		expect(headings.indexOf("Tipologia")).toBeLessThan(
			headings.indexOf("Disciplinas"),
		);
	});

	test("says a common area without a typology keeps rooms of its own, and offers no return", async () => {
		await open(locationApi().handler, deposito);

		expect(screen.getByText("Sem tipologia")).toBeInTheDocument();
		expect(
			screen.getByText("Os cômodos desta área comum são só dela."),
		).toBeInTheDocument();
		expect(changeButton()).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Voltar à tipologia" }),
		).not.toBeInTheDocument();
	});

	test("shows no button on a delivered project", async () => {
		await open(
			locationApi({ summary: { ...OBRA, status: "delivered" } }).handler,
		);

		expect(
			screen.getByText(
				"Os cômodos acompanham a tipologia Hall padrão. O que foi mudado só nesta área comum continua assim quando a tipologia muda.",
			),
		).toBeInTheDocument();
		expect(within(screen.getByRole("main")).queryAllByRole("button")).toEqual(
			[],
		);
	});
});

describe("trocar tipologia on a common area", () => {
	test("lists only the common-area typologies and Sem tipologia, the current one chosen", async () => {
		await open(locationApi().handler);

		const dialog = await openTypeDialog();

		expect(dialog).toHaveTextContent(
			"Os cômodos passam a ser os da tipologia escolhida. Cômodo com pins continua na área comum.",
		);
		const options = await within(dialog).findAllByRole("radio");
		expect(options.map((option) => option.textContent)).toEqual([
			"Hall padrão3 cômodos",
			"Corredor1 cômodo",
			"Sem tipologiaCômodos só desta área comum",
		]);
		expect(nth(options, 0)).toBeChecked();
	});

	test("starts the area over on the chosen typology, says so and returns focus to the button", async () => {
		const circulacao = room("Circulação", { fromType: true });
		const { handler, writes } = locationApi({
			answer: () =>
				json(
					hallDetail({
						typology: { id: corredorType.id, name: "Corredor" },
						rooms: [circulacao],
						changes: 0,
					}),
				),
		});
		await open(handler);
		const dialog = await openTypeDialog();

		await userEvent.click(
			await within(dialog).findByRole("radio", { name: /Corredor/ }),
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Trocar" }),
		);

		expect(
			await screen.findByText(
				"A área comum Hall agora segue a tipologia Corredor.",
			),
		).toBeInTheDocument();
		expect(writes).toEqual([
			{
				method: "PUT",
				path: `/locations/${hall.id}/typology`,
				body: { typologyId: corredorType.id },
			},
		]);
		await waitFor(() => expect(changeButton()).toHaveFocus());
	});

	test("leaves the area without a typology and says so", async () => {
		const { handler, writes } = locationApi({
			answer: () =>
				json(
					hallDetail({
						typology: null,
						rooms: [room("Corredor"), room("Escada"), room("Lixeira")],
						changes: 0,
					}),
				),
		});
		await open(handler);
		const dialog = await openTypeDialog();

		await userEvent.click(
			await within(dialog).findByRole("radio", { name: /Sem tipologia/ }),
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Trocar" }),
		);

		expect(
			await screen.findByText("A área comum Hall ficou sem tipologia."),
		).toBeInTheDocument();
		expect(writes[0]?.body).toEqual({ typologyId: null });
		expect(
			screen.getByText("Os cômodos desta área comum são só dela."),
		).toBeInTheDocument();
	});

	test.each([
		["Cancelar", () => userEvent.click(screen.getByText("Cancelar"))],
		["Esc", () => userEvent.keyboard("{Escape}")],
	])("returns focus to the button when closed with %s", async (_how, close) => {
		await open(locationApi().handler);
		await openTypeDialog();

		await close();

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		await waitFor(() => expect(changeButton()).toHaveFocus());
	});
});

describe("trocar tipologia on a unit", () => {
	test("lists only the unit typologies", async () => {
		await open(locationApi().handler, unit201);

		await userEvent.click(changeButton());
		const dialog = await screen.findByRole("dialog", {
			name: "Trocar a tipologia da 201",
		});

		const options = await within(dialog).findAllByRole("radio");
		expect(options.map((option) => option.textContent)).toEqual([
			"Tipologia A2 cômodos",
			"Tipologia B1 cômodo",
			"Sem tipologiaCômodos só desta unidade",
		]);
	});

	test("returns focus to the button when closed with Esc", async () => {
		await open(locationApi().handler, unit201);
		await userEvent.click(changeButton());
		await screen.findByRole("dialog", { name: "Trocar a tipologia da 201" });

		await userEvent.keyboard("{Escape}");

		await waitFor(() => expect(changeButton()).toHaveFocus());
	});
});

describe("voltar à tipologia on a common area", () => {
	test("drops the changes and says the area returned to its typology", async () => {
		const { handler, writes } = locationApi({
			answer: () =>
				json(
					hallDetail({
						rooms: [
							room("Circulação", { fromType: true }),
							room("Escada", { fromType: true }),
							room("Elevadores", { fromType: true }),
						],
						changes: 0,
					}),
				),
		});
		await open(handler);

		await userEvent.click(
			screen.getByRole("button", { name: "Voltar à tipologia" }),
		);

		expect(
			await screen.findByText(
				"A área comum Hall voltou à tipologia Hall padrão.",
			),
		).toBeInTheDocument();
		expect(writes).toEqual([
			{
				method: "POST",
				path: `/locations/${hall.id}/typology/reset`,
				body: null,
			},
		]);
		expect(
			screen.queryByRole("button", { name: "Voltar à tipologia" }),
		).not.toBeInTheDocument();
	});

	test("toasts when it fails", async () => {
		const { handler } = locationApi({
			answer: () => problem(500, "INTERNAL_ERROR"),
		});
		await open(handler);

		await userEvent.click(
			screen.getByRole("button", { name: "Voltar à tipologia" }),
		);

		expect(
			await screen.findByText(
				"Não foi possível voltar a área comum Hall à tipologia. Confira sua conexão e tente de novo.",
			),
		).toBeInTheDocument();
	});
});
