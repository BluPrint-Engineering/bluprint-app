import type {
	DisciplineBatch,
	LocationDetail,
	ProjectSummary,
} from "@bluprint/shared";
import { focusManager } from "@tanstack/react-query";
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
	baseCatalog,
	batchApi,
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
	answer,
	secondTower = false,
}: {
	summary?: ProjectSummary;
	answer?: (body: DisciplineBatch, attempt: number) => Response | undefined;
	secondTower?: boolean;
} = {}) {
	const second = floor("2º andar", ["201", "202", "203"], ["Hall"]);
	const third = floor("3º andar", ["301"]);
	const ground = floor("Térreo");
	const towerA = tower("Torre A", [second, third, ground], ["Salão"]);
	const towerB = tower("Torre B", [floor("1º andar", ["101"])]);
	const structure = structureOf(secondTower ? [towerA, towerB] : [towerA], [
		"Garagem",
	]);
	const pintura = catalogDiscipline("Pintura");
	const gesso = catalogDiscipline("Gesso", { appliesEverywhere: false });
	const catalog = [...baseCatalog(), pintura, gesso];
	const idOf = (name: string) => {
		const found = catalog.find((each) => each.name === name);
		if (!found) throw new Error(`no discipline ${name}`);
		return found.id;
	};
	const listed = (applies: Record<string, boolean>) =>
		catalog
			.filter(({ type }) => type !== "general")
			.map(({ id, name }) => ({ id, name, applies: applies[name] ?? false }));
	const leaf = { Hidráulica: true, Elétrica: true, Pintura: true };
	const parent = { Hidráulica: true, Elétrica: true };
	const unit201 = nth(second.units, 0);
	const details: Record<string, Partial<LocationDetail>> = {
		[unit201.id]: {
			disciplines: listed({ Hidráulica: true, Elétrica: true, Gesso: true }),
		},
		[nth(second.units, 1).id]: { disciplines: listed(leaf) },
		[nth(second.units, 2).id]: { disciplines: listed(leaf) },
		[nth(second.commonAreas, 0).id]: { disciplines: listed(leaf) },
		[nth(third.units, 0).id]: { disciplines: listed(leaf) },
		[nth(towerA.commonAreas, 0).id]: { disciplines: listed(leaf) },
		[nth(structure.commonAreas, 0).id]: { disciplines: listed(leaf) },
		[second.id]: { disciplines: listed(parent) },
		[third.id]: { disciplines: listed(parent) },
		[ground.id]: { disciplines: listed(parent) },
		[towerA.id]: { disciplines: listed(parent) },
		[towerB.id]: { disciplines: listed(parent) },
	};
	const catalogServer = catalogApi(OBRA.id, structure, details, { catalog });
	const batches = batchApi(OBRA.id, structure, details, answer);
	const current = { summary };
	const handler: ApiHandler = combine(
		batches.handler,
		catalogServer.handler,
		(url) =>
			url.pathname === `/api/projects/${OBRA.id}`
				? json(current.summary)
				: undefined,
		structureApi(OBRA.id, structure, details),
	);
	return {
		handler,
		current,
		received: batches.received,
		catalog,
		idOf,
		structure,
		second,
		third,
		ground,
		towerA,
		towerB,
		unit201,
		unit202: nth(second.units, 1),
		unit203: nth(second.units, 2),
		hall: nth(second.commonAreas, 0),
		salao: nth(towerA.commonAreas, 0),
		garagem: nth(structure.commonAreas, 0),
	};
}

type Server = ReturnType<typeof serverFor>;

function response(status: number, body: object) {
	return new Response(JSON.stringify(body), { status });
}

async function open(server: Server, locationId: string, title: string) {
	const stubbed = stubApi(signedIn, { api: server.handler });
	renderAt(`/projects/${OBRA.id}/locations/${locationId}`);
	await screen.findByRole("heading", { level: 1, name: title });
	await waitFor(() =>
		expect(
			screen.getByRole("button", {
				name: /^Aplicar (às unidades e áreas comuns|a outros locais)$/,
			}),
		).toBeEnabled(),
	);
	return stubbed;
}

const cardButton = () =>
	screen.getByRole("button", {
		name: /^Aplicar (às unidades e áreas comuns|a outros locais)$/,
	});
const dialog = () =>
	screen.getByRole("dialog", { name: "Disciplinas em lote" });
const hiddenDialog = () =>
	screen.getByRole("dialog", { name: "Disciplinas em lote", hidden: true });
const inside = () => within(dialog());
const applyButton = () =>
	inside().getByRole("button", { name: /^(Aplicar|Aplicando…)/ });
const box = (name: string) => inside().getByRole("checkbox", { name });
const mode = (name: "Locais" | "Um andar" | "Uma torre") =>
	inside().getByRole("radio", { name });
const select = (name: "Torre" | "Andar") =>
	inside().getByRole("combobox", { name });

async function toggle(...names: string[]) {
	for (const name of names) await user.click(box(name));
}

async function openFromCard() {
	await user.click(cardButton());
	return dialog();
}

async function openFromMenu(menu: string) {
	await user.click(await screen.findByRole("button", { name: menu }));
	await user.click(
		await screen.findByRole("menuitem", { name: "Disciplinas em lote" }),
	);
	return dialog();
}

const checkedNames = () =>
	within(dialog())
		.getAllByRole("checkbox")
		.filter((each) => each.getAttribute("aria-checked") === "true")
		.map((each) => each.getAttribute("aria-labelledby"))
		.map((id) => document.getElementById(id ?? "")?.textContent);

afterEach(() => {
	focusManager.setFocused(undefined);
	vi.unstubAllGlobals();
	localStorage.clear();
	toast.dismiss();
	setViewport("desktop");
});

describe("how the batch opens", () => {
	test("from a unit, opens on Locais at its floor with it marked and the boxes as its list", async () => {
		const server = serverFor();
		await open(server, server.unit201.id, "201");

		await openFromCard();

		expect(mode("Locais")).toBeChecked();
		expect(select("Andar")).toHaveValue(server.second.id);
		expect(
			inside().queryByRole("combobox", { name: "Torre" }),
		).not.toBeInTheDocument();
		expect(checkedNames()).toEqual(["201", "Hidráulica", "Elétrica", "Gesso"]);
		expect(inside().getAllByRole("checkbox")).toHaveLength(4 + 4);
		expect(inside().queryByRole("checkbox", { name: "Geral" })).toBeNull();
		expect(inside().getByText("Marque os locais deste andar.")).toBeVisible();
		expect(
			inside().getByText("Geral vale em todo local e não entra na lista."),
		).toBeVisible();
		expect(applyButton()).toHaveTextContent("Aplicar a 1 local");
		expect(applyButton()).toBeEnabled();
	});

	test("from a common area of a floor, opens on Locais with it marked", async () => {
		const server = serverFor();
		await open(server, server.hall.id, "Hall");

		await openFromCard();

		expect(mode("Locais")).toBeChecked();
		expect(checkedNames()).toEqual([
			"Hall",
			"Hidráulica",
			"Elétrica",
			"Pintura",
		]);
	});

	test("from a floor, opens on Um andar at that floor with the whole-project disciplines marked", async () => {
		const server = serverFor();
		await open(server, server.second.id, "2º andar");

		await openFromCard();

		expect(mode("Um andar")).toBeChecked();
		expect(select("Andar")).toHaveValue(server.second.id);
		expect(checkedNames()).toEqual(["Hidráulica", "Elétrica", "Pintura"]);
		expect(
			inside().getByText(
				"O lote muda as unidades e áreas comuns dali. A lista do próprio andar ou torre não muda.",
			),
		).toBeVisible();
		expect(applyButton()).toHaveTextContent("Aplicar a 4 locais");
	});

	test("from a tower, opens on Uma torre with the count of every floor and the tower's own areas", async () => {
		const server = serverFor();
		await open(server, server.towerA.id, "Torre A");

		await openFromCard();

		expect(mode("Uma torre")).toBeChecked();
		expect(checkedNames()).toEqual(["Hidráulica", "Elétrica", "Pintura"]);
		expect(applyButton()).toHaveTextContent("Aplicar a 6 locais");
	});

	test("from the project's Garagem, opens on Locais with the Garagem · este local row marked and unmarkable", async () => {
		const server = serverFor();
		await open(server, server.garagem.id, "Garagem");

		await openFromCard();

		expect(mode("Locais")).toBeChecked();
		expect(select("Andar")).toHaveValue(server.second.id);
		const first = inside().getAllByRole("checkbox")[0];
		expect(first).toBe(box("Garagem · este local"));
		expect(first).toBeChecked();
		expect(box("201")).not.toBeChecked();
		expect(applyButton()).toHaveTextContent("Aplicar a 1 local");

		await toggle("Garagem · este local");

		expect(applyButton()).toHaveTextContent(/^Aplicar$/);
		expect(applyButton()).toBeDisabled();
	});

	test("from a common area of a tower, shows its own row above the floor it opens on", async () => {
		const server = serverFor();
		await open(server, server.salao.id, "Salão");

		await openFromCard();

		expect(box("Salão · este local")).toBeChecked();
		expect(select("Andar")).toHaveValue(server.second.id);
	});

	test("offers a tower choice only when the project has more than one", async () => {
		const server = serverFor({ secondTower: true });
		await open(server, server.unit201.id, "201");
		await openFromCard();

		expect(select("Torre")).toHaveValue(server.towerA.id);

		await user.selectOptions(select("Torre"), server.towerB.id);

		expect(select("Andar")).toHaveValue(nth(server.towerB.floors, 0).id);
		expect(box("101")).not.toBeChecked();
		expect(applyButton()).toHaveTextContent(/^Aplicar$/);
		expect(applyButton()).toBeDisabled();
	});

	test("shows the empty sentence and turns the button off for a floor and a tower with nothing", async () => {
		const server = serverFor({ secondTower: true });
		await open(server, server.second.id, "2º andar");
		await openFromCard();

		await user.selectOptions(select("Andar"), server.ground.id);

		expect(
			inside().getByText("Este andar não tem unidade nem área comum."),
		).toBeVisible();
		expect(applyButton()).toBeDisabled();

		await user.click(mode("Uma torre"));
		await user.selectOptions(select("Torre"), server.towerB.id);
		await user.click(mode("Um andar"));
		await user.selectOptions(select("Torre"), server.towerA.id);
		await user.selectOptions(select("Andar"), server.ground.id);
		await user.click(mode("Locais"));

		expect(
			inside().getByText("Este andar não tem unidade nem área comum."),
		).toBeVisible();
		expect(applyButton()).toBeDisabled();
	});
});

describe("where the batch is offered", () => {
	test("offers the item in the menu of a floor and a tower, never in the menu of a row", async () => {
		const server = serverFor();
		await open(server, server.second.id, "2º andar");

		await user.click(
			await screen.findByRole("button", { name: "Ações da unidade 201" }),
		);
		await screen.findByRole("menuitem", { name: "Renomear" });
		expect(
			screen.queryByRole("menuitem", { name: "Disciplinas em lote" }),
		).not.toBeInTheDocument();
		await user.keyboard("{Escape}");

		await user.click(screen.getByRole("button", { name: "Ações do andar" }));
		expect(
			await screen.findByRole("menuitem", { name: "Disciplinas em lote" }),
		).toBeVisible();
	});

	test("offers nothing in a delivered project", async () => {
		const server = serverFor({ summary: { ...OBRA, status: "delivered" } });
		stubApi(signedIn, { api: server.handler });
		renderAt(`/projects/${OBRA.id}/locations/${server.second.id}`);
		await screen.findByRole("heading", { level: 1, name: "2º andar" });
		await screen.findByText("Hidráulica · ligada");

		expect(
			screen.queryByRole("button", {
				name: "Aplicar às unidades e áreas comuns",
			}),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Ações do andar" }),
		).not.toBeInTheDocument();
	});
});

describe("what the batch sends", () => {
	test("sends a floor with the boxes as on and off, and tells the number the server answered", async () => {
		const server = serverFor();
		await open(server, server.second.id, "2º andar");
		await openFromCard();

		await toggle("Hidráulica", "Pintura");
		server.second.units.push({
			id: "0190b000-0000-7000-8000-00000000f204",
			name: "204",
			typology: null,
			changes: 0,
		});
		expect(applyButton()).toHaveTextContent("Aplicar a 4 locais");
		await user.click(applyButton());

		expect(
			await screen.findByText("Disciplinas aplicadas a 5 locais."),
		).toBeVisible();
		expect(server.received).toEqual([
			{
				target: { type: "floor", locationId: server.second.id },
				on: [server.idOf("Elétrica")],
				off: [
					server.idOf("Hidráulica"),
					server.idOf("Pintura"),
					server.idOf("Gesso"),
				],
			},
		]);
		expect(
			screen.queryByRole("dialog", { name: "Disciplinas em lote" }),
		).not.toBeInTheDocument();
	});

	test("sends a tower", async () => {
		const server = serverFor();
		await open(server, server.towerA.id, "Torre A");
		await openFromCard();

		await toggle("Gesso");
		await user.click(applyButton());

		expect(
			await screen.findByText("Disciplinas aplicadas a 6 locais."),
		).toBeVisible();
		expect(server.received).toEqual([
			{
				target: { type: "tower", locationId: server.towerA.id },
				on: [
					server.idOf("Hidráulica"),
					server.idOf("Elétrica"),
					server.idOf("Pintura"),
					server.idOf("Gesso"),
				],
				off: [],
			},
		]);
	});

	test("sends the chosen locations in the order of the floor and refreshes the page it was opened from", async () => {
		const server = serverFor();
		await open(server, server.unit201.id, "201");
		await screen.findByText("3 de 4");
		await openFromCard();

		await toggle("202", "Hidráulica");
		expect(applyButton()).toHaveTextContent("Aplicar a 2 locais");
		await user.click(applyButton());

		expect(
			await screen.findByText("Disciplinas aplicadas a 2 locais."),
		).toBeVisible();
		expect(server.received).toEqual([
			{
				target: {
					type: "locations",
					locationIds: [server.unit201.id, server.unit202.id],
				},
				on: [server.idOf("Elétrica"), server.idOf("Gesso")],
				off: [server.idOf("Hidráulica"), server.idOf("Pintura")],
			},
		]);
		expect(await screen.findByText("2 de 4")).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: "Hidráulica" }),
		).not.toBeChecked();
	});

	test("sends the Garagem as a chosen location together with the floor's", async () => {
		const server = serverFor();
		await open(server, server.garagem.id, "Garagem");
		await openFromCard();

		await toggle("Hall");
		await user.click(applyButton());
		await screen.findByText("Disciplinas aplicadas a 2 locais.");

		expect(server.received).toHaveLength(1);
		expect(nth(server.received, 0).target).toEqual({
			type: "locations",
			locationIds: [server.garagem.id, server.hall.id],
		});
	});

	test("names only the disciplines the dialog showed when another person creates one meanwhile", async () => {
		const server = serverFor();
		await open(server, server.second.id, "2º andar");
		await openFromCard();

		server.catalog.push(catalogDiscipline("Gesso cartonado"));
		focusManager.setFocused(false);
		focusManager.setFocused(true);
		await user.click(applyButton());
		await screen.findByText("Disciplinas aplicadas a 4 locais.");

		const sent = nth(server.received, 0);
		expect([...sent.on, ...sent.off].sort()).toEqual(
			[
				server.idOf("Hidráulica"),
				server.idOf("Elétrica"),
				server.idOf("Pintura"),
				server.idOf("Gesso"),
			].sort(),
		);
	});

	test("sends once when Aplicar is tapped twice, showing Aplicando…", async () => {
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
		stubApi(signedIn, { api: slow });
		renderAt(`/projects/${OBRA.id}/locations/${server.second.id}`);
		await screen.findByRole("heading", { level: 1, name: "2º andar" });
		await waitFor(() => expect(cardButton()).toBeEnabled());
		await openFromCard();

		await user.dblClick(applyButton());

		expect(applyButton()).toHaveTextContent("Aplicando…");
		expect(applyButton()).toBeDisabled();
		release();
		await screen.findByText("Disciplinas aplicadas a 4 locais.");
		expect(server.received).toHaveLength(1);
	});
});

describe("what the batch refuses", () => {
	test("tells that nothing changed, reloads the structure and keeps the surviving locations marked when one is gone", async () => {
		const server = serverFor();
		await open(server, server.unit201.id, "201");
		await openFromCard();
		await toggle("202", "203");
		expect(applyButton()).toHaveTextContent("Aplicar a 3 locais");

		server.second.units.splice(1, 1);
		await user.click(applyButton());

		const alert = await inside().findByRole("alert");
		expect(alert).toHaveTextContent("Nada mudou");
		expect(alert).toHaveTextContent(
			"Um dos locais marcados não existe mais. Confira a lista e aplique de novo.",
		);
		await waitFor(() =>
			expect(inside().queryByRole("checkbox", { name: "202" })).toBeNull(),
		);
		expect(box("201")).toBeChecked();
		expect(box("203")).toBeChecked();
		expect(applyButton()).toHaveTextContent("Aplicar a 2 locais");
		expect(applyButton()).toBeEnabled();
	});

	test("drops the este local row and keeps the floor's marked when the area it was opened from is gone", async () => {
		const server = serverFor();
		await open(server, server.garagem.id, "Garagem");
		await openFromCard();
		await toggle("Hall");
		expect(applyButton()).toHaveTextContent("Aplicar a 2 locais");

		server.structure.commonAreas.splice(0, 1);
		await user.click(applyButton());

		expect(await inside().findByRole("alert")).toHaveTextContent(
			"Um dos locais marcados não existe mais. Confira a lista e aplique de novo.",
		);
		await waitFor(() =>
			expect(
				inside().queryByRole("checkbox", { name: "Garagem · este local" }),
			).toBeNull(),
		);
		expect(box("Hall")).toBeChecked();
		expect(applyButton()).toHaveTextContent("Aplicar a 1 local");

		await user.click(applyButton());
		await screen.findByText("Disciplinas aplicadas a 1 local.");
		expect(nth(server.received, 1).target).toEqual({
			type: "locations",
			locationIds: [server.hall.id],
		});
	});

	test("tells to check the connection and stays as it was when there is no answer", async () => {
		const server = serverFor();
		let lost = false;
		const lossy: ApiHandler = (url, init) => {
			if (init?.method === "POST" && !lost) {
				lost = true;
				return Promise.reject(new TypeError("Failed to fetch"));
			}
			return server.handler(url, init);
		};
		stubApi(signedIn, { api: lossy });
		renderAt(`/projects/${OBRA.id}/locations/${server.unit201.id}`);
		await screen.findByRole("heading", { level: 1, name: "201" });
		await waitFor(() => expect(cardButton()).toBeEnabled());
		await openFromCard();
		await toggle("202");

		await user.click(applyButton());

		const alert = await inside().findByRole("alert");
		expect(alert).toHaveTextContent("Nada mudou");
		expect(alert).toHaveTextContent("Confira a conexão e tente de novo.");
		expect(checkedNames()).toEqual([
			"201",
			"202",
			"Hidráulica",
			"Elétrica",
			"Gesso",
		]);
		expect(applyButton()).toBeEnabled();

		await user.click(applyButton());

		expect(
			await screen.findByText("Disciplinas aplicadas a 2 locais."),
		).toBeVisible();
		expect(inside).toBeDefined();
	});

	test("tells nothing for a delivered project and closes with the page", async () => {
		const server: Server = serverFor({
			answer: () => {
				server.current.summary = { ...OBRA, status: "delivered" };
				return response(409, {
					type: "about:blank",
					title: "Conflict",
					status: 409,
					code: "PROJECT_DELIVERED",
				});
			},
		});
		await open(server, server.second.id, "2º andar");
		await openFromCard();

		await user.click(applyButton());

		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Disciplinas em lote" }),
			).not.toBeInTheDocument(),
		);
	});
});

describe("creating a discipline from inside the batch", () => {
	test("comes back with the target and the boxes as they were and the new one marked", async () => {
		const server = serverFor();
		await open(server, server.unit201.id, "201");
		await openFromCard();
		await toggle("202", "Hidráulica");

		await user.click(inside().getByRole("button", { name: "Nova disciplina" }));
		const creating = screen.getByRole("dialog", { name: "Nova disciplina" });
		await user.type(
			within(creating).getByRole("textbox", { name: "Nome" }),
			"Tinta",
		);
		await user.click(
			within(creating).getByRole("radio", { name: "Na obra toda" }),
		);
		await user.click(within(creating).getByRole("button", { name: "Criar" }));

		expect(await screen.findByText("Disciplina Tinta criada.")).toBeVisible();
		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Nova disciplina" }),
			).not.toBeInTheDocument(),
		);
		expect(mode("Locais")).toBeChecked();
		expect(checkedNames()).toEqual([
			"201",
			"202",
			"Elétrica",
			"Gesso",
			"Tinta",
		]);
		expect(applyButton()).toHaveTextContent("Aplicar a 2 locais");
		await waitFor(() =>
			expect(
				inside().getByRole("button", { name: "Nova disciplina" }),
			).toHaveFocus(),
		);

		await user.click(applyButton());
		await screen.findByText("Disciplinas aplicadas a 2 locais.");
		const sent = nth(server.received, 0);
		expect(sent.on).toContain(
			server.catalog.find((d) => d.name === "Tinta")?.id,
		);
		expect(server.catalog.map(({ name }) => name)).toContain("Tinta");
	});

	test("comes back without losing anything when the creation is cancelled", async () => {
		const server = serverFor();
		await open(server, server.second.id, "2º andar");
		await openFromCard();
		await user.click(mode("Um andar"));
		await toggle("Pintura");

		await user.click(inside().getByRole("button", { name: "Nova disciplina" }));
		await user.click(
			within(screen.getByRole("dialog", { name: "Nova disciplina" })).getByRole(
				"button",
				{ name: "Cancelar" },
			),
		);

		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Nova disciplina" }),
			).not.toBeInTheDocument(),
		);
		expect(
			within(hiddenDialog()).getByRole("radio", { name: "Um andar" }),
		).toBeChecked();
		expect(checkedNames()).toEqual(["Hidráulica", "Elétrica"]);
		await waitFor(() =>
			expect(
				inside().getByRole("button", { name: "Nova disciplina" }),
			).toHaveFocus(),
		);
		expect(server.received).toEqual([]);
	});

	test("returns focus to Nova disciplina of the batch when the creation is closed with Esc", async () => {
		const server = serverFor();
		await open(server, server.second.id, "2º andar");
		await openFromCard();

		await user.click(inside().getByRole("button", { name: "Nova disciplina" }));
		await screen.findByRole("dialog", { name: "Nova disciplina" });
		await user.keyboard("{Escape}");

		await waitFor(() =>
			expect(
				inside().getByRole("button", { name: "Nova disciplina" }),
			).toHaveFocus(),
		);
		expect(dialog()).toBeVisible();
	});

	test("replaces Nova disciplina with the limit sentence when the project has ten extras", async () => {
		const server = serverFor();
		for (let index = 0; index < 8; index += 1) {
			server.catalog.push(catalogDiscipline(`Extra ${index}`));
		}
		await open(server, server.second.id, "2º andar");
		await openFromCard();

		expect(
			inside().getByText("Esta obra já tem 10 disciplinas extras, o máximo."),
		).toBeVisible();
		expect(
			inside().queryByRole("button", { name: "Nova disciplina" }),
		).not.toBeInTheDocument();
	});
});

describe("the focus after the batch closes", () => {
	const ENTRIES = [
		["the floor's card button", "floor", "card"],
		["the floor's menu item", "floor", "menu"],
		["the tower's card button", "tower", "card"],
		["the tower's menu item", "tower", "menu"],
		["the unit's card button", "unit", "card"],
		["the common area's card button", "area", "card"],
	] as const;

	test.each(ENTRIES)(
		"returns to %s on Cancelar, Esc and a successful apply",
		async (_label, page, entry) => {
			const server = serverFor();
			const target = {
				floor: {
					id: server.second.id,
					title: "2º andar",
					menu: "Ações do andar",
				},
				tower: {
					id: server.towerA.id,
					title: "Torre A",
					menu: "Ações da torre",
				},
				unit: { id: server.unit201.id, title: "201", menu: "" },
				area: { id: server.hall.id, title: "Hall", menu: "" },
			}[page];
			await open(server, target.id, target.title);
			const opener = () =>
				entry === "card"
					? cardButton()
					: screen.getByRole("button", { name: target.menu });
			const reopen = () =>
				entry === "card" ? openFromCard() : openFromMenu(target.menu);

			await reopen();
			await user.click(
				within(dialog()).getByRole("button", { name: "Cancelar" }),
			);
			await waitFor(() => expect(opener()).toHaveFocus());

			await reopen();
			await user.keyboard("{Escape}");
			await waitFor(() => expect(opener()).toHaveFocus());

			await reopen();
			await user.click(applyButton());
			await screen.findByText(/^Disciplinas aplicadas a \d+ (local|locais)\.$/);
			await waitFor(() => expect(opener()).toHaveFocus());
		},
		30_000,
	);
});

describe("on a phone", () => {
	test("opens the same batch as a drawer", async () => {
		setViewport("phone");
		const server = serverFor();
		await open(server, server.second.id, "2º andar");

		await openFromCard();

		expect(mode("Um andar")).toBeChecked();
		expect(applyButton()).toHaveTextContent("Aplicar a 4 locais");
	});
});
