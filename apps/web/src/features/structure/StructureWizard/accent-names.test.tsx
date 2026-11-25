import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import { combine, emptyStructure, structureApi } from "@/test/structureApi";

const obra = project(7);
afterEach(() => vi.unstubAllGlobals());

test("wizard rejects accented room duplicates but allows accented common area names", async () => {
	stubApi(signedIn, {
		api: combine(
			(url) => {
				if (url.pathname === `/api/projects/${obra.id}`) return json(obra);
				if (url.pathname === `/api/projects/${obra.id}/units`)
					return json({ reserved: 150, used: 0, remaining: 150 });
				return undefined;
			},
			structureApi(obra.id, emptyStructure),
		),
	});
	renderAt(`/projects/${obra.id}/structure/new`);
	const rooms = await screen.findByRole("textbox", {
		name: "Novo cômodo da Tipologia A",
	});
	await userEvent.type(rooms, "Suíte{Enter}suite{Enter}");
	expect(
		screen.getByText("Esse cômodo já está na tipologia."),
	).toBeInTheDocument();
	expect(screen.getByText("1 cômodo")).toBeInTheDocument();
	const areas = screen.getByRole("textbox", { name: "Área comum da obra" });
	await userEvent.type(areas, "Área{Enter}Area{Enter}");
	expect(
		screen.getByRole("button", { name: "Tirar Área" }),
	).toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "Tirar Area" }),
	).toBeInTheDocument();
});

test("wizard refuses typology names differing only by accents before sending", async () => {
	const { fetchMock } = stubApi(signedIn, {
		api: combine(
			(url) => {
				if (url.pathname === `/api/projects/${obra.id}`) return json(obra);
				if (url.pathname === `/api/projects/${obra.id}/units`)
					return json({ reserved: 150, used: 0, remaining: 150 });
				return undefined;
			},
			structureApi(obra.id, emptyStructure),
		),
	});
	renderAt(`/projects/${obra.id}/structure/new`);
	await userEvent.type(
		await screen.findByRole("textbox", { name: "Primeiro andar" }),
		"1",
	);
	await userEvent.type(
		screen.getByRole("textbox", { name: "Último andar" }),
		"2",
	);
	await userEvent.type(
		screen.getByRole("textbox", { name: "Finais" }),
		"01, 04",
	);
	await userEvent.click(screen.getByRole("button", { name: "Nova tipologia" }));
	const names = screen.getAllByRole("textbox", { name: "Nome da tipologia" });
	await userEvent.clear(nth(names, 1));
	await userEvent.type(nth(names, 1), "TipologÍa A");
	await userEvent.click(
		screen.getByRole("button", { name: "Criar estrutura" }),
	);
	expect(
		await screen.findByText("Esse nome já existe nesta obra."),
	).toBeInTheDocument();
	expect(
		fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
	).toHaveLength(0);
});
