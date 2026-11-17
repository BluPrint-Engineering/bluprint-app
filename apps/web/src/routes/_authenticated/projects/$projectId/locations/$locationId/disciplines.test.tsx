import {
	LOCATION_NOT_FOUND,
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
import {
	combine,
	disciplineOf,
	disciplinesApi,
	floor,
	structureApi,
	structureOf,
	tower,
} from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const OBRA: ProjectSummary = { ...project(3), name: "Casa Moinhos" };

const second = floor("2º andar", ["201", "202"], ["Hall"]);
const towerA = tower("Torre A", [second], ["Salão de festas"]);
const structure = structureOf([towerA, tower("Torre B")], ["Guarita"]);
const unit201 = nth(second.units, 0);
const hall = nth(second.commonAreas, 0);

const hidraulica = disciplineOf("Hidráulica");
const eletrica = disciplineOf("Elétrica");
const pintura = disciplineOf("Pintura");

const ALL_ON = [hidraulica, eletrica, pintura];

function problem(status: number, code: string) {
	return json({ type: "about:blank", title: "Error", status, code }, status);
}

function serverFor(
	disciplines: Record<string, LocationDetail["disciplines"]>,
	{
		summary = OBRA,
		answer,
	}: {
		summary?: ProjectSummary;
		answer?: Parameters<typeof disciplinesApi>[2];
	} = {},
) {
	const details = Object.fromEntries(
		Object.entries(disciplines).map(([id, list]) => [
			id,
			{ disciplines: list },
		]),
	);
	const api = disciplinesApi(OBRA.id, details, answer);
	const handler: ApiHandler = combine(
		api.handler,
		(url) =>
			url.pathname === `/api/projects/${OBRA.id}` ? json(summary) : undefined,
		structureApi(OBRA.id, structure, details),
	);
	return { handler, writes: api.writes };
}

async function open(handler: ApiHandler, locationId: string, title: string) {
	const stubbed = stubApi(signedIn, { api: handler });
	renderAt(`/projects/${OBRA.id}/locations/${locationId}`);
	await screen.findByRole("heading", { level: 1, name: title });
	return stubbed;
}

const box = (name: string) => screen.getByRole("checkbox", { name });
const list = () => screen.getByRole("list", { name: "Disciplinas" });

afterEach(() => {
	vi.unstubAllGlobals();
	toast.dismiss();
	setViewport("desktop");
});

describe("the Disciplinas card of a unit", () => {
	test("lists every discipline with its box marked and counts them", async () => {
		const { handler } = serverFor({ [unit201.id]: ALL_ON });
		await open(handler, unit201.id, "201");

		expect(await screen.findByText("3 de 3")).toBeInTheDocument();
		for (const { name } of ALL_ON) expect(box(name)).toBeChecked();
		expect(
			screen.getByText(
				"Geral vale em todo local e não entra na lista. Pin novo aqui oferece Hidráulica, Elétrica e Pintura.",
			),
		).toBeInTheDocument();
		expect(
			screen.queryByText("Desligada neste local."),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Salvar" }),
		).not.toBeInTheDocument();
	});

	test("sits below the Tipologia card", async () => {
		const { handler } = serverFor({ [unit201.id]: ALL_ON });
		await open(handler, unit201.id, "201");
		await screen.findByText("3 de 3");

		const tipologia = screen.getByRole("heading", {
			level: 2,
			name: "Tipologia",
		});
		const disciplinas = screen.getByRole("heading", {
			level: 2,
			name: "Disciplinas",
		});

		expect(
			tipologia.compareDocumentPosition(disciplinas) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	test("saves a box the moment it is unticked, with no Salvar, and counts 2 of 3", async () => {
		const { handler, writes } = serverFor({ [unit201.id]: ALL_ON });
		await open(handler, unit201.id, "201");
		await screen.findByText("3 de 3");

		await userEvent.click(box("Pintura"));

		expect(await screen.findByText("2 de 3")).toBeInTheDocument();
		expect(writes).toEqual([
			{ locationId: unit201.id, disciplineId: pintura.id, applies: false },
		]);
		expect(box("Pintura")).not.toBeChecked();
		expect(box("Hidráulica")).toBeChecked();
		expect(within(list()).getAllByText("Desligada neste local.")).toHaveLength(
			1,
		);
		expect(
			screen.getByText(
				"Geral vale em todo local e não entra na lista. Pin novo aqui oferece Hidráulica e Elétrica.",
			),
		).toBeInTheDocument();
	});

	test("ticks a discipline that was off", async () => {
		const { handler, writes } = serverFor({
			[unit201.id]: [hidraulica, eletrica, { ...pintura, applies: false }],
		});
		await open(handler, unit201.id, "201");
		await screen.findByText("2 de 3");

		await userEvent.click(box("Pintura"));

		expect(await screen.findByText("3 de 3")).toBeInTheDocument();
		expect(writes).toEqual([
			{ locationId: unit201.id, disciplineId: pintura.id, applies: true },
		]);
	});

	test("unticks the box at once but keeps the count until the save is answered", async () => {
		let release: (response: Response) => void = () => {};
		const { handler } = serverFor(
			{ [unit201.id]: ALL_ON },
			{
				answer: () =>
					new Promise<Response>((resolve) => {
						release = resolve;
					}),
			},
		);
		await open(handler, unit201.id, "201");
		await screen.findByText("3 de 3");

		await userEvent.click(box("Pintura"));

		expect(box("Pintura")).not.toBeChecked();
		expect(screen.getByText("3 de 3")).toBeInTheDocument();
		release(
			new Response(
				JSON.stringify({
					disciplines: [hidraulica, eletrica, { ...pintura, applies: false }],
				}),
			),
		);
		expect(await screen.findByText("2 de 3")).toBeInTheDocument();
	});

	test("puts the box back, keeps the count and toasts with the unit's name when the save fails", async () => {
		const { handler, writes } = serverFor(
			{ [unit201.id]: ALL_ON },
			{ answer: () => problem(500, "INTERNAL_ERROR") },
		);
		await open(handler, unit201.id, "201");
		await screen.findByText("3 de 3");

		await userEvent.click(box("Pintura"));

		expect(
			await screen.findByText(
				"As disciplinas da 201 não mudaram. Confira a conexão e tente de novo.",
			),
		).toBeInTheDocument();
		await waitFor(() => expect(box("Pintura")).toBeChecked());
		expect(screen.getByText("3 de 3")).toBeInTheDocument();
		expect(writes).toHaveLength(1);
	});

	test("shows an informative alert, and no Geral sentence, when none is on", async () => {
		const { handler } = serverFor({
			[unit201.id]: ALL_ON.map((each) => ({ ...each, applies: false })),
		});
		await open(handler, unit201.id, "201");

		expect(await screen.findByText("0 de 3")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Nenhuma disciplina específica ligada. Pin novo aqui, nem na Geral, só depois de ligar uma.",
			),
		).toBeInTheDocument();
		expect(
			screen.queryByText(/Geral vale em todo local/),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Desligada neste local."),
		).not.toBeInTheDocument();
	});
});

describe("the Disciplinas card of the other locations", () => {
	test("a common area names itself in the failure toast and has no list sentence", async () => {
		const { handler } = serverFor(
			{ [hall.id]: ALL_ON },
			{ answer: () => problem(500, "INTERNAL_ERROR") },
		);
		await open(handler, hall.id, "Hall");
		await screen.findByText("3 de 3");

		await userEvent.click(box("Pintura"));

		expect(
			await screen.findByText(
				"As disciplinas do Hall não mudaram. Confira a conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(
			screen.queryByText(/Esta lista vale só para/),
		).not.toBeInTheDocument();
	});

	test("a floor has its own list, says so, and sits above the common areas", async () => {
		const { handler } = serverFor(
			{
				[second.id]: [hidraulica, eletrica, { ...pintura, applies: false }],
			},
			{ answer: () => problem(500, "INTERNAL_ERROR") },
		);
		await open(handler, second.id, "2º andar");

		expect(await screen.findByText("2 de 3")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Esta lista vale só para o andar. As unidades e áreas comuns têm suas próprias listas.",
			),
		).toBeInTheDocument();
		const areas = screen.getByRole("heading", {
			level: 2,
			name: "Áreas comuns do andar",
		});
		expect(
			screen
				.getByRole("heading", { level: 2, name: "Disciplinas" })
				.compareDocumentPosition(areas) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();

		await userEvent.click(box("Hidráulica"));
		expect(
			await screen.findByText(
				"As disciplinas do 2º andar não mudaram. Confira a conexão e tente de novo.",
			),
		).toBeInTheDocument();
	});

	test("a floor with none on shows the alert and its own-list sentence", async () => {
		const { handler } = serverFor({
			[second.id]: ALL_ON.map((each) => ({ ...each, applies: false })),
		});
		await open(handler, second.id, "2º andar");

		expect(
			await screen.findByText(
				"Nenhuma disciplina específica ligada. Pin novo aqui, nem na Geral, só depois de ligar uma.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Esta lista vale só para o andar. As unidades e áreas comuns têm suas próprias listas.",
			),
		).toBeInTheDocument();
	});

	test("a tower has its own list, says so, and fails with its name", async () => {
		const { handler } = serverFor(
			{ [towerA.id]: [hidraulica, eletrica, { ...pintura, applies: false }] },
			{ answer: () => problem(500, "INTERNAL_ERROR") },
		);
		await open(handler, towerA.id, "Torre A");

		expect(await screen.findByText("2 de 3")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Esta lista vale só para a torre. Os andares, unidades e áreas comuns têm suas próprias listas.",
			),
		).toBeInTheDocument();
		await userEvent.click(box("Elétrica"));
		expect(
			await screen.findByText(
				"As disciplinas da Torre A não mudaram. Confira a conexão e tente de novo.",
			),
		).toBeInTheDocument();
	});

	test.each(["desktop", "phone"] as const)(
		"a tower's card comes before its common areas on a %s",
		async (viewport) => {
			setViewport(viewport);
			const { handler } = serverFor({ [towerA.id]: ALL_ON });
			await open(handler, towerA.id, "Torre A");
			await screen.findByText("3 de 3");

			expect(
				screen
					.getByRole("heading", { level: 2, name: "Disciplinas" })
					.compareDocumentPosition(
						screen.getByRole("heading", {
							level: 2,
							name: "Áreas comuns da torre",
						}),
					) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		},
	);
});

describe("a delivered project", () => {
	const delivered: ProjectSummary = { ...OBRA, status: "delivered" };

	test("reads each discipline with an icon, its name and whether it is on, with no box", async () => {
		const { handler } = serverFor(
			{ [unit201.id]: [hidraulica, eletrica, { ...pintura, applies: false }] },
			{ summary: delivered },
		);
		await open(handler, unit201.id, "201");

		expect(await screen.findByText("2 de 3")).toBeInTheDocument();
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
		expect(
			within(list())
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual([
			"Hidráulica · ligada",
			"Elétrica · ligada",
			"Pintura · desligada",
		]);
	});

	test.each([
		["2º andar", second.id],
		["Torre A", towerA.id],
	])("the page of %s reads the same way", async (title, id) => {
		const { handler } = serverFor(
			{ [id]: [hidraulica, eletrica, { ...pintura, applies: false }] },
			{ summary: delivered },
		);
		await open(handler, id, title);

		expect(await screen.findByText("2 de 3")).toBeInTheDocument();
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
		expect(screen.getByText("Pintura · desligada")).toBeInTheDocument();
	});
});

describe("a project delivered under an old tab", () => {
	test("turns the card read-only when the save answers PROJECT_DELIVERED", async () => {
		let deliveredNow = false;
		const base = serverFor(
			{ [unit201.id]: ALL_ON },
			{
				answer: () => {
					deliveredNow = true;
					return problem(409, PROJECT_DELIVERED);
				},
			},
		);
		const handler: ApiHandler = (url, init) =>
			url.pathname === `/api/projects/${OBRA.id}` && deliveredNow
				? json({ ...OBRA, status: "delivered" })
				: base.handler(url, init);
		await open(handler, unit201.id, "201");
		await screen.findByText("3 de 3");

		await userEvent.click(box("Pintura"));

		await waitFor(() => {
			expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
		});
		expect(screen.getByText("Pintura · ligada")).toBeInTheDocument();
	});

	test("reloads the location when it is already gone", async () => {
		const { handler } = serverFor(
			{ [unit201.id]: ALL_ON },
			{ answer: () => problem(404, LOCATION_NOT_FOUND) },
		);
		const { fetchMock } = await open(handler, unit201.id, "201");
		await screen.findByText("3 de 3");
		const reads = () =>
			fetchMock.mock.calls.filter(
				([input, init]) =>
					String(input) ===
						`/api/projects/${OBRA.id}/locations/${unit201.id}` &&
					(init?.method ?? "GET") === "GET",
			).length;
		const before = reads();

		await userEvent.click(box("Pintura"));

		await waitFor(() => expect(reads()).toBeGreaterThan(before));
	});
});
