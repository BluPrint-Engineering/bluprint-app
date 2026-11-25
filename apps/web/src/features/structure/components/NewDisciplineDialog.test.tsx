import type { CreateDiscipline } from "@bluprint/shared";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
	type ExistingDiscipline,
	NewDisciplineDialog,
	type NewDisciplineRefusal,
} from "./NewDisciplineDialog";

const user = userEvent.setup({ delay: null });

const EXISTING: ExistingDiscipline[] = [
	{ id: "0190a000-0000-7000-8000-0000000000a1", name: "Geral" },
	{ id: "0190a000-0000-7000-8000-0000000000a2", name: "Hidráulica" },
	{ id: "0190a000-0000-7000-8000-0000000000a3", name: "Elétrica" },
	{ id: "0190a000-0000-7000-8000-0000000000a4", name: "Pintura" },
];

type Create = (
	discipline: CreateDiscipline,
) => Promise<NewDisciplineRefusal | undefined>;

function show({
	onCreate = vi.fn<Create>(async () => undefined),
	initial,
	existing = EXISTING,
}: {
	onCreate?: ReturnType<typeof vi.fn<Create>>;
	initial?: CreateDiscipline;
	existing?: ExistingDiscipline[];
} = {}) {
	const onClose = vi.fn();
	render(
		<NewDisciplineDialog
			existing={existing}
			initial={initial}
			onCreate={onCreate}
			onClose={onClose}
			returnFocus={() => null}
		/>,
	);
	return { onCreate, onClose };
}

const dialog = () => screen.getByRole("dialog", { name: "Nova disciplina" });
const nameField = () => within(dialog()).getByRole("textbox", { name: "Nome" });
const everywhere = () =>
	within(dialog()).getByRole("radio", { name: "Na obra toda" });
const whereOn = () =>
	within(dialog()).getByRole("radio", { name: "Só onde for ligada" });
const createButton = () =>
	within(dialog()).getByRole("button", { name: /^(Criar|Criando…)$/ });

describe("the Nova disciplina dialog", () => {
	test("opens empty, with no choice marked and Criar off", () => {
		show();

		expect(nameField()).toHaveValue("");
		expect(everywhere()).not.toBeChecked();
		expect(whereOn()).not.toBeChecked();
		expect(createButton()).toBeDisabled();
		expect(
			within(dialog()).getByRole("radiogroup", { name: "Onde se aplica" }),
		).toBeInTheDocument();
	});

	test("reopens a kept submission with its name, its choice and its id", async () => {
		const kept = {
			id: "0190a000-0000-7000-8000-0000000000d1",
			name: "Piscina",
			appliesEverywhere: false,
		};
		const { onCreate } = show({ initial: kept });

		expect(nameField()).toHaveValue("Piscina");
		expect(whereOn()).toBeChecked();
		await user.click(createButton());

		expect(onCreate).toHaveBeenCalledWith(kept);
	});

	test("sends a kept submission whose own discipline the catalog already lists", async () => {
		const kept = {
			id: "0190a000-0000-7000-8000-0000000000d1",
			name: "Piscina",
			appliesEverywhere: false,
		};
		const { onCreate } = show({
			initial: kept,
			existing: [...EXISTING, { id: kept.id, name: "Piscina" }],
		});

		await user.click(createButton());

		expect(onCreate).toHaveBeenCalledWith(kept);
		expect(
			within(dialog()).queryByText("Piscina já existe nesta obra."),
		).not.toBeInTheDocument();
	});

	test.each([
		["", "Informe o nome."],
		["y".repeat(61), "Use até 60 caracteres."],
		["eletrica", "Elétrica já existe nesta obra."],
		["Hidraulica", "Hidráulica já existe nesta obra."],
		["PINTURA  ", "Pintura já existe nesta obra."],
		["Géral", "Geral vale em todo local e não entra na lista."],
	])("refuses %j before sending", async (typed, message) => {
		const { onCreate } = show();

		if (typed) await user.type(nameField(), typed);
		await user.click(everywhere());
		await user.click(createButton());

		expect(within(dialog()).getByText(message)).toBeInTheDocument();
		expect(onCreate).not.toHaveBeenCalled();
	});

	test("sends the trimmed name with the choice and a UUIDv7 id", async () => {
		const { onCreate } = show();

		await user.type(nameField(), "  Gesso ");
		await user.click(everywhere());
		await user.click(createButton());

		expect(onCreate).toHaveBeenCalledWith({
			id: expect.stringMatching(
				/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
			),
			name: "Gesso",
			appliesEverywhere: true,
		});
	});

	test("shows Criando… and sends once while a creation is pending", async () => {
		let finish: (value: undefined) => void = () => {};
		const onCreate = vi.fn<Create>(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		show({ onCreate });

		await user.type(nameField(), "Gesso");
		await user.click(everywhere());
		await user.click(createButton());
		await user.click(createButton());
		await user.type(nameField(), "{Enter}");

		expect(createButton()).toHaveTextContent("Criando…");
		expect(createButton()).toBeDisabled();
		expect(onCreate).toHaveBeenCalledTimes(1);
		finish(undefined);
	});

	test("keeps the fields after a failure and retries with the same id", async () => {
		const onCreate = vi
			.fn<Create>()
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockResolvedValueOnce(undefined);
		show({ onCreate });

		await user.type(nameField(), "Gesso");
		await user.click(whereOn());
		await user.click(createButton());

		expect(
			await within(dialog()).findByText(
				"Não foi possível criar a disciplina. Confira a conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(nameField()).toHaveValue("Gesso");
		expect(whereOn()).toBeChecked();

		await user.click(createButton());

		expect(onCreate).toHaveBeenCalledTimes(2);
		expect(onCreate.mock.calls[1]?.[0]).toEqual(onCreate.mock.calls[0]?.[0]);
	});

	test("shows a name taken elsewhere with the spelling it was given there", async () => {
		const onCreate = vi.fn<Create>(async () => ({ nameTakenAs: "Gésso" }));
		show({ onCreate });

		await user.type(nameField(), "Gesso");
		await user.click(everywhere());
		await user.click(createButton());

		expect(
			await within(dialog()).findByText("Gésso já existe nesta obra."),
		).toBeInTheDocument();
		expect(nameField()).toHaveValue("Gesso");
		expect(everywhere()).toBeChecked();
	});

	test("shows the limit sentence and turns Criar off when the project is full", async () => {
		const onCreate = vi.fn<Create>(async () => ({ limitReached: true }));
		show({ onCreate });

		await user.type(nameField(), "Gesso");
		await user.click(everywhere());
		await user.click(createButton());

		expect(
			await within(dialog()).findByText(
				"Esta obra já tem 10 disciplinas extras, o máximo.",
			),
		).toBeInTheDocument();
		expect(createButton()).toBeDisabled();
		expect(nameField()).toHaveValue("Gesso");
	});

	test("Cancelar closes without creating", async () => {
		const { onCreate, onClose } = show();

		await user.type(nameField(), "Gesso");
		await user.click(
			within(dialog()).getByRole("button", { name: "Cancelar" }),
		);

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onCreate).not.toHaveBeenCalled();
	});
});
