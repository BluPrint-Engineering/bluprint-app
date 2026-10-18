import type { ProjectSummary, Structure } from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
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
	floor,
	structureApi,
	structureOf,
	tower,
	unitTypesApi,
} from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const OBRA: ProjectSummary = { ...project(7), name: "Casa Moinhos" };
const CONFIG_PATH = `/projects/${OBRA.id}/configuration`;
const LOCKED = "A obra foi entregue: a estrutura não pode mais ser alterada.";

const casaMoinhos = structureOf(
	[
		tower("Torre A", [floor("1º andar", ["101", "102"], ["Hall"])]),
		tower("Torre B", [floor("1º andar", ["101"])]),
	],
	["Guarita"],
);

function stubConfiguration(
	summary: ProjectSummary,
	structure: Structure,
	extra?: ApiHandler,
) {
	const api = combine(
		(url) =>
			url.pathname === `/api/projects/${summary.id}`
				? json(summary)
				: undefined,
		...(extra ? [extra] : []),
		structureApi(summary.id, structure),
		unitTypesApi(summary.id),
	);
	return stubApi(signedIn, { api });
}

async function structureCard() {
	return within(await screen.findByRole("region", { name: "Estrutura" }));
}

afterEach(() => vi.unstubAllGlobals());

describe("Estrutura on the configuration (C1)", () => {
	test("sums the structure up and opens it, with no wizard while the structure exists", async () => {
		stubConfiguration(OBRA, casaMoinhos);

		renderAt(CONFIG_PATH);

		const card = await structureCard();
		expect(
			await card.findByText(
				"2 torres · 2 andares · 3 unidades · 2 áreas comuns",
			),
		).toBeInTheDocument();
		expect(
			card.getByRole("heading", { level: 3, name: "Estrutura" }),
		).toBeInTheDocument();
		expect(card.getByRole("link", { name: "Abrir estrutura" })).toHaveAttribute(
			"href",
			`/projects/${OBRA.id}`,
		);
		expect(
			card.getByRole("button", { name: "Assistente" }),
		).toBeInTheDocument();
		expect(
			card.getByText(
				"A estrutura se edita onde se navega: torre, andar e unidade têm “Adicionar” e um menu em cada item.",
			),
		).toBeInTheDocument();
		expect(card.queryByText(LOCKED)).not.toBeInTheDocument();
	});

	test("lets the assistant add floors to the tower that grew (C1)", async () => {
		stubConfiguration(OBRA, casaMoinhos);
		renderAt(CONFIG_PATH);
		const card = await structureCard();

		await userEvent.click(
			await card.findByRole("button", { name: "Assistente" }),
		);

		const [, second] = casaMoinhos.towers;
		expect(
			await screen.findByRole("menuitem", {
				name: "Adicionar andares à Torre A",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("menuitem", { name: "Adicionar andares à Torre B" }),
		).toHaveAttribute(
			"href",
			`/projects/${OBRA.id}/structure/new?tower=${second?.id}`,
		);
	});

	test("goes straight to the only tower from the assistant (C1)", async () => {
		const single = structureOf([
			tower("Torre A", [floor("1º andar", ["101"], ["Hall"])]),
		]);
		stubConfiguration(OBRA, single);
		renderAt(CONFIG_PATH);
		const card = await structureCard();

		expect(
			await card.findByRole("link", { name: "Assistente" }),
		).toHaveAttribute(
			"href",
			`/projects/${OBRA.id}/structure/new?tower=${single.towers[0]?.id}`,
		);
	});

	test("counts one of each in the singular", async () => {
		stubConfiguration(
			OBRA,
			structureOf([tower("Torre A", [floor("1º andar", ["101"], ["Hall"])])]),
		);

		renderAt(CONFIG_PATH);

		expect(
			await (await structureCard()).findByText(
				"1 torre · 1 andar · 1 unidade · 1 área comum",
			),
		).toBeInTheDocument();
	});

	test("opens the structure from its link", async () => {
		stubConfiguration(OBRA, casaMoinhos);
		const { router } = renderAt(CONFIG_PATH);
		const card = await structureCard();

		await userEvent.click(
			await card.findByRole("link", { name: "Abrir estrutura" }),
		);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe(`/projects/${OBRA.id}`);
		});
	});

	test("lists Estrutura in the side navigation, which jumps to it", async () => {
		stubConfiguration(OBRA, casaMoinhos);
		renderAt(CONFIG_PATH);
		await structureCard();

		const nav = screen.getByRole("navigation", {
			name: "Seções da configuração",
		});
		await userEvent.click(within(nav).getByRole("link", { name: "Estrutura" }));

		expect(
			within(nav).getByRole("link", { name: "Estrutura" }),
		).toHaveAttribute("aria-current", "true");
	});
});

describe("Estrutura without a structure (C5)", () => {
	test("offers Montar estrutura", async () => {
		stubConfiguration(OBRA, emptyStructure);
		const { router } = renderAt(CONFIG_PATH);
		const card = await structureCard();

		expect(
			await card.findByText("A obra ainda não tem estrutura."),
		).toBeInTheDocument();
		expect(
			card.queryByRole("link", { name: "Abrir estrutura" }),
		).not.toBeInTheDocument();
		await userEvent.click(card.getByRole("link", { name: "Montar estrutura" }));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe(
				`/projects/${OBRA.id}/structure/new`,
			);
		});
	});

	test("shows Montar estrutura full width on the phone", async () => {
		setViewport("phone");
		stubConfiguration(OBRA, emptyStructure);

		renderAt(CONFIG_PATH);

		expect(
			await (await structureCard()).findByRole("link", {
				name: "Montar estrutura",
			}),
		).toHaveClass("max-md:w-full");
	});
});

describe("Estrutura of a delivered project (C6)", () => {
	const delivered = project(7, "manager", "delivered");

	test("opens the structure to read it, with no wizard and the reason why", async () => {
		stubConfiguration({ ...delivered, name: "Casa Moinhos" }, casaMoinhos);

		renderAt(CONFIG_PATH);

		const card = await structureCard();
		expect(
			await card.findByRole("link", { name: "Abrir estrutura" }),
		).toBeInTheDocument();
		expect(
			card.queryByRole("link", { name: "Assistente" }),
		).not.toBeInTheDocument();
		expect(card.getByText(LOCKED)).toBeInTheDocument();
		expect(card.queryByText(/têm “Adicionar”/)).not.toBeInTheDocument();
	});

	test("shows no button when it never had a structure", async () => {
		stubConfiguration({ ...delivered, name: "Casa Moinhos" }, emptyStructure);

		renderAt(CONFIG_PATH);

		const card = await structureCard();
		expect(
			await card.findByText("A obra ainda não tem estrutura."),
		).toBeInTheDocument();
		expect(
			card.queryByRole("link", { name: "Montar estrutura" }),
		).not.toBeInTheDocument();
		expect(card.getByText(LOCKED)).toBeInTheDocument();
	});
});

describe("Estrutura while it loads", () => {
	test("holds the frame while the structure loads", async () => {
		stubConfiguration(OBRA, emptyStructure, (url) =>
			url.pathname === `/api/projects/${OBRA.id}/structure`
				? new Promise(() => {})
				: undefined,
		);

		renderAt(CONFIG_PATH);

		expect(
			await screen.findByRole("status", { name: "Carregando estrutura" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("region", { name: "Dados da obra" }),
		).toBeInTheDocument();
	});

	test("says it failed and tries again", async () => {
		let failing = true;
		stubConfiguration(OBRA, casaMoinhos, (url) =>
			failing && url.pathname === `/api/projects/${OBRA.id}/structure`
				? json({ type: "about:blank", title: "Error", status: 500 }, 500)
				: undefined,
		);
		renderAt(CONFIG_PATH);
		const card = await structureCard();
		const retry = await card.findByRole("button", { name: "Tentar de novo" });

		failing = false;
		await userEvent.click(retry);

		expect(
			await card.findByRole("link", { name: "Abrir estrutura" }),
		).toBeInTheDocument();
	});
});
