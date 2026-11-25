import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import {
	configurationSectionsApi,
	emptyStructure,
	typologyOf,
} from "@/test/structureApi";

const obra = project(7);
const type = typologyOf("Tipologia Á", ["Suíte"]);

afterEach(() => vi.unstubAllGlobals());

test("refuses accent variants of typology and room names before sending", async () => {
	const api = configurationSectionsApi(obra.id, emptyStructure, {
		typologies: [type],
	});
	const { fetchMock } = stubApi(signedIn, {
		api: (url, init) =>
			url.pathname === `/api/projects/${obra.id}` ? json(obra) : api(url, init),
	});
	renderAt(`/projects/${obra.id}/configuration`);
	await screen.findByText("Tipologia Á");
	await userEvent.click(screen.getByRole("button", { name: "Nova tipologia" }));
	await userEvent.type(
		screen.getByRole("textbox", { name: "Nome" }),
		"tipologia a{Enter}",
	);
	expect(
		await screen.findByText("Esse nome já existe nesta obra."),
	).toBeInTheDocument();
	await userEvent.click(
		within(screen.getByRole("dialog")).getByRole("button", {
			name: "Cancelar",
		}),
	);
	await userEvent.click(
		screen.getByRole("button", { name: "Ações da Tipologia Á" }),
	);
	await userEvent.click(
		screen.getByRole("menuitem", { name: "Editar cômodos" }),
	);
	await userEvent.type(
		screen.getByRole("combobox", { name: "Novo cômodo da Tipologia Á" }),
		"suite{Enter}",
	);
	expect(
		await screen.findByText("Esse cômodo já está na tipologia."),
	).toBeInTheDocument();
	expect(
		fetchMock.mock.calls.filter(
			([, init]) => init?.method === "POST" || init?.method === "PATCH",
		),
	).toHaveLength(0);
});
