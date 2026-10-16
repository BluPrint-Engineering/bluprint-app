import {
	LOCATION_NOT_FOUND,
	PROJECT_NOT_FOUND,
	type ProjectSummary,
	type Structure,
} from "@bluprint/shared";
import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
	floor,
	numberedFloors,
	structureApi,
	structureOf,
	tower,
} from "@/test/structureApi";

const OBRA = { ...project(3), name: "Casa Moinhos" };
const LOCKED = "A obra foi entregue: a estrutura não pode mais ser alterada.";

const ground = floor("Térreo", [], ["Hall de entrada", "Depósito"]);
const ninth = floor("9º andar", ["901", "902", "903", "904"], ["Hall"]);
const twelfth = floor("12º andar", ["1201", "1202"], ["Hall", "Terraço"]);
const cobertura = floor("Cobertura", ["1301"]);
const basement = floor("Subsolo", [], ["Garagem"]);
const towerA = tower(
	"Torre A",
	[basement, ground, ninth, twelfth, cobertura],
	["Salão de festas"],
);
const towerB = tower("Torre B", numberedFloors(1, 2, 2));
const emptyTower = tower("Torre C", [], ["Churrasqueira"]);

const several = structureOf([towerA, towerB, emptyTower], ["Guarita"]);
const single = structureOf([towerA], ["Guarita"]);

function pathOf(id: string) {
	return `/projects/${OBRA.id}/locations/${id}`;
}

function api(structure: Structure, summary: ProjectSummary = OBRA): ApiHandler {
	return combine(
		(url) =>
			url.pathname === `/api/projects/${summary.id}`
				? json(summary)
				: undefined,
		structureApi(summary.id, structure),
	);
}

function sectionOf(title: string) {
	const section = screen
		.getByRole("heading", { level: 2, name: title })
		.closest("section");
	if (!section) throw new Error(`No section under "${title}".`);
	return section;
}

function rowStartingWith(facade: HTMLElement, label: string) {
	const row = within(facade)
		.getAllByRole("listitem")
		.find((candidate) => candidate.textContent?.startsWith(label));
	if (!row) throw new Error(`No façade row starting with "${label}".`);
	return row;
}

function problem(code: string) {
	return json(
		{ type: "about:blank", title: "Not Found", status: 404, code },
		404,
	);
}

describe("tower page", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		onlineManager.setOnline(true);
	});

	test("reads as the façade, one floor per row with the highest first (T1)", async () => {
		stubApi(signedIn, { api: api(several) });

		renderAt(pathOf(towerA.id));

		expect(
			await screen.findByRole("heading", { level: 1, name: "Torre A" }),
		).toBeInTheDocument();
		const rows = within(
			await screen.findByRole("list", { name: "Fachada da Torre A" }),
		).getAllByRole("listitem");
		expect(rows.map((row) => row.firstElementChild?.textContent)).toEqual([
			"Cobertura",
			"12º",
			"9º",
			"Térreo",
			"Subsolo",
		]);
		expect(rows[2]).toHaveTextContent("9º901902903904Hall");
		expect(screen.getByRole("link", { name: "9º andar" })).toHaveTextContent(
			"9º",
		);
	});

	test("aligns every row on the widest floor's columns", async () => {
		stubApi(signedIn, { api: api(several) });

		renderAt(pathOf(towerA.id));

		const facade = await screen.findByRole("list", {
			name: "Fachada da Torre A",
		});
		expect(facade.style.getPropertyValue("--units")).toBe("4");
		const rows = within(facade).getAllByRole("listitem");
		expect(within(nth(rows, 0)).getAllByRole("link")).toHaveLength(2);
		expect(within(nth(rows, 1)).getAllByRole("link")).toHaveLength(5);
	});

	test("stacks the common areas of a floor that has units in their own column, and spreads those of a floor without units over the row", async () => {
		stubApi(signedIn, { api: api(several) });

		renderAt(pathOf(towerA.id));

		const facade = await screen.findByRole("list", {
			name: "Fachada da Torre A",
		});
		const stacked = within(rowStartingWith(facade, "12º")).getByRole("link", {
			name: "Hall",
		}).parentElement;
		expect(stacked).toHaveClass("grid");
		expect(within(stacked as HTMLElement).getAllByRole("link")).toHaveLength(2);
		const spread = within(rowStartingWith(facade, "Térreo")).getByRole("link", {
			name: "Hall de entrada",
		}).parentElement;
		expect(spread).toHaveClass("flex");
		expect(within(spread as HTMLElement).getAllByRole("link")).toHaveLength(2);
	});

	test("lists the tower's own common areas beside the façade, and opens a unit from it", async () => {
		stubApi(signedIn, { api: api(several) });

		const { router } = renderAt(pathOf(towerA.id));
		await screen.findByRole("list", { name: "Fachada da Torre A" });

		expect(
			within(sectionOf("Áreas comuns da torre"))
				.getAllByRole("link")
				.map((link) => link.textContent),
		).toEqual(["Salão de festas"]);

		await userEvent.click(screen.getByRole("link", { name: "Unidade 903" }));
		await waitFor(() => {
			expect(router.state.location.pathname).toBe(
				pathOf(nth(ninth.units, 2).id),
			);
		});
	});

	test("opens a floor from its label", async () => {
		stubApi(signedIn, { api: api(several) });

		const { router } = renderAt(pathOf(towerA.id));
		await userEvent.click(
			await screen.findByRole("link", { name: "12º andar" }),
		);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe(pathOf(twelfth.id));
		});
	});

	test("shows the band with the project to go back to and the tower's counts", async () => {
		stubApi(signedIn, { api: api(several) });

		const { router } = renderAt(pathOf(towerA.id));

		expect(
			await screen.findByText("Torre · 5 andares · 7 unidades"),
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("link", { name: "Casa Moinhos" }));
		await waitFor(() => {
			expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
		});
	});

	test("says the tower has no floors yet, keeping its common areas, with no button (T3)", async () => {
		stubApi(signedIn, { api: api(several) });

		renderAt(pathOf(emptyTower.id));

		expect(
			await screen.findByRole("heading", {
				name: "A Torre C ainda não tem andares",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Os andares aparecem aqui quando alguém da equipe adicionar.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Churrasqueira" }),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).queryByRole("button"),
		).not.toBeInTheDocument();
		expect(
			screen.getByText("Torre · 0 andares · 0 unidades"),
		).toBeInTheDocument();
	});

	test("keeps the band and shows the façade with a lock line on a delivered project (T6)", async () => {
		stubApi(signedIn, {
			api: api(several, { ...OBRA, status: "delivered" }),
		});

		renderAt(pathOf(towerA.id));

		expect(await screen.findByText(LOCKED)).toBeInTheDocument();
		expect(
			await screen.findByRole("list", { name: "Fachada da Torre A" }),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("main")).queryByRole("button"),
		).not.toBeInTheDocument();
	});

	test("keeps the band's frame while the structure loads", async () => {
		stubApi(signedIn, {
			api: combine(
				(url) =>
					url.pathname.endsWith("/structure")
						? new Promise(() => {})
						: undefined,
				api(several),
			),
		});

		renderAt(pathOf(towerA.id));

		expect(
			await screen.findByRole("status", { name: "Carregando local" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Obras" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
	});

	test("explains a failed load with the back link only, and retries on demand (T4)", async () => {
		let failing = true;
		const serve = api(several);
		stubApi(signedIn, {
			api: (url) =>
				failing && url.pathname.includes("/locations/")
					? json({}, 500)
					: serve(url),
		});

		renderAt(pathOf(towerA.id));

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("Não foi possível carregar o local");
		expect(alert).toHaveTextContent("Confira sua conexão e tente de novo.");
		expect(screen.getByRole("link", { name: "Obras" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();

		failing = false;
		await userEvent.click(
			within(alert).getByRole("button", { name: "Tentar de novo" }),
		);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Torre A" }),
		).toBeInTheDocument();
	});

	test("waits for the connection when the signal drops, then loads on its own", async () => {
		const serve = api(several);
		let dropSignal: () => void = () => {};
		let first = true;
		stubApi(signedIn, {
			api: (url) => {
				if (!url.pathname.includes("/locations/")) return serve(url);
				if (!first) return serve(url);
				first = false;
				return new Promise<Response>((_, reject) => {
					dropSignal = () => reject(new TypeError("Failed to fetch"));
				});
			},
		});

		renderAt(pathOf(towerA.id));
		await screen.findByRole("status", { name: "Carregando local" });

		act(() => {
			onlineManager.setOnline(false);
			dropSignal();
		});

		expect(await screen.findByText("Sem conexão.")).toBeInTheDocument();

		act(() => onlineManager.setOnline(true));

		expect(
			await screen.findByRole("heading", { level: 1, name: "Torre A" }),
		).toBeInTheDocument();
	});
});

describe("location not found (T5)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("shows Local não encontrado, not the generic page, and leads back to the project", async () => {
		stubApi(signedIn, {
			api: combine(
				(url) =>
					url.pathname.includes("/locations/")
						? problem(LOCATION_NOT_FOUND)
						: undefined,
				api(several),
			),
		});

		const { router } = renderAt(pathOf("0190b000-0000-7000-8000-999999999999"));

		expect(
			await screen.findByRole("heading", { name: "Local não encontrado" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Ele foi excluído ou arquivado, ou você não tem acesso a esta obra.",
			),
		).toBeInTheDocument();

		await userEvent.click(
			screen.getByRole("link", { name: "Voltar para a obra" }),
		);
		await waitFor(() => {
			expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
		});
	});

	test("shows it too when the project is not visible, without telling which", async () => {
		stubApi(signedIn, {
			api: (url) =>
				url.pathname.startsWith("/api/projects/")
					? problem(PROJECT_NOT_FOUND)
					: undefined,
		});

		renderAt(pathOf("0190b000-0000-7000-8000-999999999999"));

		expect(
			await screen.findByRole("heading", { name: "Local não encontrado" }),
		).toBeInTheDocument();
	});

	test("shows it for a location id that is not a UUID, without asking the API", async () => {
		const { fetchMock } = stubApi(signedIn, { api: api(several) });

		renderAt(pathOf("not-a-uuid"));

		expect(
			await screen.findByRole("heading", { name: "Local não encontrado" }),
		).toBeInTheDocument();
		expect(
			fetchMock.mock.calls.filter(([input]) =>
				String(input).includes("/locations/"),
			),
		).toHaveLength(0);
	});

	test("shows Obra não encontrada for a project id that is not a UUID", async () => {
		stubApi(signedIn);

		renderAt(`/projects/not-a-uuid/locations/${towerA.id}`);

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Obra não encontrada",
			}),
		).toBeInTheDocument();
	});

	test("sends a signed-out visitor to the login", async () => {
		stubApi(null);

		const { router } = renderAt(pathOf(towerA.id));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/login");
		});
		expect(router.state.location.search).toEqual({
			redirect: pathOf(towerA.id),
		});
	});
});

describe("floor page", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("lists the units and the common areas, each opening its location (F1)", async () => {
		stubApi(signedIn, { api: api(several) });

		const { router } = renderAt(pathOf(ninth.id));

		expect(
			await screen.findByRole("heading", { level: 1, name: "9º andar" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Andar · Torre A · 4 unidades"),
		).toBeInTheDocument();
		const units = sectionOf("Unidades");
		expect(
			within(units)
				.getAllByRole("link")
				.map((link) => link.textContent),
		).toEqual(["901", "902", "903", "904"]);
		expect(
			within(sectionOf("Áreas comuns do andar"))
				.getAllByRole("link")
				.map((link) => link.textContent),
		).toEqual(["Hall"]);
		expect(
			within(screen.getByRole("main")).queryByRole("button"),
		).not.toBeInTheDocument();

		await userEvent.click(within(units).getByRole("link", { name: "902" }));
		await waitFor(() => {
			expect(router.state.location.pathname).toBe(
				pathOf(nth(ninth.units, 1).id),
			);
		});
	});

	test("goes back to the tower", async () => {
		stubApi(signedIn, { api: api(several) });

		const { router } = renderAt(pathOf(ninth.id));
		await userEvent.click(await screen.findByRole("link", { name: "Torre A" }));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe(pathOf(towerA.id));
		});
	});

	test("says a floor without units has none, and still lists its common areas", async () => {
		stubApi(signedIn, { api: api(several) });

		renderAt(pathOf(basement.id));

		expect(
			await screen.findByText("Nenhuma unidade neste andar."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 2, name: "Áreas comuns do andar" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Garagem" })).toBeInTheDocument();
	});

	test("drops the tower from the back link and the context line when the project has one tower", async () => {
		stubApi(signedIn, { api: api(single) });

		const { router } = renderAt(pathOf(ninth.id));

		expect(await screen.findByText("Andar · 4 unidades")).toBeInTheDocument();
		expect(screen.queryByText(/Torre A/)).not.toBeInTheDocument();
		await userEvent.click(screen.getByRole("link", { name: "Casa Moinhos" }));
		await waitFor(() => {
			expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
		});
	});

	test("shows the lock line on a delivered project (T6)", async () => {
		stubApi(signedIn, {
			api: api(several, { ...OBRA, status: "delivered" }),
		});

		renderAt(pathOf(ninth.id));

		expect(await screen.findByText(LOCKED)).toBeInTheDocument();
	});
});

describe("unit and common area pages", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("shows a unit in mono, with its floor to go back to and where it is", async () => {
		stubApi(signedIn, { api: api(several) });

		const { router } = renderAt(pathOf(nth(ninth.units, 2).id));

		const title = await screen.findByRole("heading", { level: 1, name: "903" });
		expect(title).toHaveClass("font-mono");
		expect(
			screen.getByText("Unidade · Torre A · 9º andar"),
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("link", { name: "9º andar" }));
		await waitFor(() => {
			expect(router.state.location.pathname).toBe(pathOf(ninth.id));
		});
	});

	test("shows a common area of the project with its place and the project to go back to", async () => {
		stubApi(signedIn, { api: api(several) });

		renderAt(pathOf(nth(several.commonAreas, 0).id));

		expect(
			await screen.findByRole("heading", { level: 1, name: "Guarita" }),
		).toBeInTheDocument();
		expect(screen.getByText("Área comum · da obra")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Casa Moinhos" }),
		).toBeInTheDocument();
	});

	test("names the tower and floor of a common area on a floor", async () => {
		stubApi(signedIn, { api: api(several) });

		renderAt(pathOf(nth(ground.commonAreas, 0).id));

		expect(
			await screen.findByText("Área comum · Torre A · Térreo"),
		).toBeInTheDocument();
	});
});
