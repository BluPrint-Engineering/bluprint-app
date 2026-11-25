import type { ProjectSummary } from "@bluprint/shared";
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
	configurationSectionsApi,
	emptyStructure,
	roomNamesApi,
	typologyOf,
	typologyServer,
} from "@/test/structureApi";

const OBRA: ProjectSummary = { ...project(7), name: "Casa Moinhos" };

const USED_NAMES = ["Sala", "Sacada", "Salão", "Suíte", "Box 1"];

function api(rooms: string[]) {
	const tipologia = typologyOf("Tipologia A", rooms, { locations: 2 });
	const server = typologyServer(OBRA.id, [tipologia]);
	const handler: ApiHandler = combine(
		(url) =>
			url.pathname === `/api/projects/${OBRA.id}` ? json(OBRA) : undefined,
		roomNamesApi(OBRA.id, USED_NAMES),
		server.handler,
		configurationSectionsApi(OBRA.id, emptyStructure),
	);
	return { handler, writes: server.writes };
}

async function openEditor(rooms: string[]) {
	const served = api(rooms);
	stubApi(signedIn, { api: served.handler });
	renderAt(`/projects/${OBRA.id}/configuration`);
	await screen.findByText("Tipologia A");
	await userEvent.click(
		await screen.findByRole("button", { name: "Ações da Tipologia A" }),
	);
	await userEvent.click(
		await screen.findByRole("menuitem", { name: "Editar cômodos" }),
	);
	await field();
	return served;
}

const field = () =>
	screen.findByRole("combobox", { name: "Novo cômodo da Tipologia A" });
const list = () =>
	screen.queryByRole("listbox", { name: "Sugestões de cômodo" });
const rooms = () =>
	screen
		.queryAllByRole("button", { name: /^Tirar / })
		.map((button) => button.getAttribute("aria-label")?.slice("Tirar ".length));
const groupOf = (name: string) =>
	within(screen.getByRole("group", { name }))
		.getAllByRole("option")
		.map((option) => option.textContent);
const optionNames = () =>
	within(screen.getByRole("listbox"))
		.getAllByRole("option")
		.map((option) => option.textContent);

afterEach(() => vi.unstubAllGlobals());

describe("the room suggest field in a typology", () => {
	test("opens no list while empty, and offers what starts a word once something is typed", async () => {
		await openEditor(["Lavanderia"]);

		expect(list()).toBeNull();
		await userEvent.type(await field(), "sa");

		expect(list()).toBeInTheDocument();
		expect(groupOf("Sugestões")).toEqual(["Sala", "Sacada"]);
		expect(groupOf("Usados nesta obra")).toEqual(["Salão"]);
		expect(optionNames()).toEqual([
			"Sala",
			"Sacada",
			"Salão",
			"Adicionar “sa”",
		]);
		expect(rooms()).toEqual(["Lavanderia"]);
	});

	test("answers the same list to an accented and capitalised text", async () => {
		await openEditor([]);

		await userEvent.type(await field(), "SÁ");

		expect(groupOf("Sugestões")).toEqual(["Sala", "Sacada"]);
		expect(groupOf("Usados nesta obra")).toEqual(["Salão"]);
	});

	test("offers only the text when nothing starts a word with it", async () => {
		await openEditor([]);

		await userEvent.type(await field(), "casa");

		expect(optionNames()).toEqual(["Adicionar “casa”"]);
	});

	test("shows what is already in the typology marked and off, and never as an option to pick", async () => {
		await openEditor(["Sala", "Sacada"]);
		const input = await field();

		await userEvent.type(input, "sa");

		expect(groupOf("Já está nesta tipologia")).toEqual(["Sala", "Sacada"]);
		expect(groupOf("Usados nesta obra")).toEqual(["Salão"]);
		expect(screen.queryByRole("group", { name: "Sugestões" })).toBeNull();
		for (const option of within(
			screen.getByRole("group", { name: "Já está nesta tipologia" }),
		).getAllByRole("option")) {
			expect(option).toHaveAttribute("aria-disabled", "true");
		}
		await userEvent.keyboard("{ArrowDown}");
		expect(input).toHaveAttribute(
			"aria-activedescendant",
			screen.getByRole("option", { name: "Salão" }).id,
		);
		await userEvent.click(screen.getByRole("option", { name: "Sala" }));
		expect(rooms()).toEqual(["Sala", "Sacada"]);
	});

	test("suggests Lavabo and marks Lavanderia for lav", async () => {
		await openEditor(["Lavanderia"]);

		await userEvent.type(await field(), "lav");

		expect(groupOf("Sugestões")).toEqual(["Lavabo"]);
		expect(groupOf("Já está nesta tipologia")).toEqual(["Lavanderia"]);
	});

	test("refuses a repeated name with an alert, the list closed and the field invalid", async () => {
		await openEditor(["Sala", "Suíte"]);
		const input = await field();

		await userEvent.type(input, "suite{Enter}");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Esse cômodo já está na tipologia.",
		);
		expect(input).toBeInvalid();
		expect(list()).toBeNull();
		expect(rooms()).toEqual(["Sala", "Suíte"]);
		await userEvent.type(input, "x");
		expect(screen.queryByRole("alert")).toBeNull();
	});

	test("adds the fixed spelling of a typed name, from the text and from the list", async () => {
		await openEditor([]);
		const input = await field();

		await userEvent.type(input, "lavabo{Enter}");
		expect(rooms()).toEqual(["Lavabo"]);
		expect(input).toHaveValue("");
		expect(input).toHaveFocus();
		expect(list()).toBeNull();

		await userEvent.type(input, "var");
		await userEvent.click(screen.getByRole("option", { name: "Varanda" }));
		expect(rooms()).toEqual(["Lavabo", "Varanda"]);
		expect(input).toHaveValue("");
		expect(input).toHaveFocus();
	});

	test("adds the spelling the obra uses for a name it uses", async () => {
		await openEditor([]);

		await userEvent.type(await field(), "box 1{Enter}");

		expect(rooms()).toEqual(["Box 1"]);
	});

	test("adds nothing when the field is left, and adds the text after Escape and Enter", async () => {
		await openEditor([]);
		const input = await field();

		await userEvent.type(input, "Copa");
		await userEvent.tab();
		expect(rooms()).toEqual([]);
		expect(list()).toBeNull();
		expect(input).toHaveValue("Copa");

		await userEvent.clear(input);
		await userEvent.type(input, "Copa");
		await userEvent.keyboard("{Escape}");
		expect(list()).toBeNull();
		expect(input).toHaveValue("Copa");
		await userEvent.keyboard("{Enter}");
		expect(rooms()).toEqual(["Copa"]);
	});

	test("adds the second option after two arrows down, not the typed text", async () => {
		await openEditor([]);
		const input = await field();

		await userEvent.type(input, "co");
		await userEvent.keyboard("{ArrowDown}{ArrowDown}");
		expect(input).toHaveAttribute(
			"aria-activedescendant",
			screen.getByRole("option", { name: "Adicionar “co”" }).id,
		);
		await userEvent.keyboard("{Enter}");

		expect(rooms()).toEqual(["co"]);
	});

	test("moves through the options with the arrows, up to none highlighted, and a new letter drops the highlight", async () => {
		await openEditor([]);
		const input = await field();

		await userEvent.type(input, "sa");
		await userEvent.keyboard("{ArrowDown}{ArrowDown}");
		expect(input).toHaveAttribute(
			"aria-activedescendant",
			screen.getByRole("option", { name: "Sacada" }).id,
		);
		await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
		expect(input).toHaveAttribute(
			"aria-activedescendant",
			screen.getByRole("option", { name: "Adicionar “sa”" }).id,
		);
		await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}");
		expect(input).not.toHaveAttribute("aria-activedescendant");
		await userEvent.keyboard("{ArrowDown}");
		await userEvent.type(input, "l");
		expect(input).not.toHaveAttribute("aria-activedescendant");
		await userEvent.keyboard("{Enter}");
		expect(rooms()).toEqual(["sal"]);
	});

	test("reopens a closed list with the arrow down", async () => {
		await openEditor([]);
		const input = await field();

		await userEvent.type(input, "sa");
		await userEvent.keyboard("{Escape}");
		expect(input).toHaveAttribute("aria-expanded", "false");
		await userEvent.keyboard("{ArrowDown}");

		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(list()).toBeInTheDocument();
	});

	test("adds the text typed with the Adicionar button, which is off while the field is empty", async () => {
		await openEditor([]);
		const input = await field();
		const add = screen.getByRole("button", { name: "Adicionar" });
		expect(add).toBeDisabled();

		await userEvent.type(input, "Copa");
		await userEvent.click(add);

		expect(rooms()).toEqual(["Copa"]);
		expect(add).toBeDisabled();
		expect(input).toHaveFocus();
	});

	test("tidies the spaces of a pasted text", async () => {
		await openEditor([]);

		await userEvent.click(await field());
		await userEvent.paste(" Sala   de  estar ");
		await userEvent.keyboard("{Enter}");

		expect(rooms()).toEqual(["Sala de estar"]);
	});

	test("does not offer to add a known name the six-per-group cut left out, and adds its spelling", async () => {
		const names = ["Sa1", "Sa2", "Sa3", "Sa4", "Sa5", "Sa6", "Sa7", "Sa8"];
		const served = api([]);
		const handler: ApiHandler = combine(
			roomNamesApi(OBRA.id, names),
			served.handler,
		);
		stubApi(signedIn, { api: handler });
		renderAt(`/projects/${OBRA.id}/configuration`);
		await userEvent.click(
			await screen.findByRole("button", { name: "Ações da Tipologia A" }),
		);
		await userEvent.click(
			await screen.findByRole("menuitem", { name: "Editar cômodos" }),
		);
		const input = await field();
		await waitFor(async () => {
			await userEvent.clear(input);
			await userEvent.type(input, "sa");
			expect(groupOf("Usados nesta obra")).toHaveLength(6);
		});

		await userEvent.clear(input);
		await userEvent.type(input, "SA8");

		expect(optionNames()).toEqual(["Sa8"]);
		await userEvent.keyboard("{Enter}");
		expect(rooms()).toEqual(["Sa8"]);
	});

	test("refuses the 51st room with the limit text", async () => {
		const fifty = Array.from(
			{ length: 50 },
			(_, index) => `Cômodo ${index + 1}`,
		);
		await openEditor(fifty);

		await userEvent.type(await field(), "Copa{Enter}");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"A tipologia pode ter até 50 cômodos.",
		);
		expect(rooms()).toHaveLength(50);
	});

	test("labels the combobox for a screen reader", async () => {
		await openEditor([]);
		const input = await field();

		await userEvent.type(input, "sa");

		expect(input).toHaveAttribute("aria-autocomplete", "list");
		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(input).toHaveAttribute(
			"aria-controls",
			screen.getByRole("listbox", { name: "Sugestões de cômodo" }).id,
		);
		expect(input).toHaveAttribute("placeholder", "Novo cômodo");
	});
});
