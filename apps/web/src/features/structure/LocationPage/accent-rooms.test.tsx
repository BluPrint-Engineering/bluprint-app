import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import {
	combine,
	floor,
	room,
	structureApi,
	structureOf,
	tower,
} from "@/test/structureApi";

const obra = project(3);
const ninth = floor("9º andar", ["903"]);
const unit = nth(ninth.units, 0);
const structure = structureOf([tower("Torre A", [ninth])]);

afterEach(() => vi.unstubAllGlobals());

test("refuses accent variants when adding or renaming rooms before sending", async () => {
	const { fetchMock } = stubApi(signedIn, {
		api: combine(
			(url) =>
				url.pathname === `/api/projects/${obra.id}` ? json(obra) : undefined,
			structureApi(obra.id, structure, {
				[unit.id]: { rooms: [room("Suíte"), room("Quarto")] },
			}),
		),
	});
	renderAt(`/projects/${obra.id}/locations/${unit.id}`);
	await screen.findByRole("heading", { name: "903" });
	await userEvent.click(
		screen.getByRole("button", { name: "Adicionar cômodo" }),
	);
	await userEvent.type(
		screen.getByRole("combobox", { name: "Adicionar cômodo" }),
		"suite{Enter}",
	);
	expect(
		await screen.findByText("Esse cômodo já está na unidade."),
	).toBeInTheDocument();
	await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
	await userEvent.click(
		screen.getByRole("button", { name: "Ações do cômodo Quarto" }),
	);
	await userEvent.click(screen.getByRole("menuitem", { name: "Renomear" }));
	const dialog = within(screen.getByRole("dialog"));
	const field = dialog.getByRole("textbox", { name: "Nome" });
	await userEvent.clear(field);
	await userEvent.type(field, "suite{Enter}");
	expect(
		await screen.findByText("Esse cômodo já está na unidade."),
	).toBeInTheDocument();
	expect(
		fetchMock.mock.calls.filter(
			([, init]) => init?.method === "POST" || init?.method === "PATCH",
		),
	).toHaveLength(0);
});
