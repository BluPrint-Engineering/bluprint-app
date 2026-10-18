import {
	LOCATION_NAME_TAKEN,
	NO_UNITS_LEFT,
	type ProjectAccessRole,
} from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import { floor, structureOf, tower, writableApi } from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const user = userEvent.setup({ delay: null });

const plain = (text: string | null) => text?.replaceAll(" ", " ");

function build() {
	const ninth = floor(
		"9º andar",
		[
			{ name: "901", unitType: "Tipologia A" },
			{ name: "902", unitType: "Tipologia A" },
			"903",
			"904",
		],
		["Hall"],
	);
	const tenth = floor("10º andar", ["1001", "1002"]);
	const towerA = tower("Torre A", [ninth, tenth], ["Salão de festas"]);
	const towerB = tower("Torre B", [floor("1º andar", ["101", "102"])]);
	return {
		ninth,
		tenth,
		towerA,
		towerB,
		several: structureOf([towerA, towerB], ["Guarita"]),
	};
}

function obra(role: ProjectAccessRole = "manager", delivered = false) {
	return {
		...project(3, role, delivered ? "delivered" : "active"),
		name: "Casa Moinhos",
		units: { reserved: 112, used: 100 },
	};
}

const pathOf = (id: string) => `/projects/${obra().id}/locations/${id}`;

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Conflict", status, code, ...extra },
		status,
	);
}

async function openDuplicate(menuName: string, itemName: string) {
	await user.click(await screen.findByRole("button", { name: menuName }));
	await user.click(await screen.findByRole("menuitem", { name: itemName }));
	return screen.findByRole("dialog");
}

const nameField = (dialog: HTMLElement) =>
	within(dialog).getByRole("textbox", { name: "Nome" });

async function typeName(dialog: HTMLElement, name: string) {
	const field = nameField(dialog);
	await user.clear(field);
	await user.type(field, name);
}

const submit = (dialog: HTMLElement) =>
	user.click(within(dialog).getByRole("button", { name: "Duplicar" }));

describe("duplicating a tower (R9a)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("asks for the next letter and says what the copy uses of the reserva", async () => {
		const { towerA, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(towerA.id));

		const dialog = await openDuplicate("Ações da torre", "Duplicar torre");

		expect(
			within(dialog).getByRole("heading", { name: "Duplicar a Torre A" }),
		).toBeInTheDocument();
		expect(nameField(dialog)).toHaveValue("Torre C");
		expect(within(dialog).getByText("Único na obra.")).toBeInTheDocument();
		expect(
			plain((await within(dialog).findByText(/^Cria 6 unidades/)).textContent),
		).toBe("Cria 6 unidades das 12 que restam nesta obra. Depois, sobram 6.");
	});

	test("sends the whole tower in one request and confirms it", async () => {
		const { towerA, several } = build();
		const api = writableApi(obra(), several, {
			remaining: 12,
			subtreeRooms: [],
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(towerA.id));
		const dialog = await openDuplicate("Ações da torre", "Duplicar torre");
		await within(dialog).findByText(/^Cria 6 unidades/);

		await submit(dialog);

		expect(await screen.findByText("Torre C criada.")).toBeInTheDocument();
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(api.created).toHaveLength(1);
		const [sent] = api.created;
		expect(sent?.unitTypes).toEqual([]);
		expect(sent?.locations.map(({ type, name }) => [type, name])).toEqual([
			["tower", "Torre C"],
			["floor", "9º andar"],
			["unit", "901"],
			["unit", "902"],
			["unit", "903"],
			["unit", "904"],
			["common_area", "Hall"],
			["floor", "10º andar"],
			["unit", "1001"],
			["unit", "1002"],
			["common_area", "Salão de festas"],
		]);
		expect(api.roomsRead).toEqual([towerA.id]);
	});
});

describe("duplicating a floor", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("asks for the floor above the top one", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra(), several, { remaining: 12 }).handler,
		});
		renderAt(pathOf(ninth.id));

		const dialog = await openDuplicate("Ações do andar", "Duplicar andar");

		expect(
			within(dialog).getByRole("heading", { name: "Duplicar o 9º andar" }),
		).toBeInTheDocument();
		expect(nameField(dialog)).toHaveValue("11º andar");
		expect(within(dialog).getByText("Único na torre.")).toBeInTheDocument();
		expect(
			plain((await within(dialog).findByText(/^Cria 4 unidades/)).textContent),
		).toBe("Cria 4 unidades das 12 que restam nesta obra. Depois, sobram 8.");
	});

	test("renumbers the units by the new number and shows the floor on the façade", async () => {
		const { ninth, towerA, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		const dialog = await openDuplicate("Ações do andar", "Duplicar andar");
		await typeName(dialog, "13º andar");

		await submit(dialog);

		expect(await screen.findByText("13º andar criado.")).toBeInTheDocument();
		const [sent] = api.created;
		expect(
			sent?.locations.map(({ type, name, parentId }) => [type, name, parentId]),
		).toEqual([
			["floor", "13º andar", towerA.id],
			["unit", "1301", expect.any(String)],
			["unit", "1302", expect.any(String)],
			["unit", "1303", expect.any(String)],
			["unit", "1304", expect.any(String)],
			["common_area", "Hall", expect.any(String)],
		]);
		expect(sent?.locations[1]?.unitTypeId).toBe(
			nth(ninth.units, 0).unitType?.id,
		);
		expect(sent?.locations[3]).not.toHaveProperty("unitTypeId");

		await user.click(await screen.findByRole("link", { name: "Torre A" }));
		const facade = await screen.findByRole("list", {
			name: "Fachada da Torre A",
		});
		expect(
			await within(facade).findByRole("link", { name: "Unidade 1301" }),
		).toBeInTheDocument();
	});

	test("keeps the rooms and the changes the units were read with", async () => {
		const { ninth, several } = build();
		const [first] = ninth.units;
		const api = writableApi(obra(), several, {
			remaining: 12,
			subtreeRooms: [
				{
					id: first?.id ?? "",
					rooms: [
						{
							id: "0190c000-0000-7000-8000-000000000001",
							name: "Sala de estar",
							unitTypeRoomId: "0190c000-0000-7000-8000-0000000000a1",
							renamed: true,
						},
						{
							id: "0190c000-0000-7000-8000-000000000002",
							name: "Varanda",
							unitTypeRoomId: null,
							renamed: false,
						},
					],
					droppedRooms: [
						{
							unitTypeRoomId: "0190c000-0000-7000-8000-0000000000a2",
							name: "Lavanderia",
						},
					],
				},
			],
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		const dialog = await openDuplicate("Ações do andar", "Duplicar andar");

		await submit(dialog);

		await screen.findByText("11º andar criado.");
		const copy = api.created[0]?.locations[1];
		expect(copy?.rooms).toEqual([
			{
				id: expect.any(String),
				name: "Sala de estar",
				unitTypeRoomId: "0190c000-0000-7000-8000-0000000000a1",
				renamed: true,
			},
			{ id: expect.any(String), name: "Varanda" },
		]);
		expect(copy?.droppedRooms).toEqual([
			"0190c000-0000-7000-8000-0000000000a2",
		]);
		expect(copy?.rooms?.[0]?.id).not.toBe(
			"0190c000-0000-7000-8000-000000000001",
		);
	});
});

describe("duplicating a floor whose units clash", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("numbers the units of a floor without a number as copies past the first", async () => {
		const terreo = floor("Térreo", ["Loja 1", "Loja 2"]);
		const first = floor("Térreo 2", ["Loja 1 cópia 1", "Loja 2 cópia 1"]);
		const api = writableApi(
			obra(),
			structureOf([tower("Torre A", [terreo, first])]),
			{ remaining: 12 },
		);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(terreo.id));
		const dialog = await openDuplicate("Ações do andar", "Duplicar andar");
		await typeName(dialog, "Térreo 3");

		await submit(dialog);

		expect(
			await screen.findByText("Andar Térreo 3 criado."),
		).toBeInTheDocument();
		expect(
			api.created[0]?.locations
				.filter(({ type }) => type === "unit")
				.map(({ name }) => name),
		).toEqual(["Loja 1 cópia 2", "Loja 2 cópia 2"]);
	});

	test("numbers the copy past the units someone else just created", async () => {
		const terreo = floor("Térreo", ["Loja 1", "Loja 2"]);
		const towerA = tower("Torre A", [terreo]);
		const api = writableApi(obra(), structureOf([towerA]), {
			remaining: 12,
			create: (_body, attempt) => {
				if (attempt !== 1) return undefined;
				towerA.floors.push(
					floor("Mezanino", ["Loja 1 cópia 1", "Loja 2 cópia 1"]),
				);
				return problem(409, LOCATION_NAME_TAKEN, {
					names: ["Loja 1 cópia 1", "Loja 2 cópia 1"],
				});
			},
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(terreo.id));
		const dialog = await openDuplicate("Ações do andar", "Duplicar andar");
		await typeName(dialog, "Térreo 2");

		await submit(dialog);

		expect(
			await within(dialog).findByText(
				"As unidades “Loja 1 cópia 1” e “Loja 2 cópia 1” acabaram de ser criadas nesta torre. Tente de novo para usar o próximo número de cópia.",
			),
		).toBeInTheDocument();
		await submit(dialog);

		expect(
			await screen.findByText("Andar Térreo 2 criado."),
		).toBeInTheDocument();
		expect(
			api.created[1]?.locations
				.filter(({ type }) => type === "unit")
				.map(({ name }) => name),
		).toEqual(["Loja 1 cópia 2", "Loja 2 cópia 2"]);
	});

	test("asks for another floor number when a renumbered unit is taken", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, {
			remaining: 12,
			create: () =>
				problem(409, LOCATION_NAME_TAKEN, { names: ["1101", "1102"] }),
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		const dialog = await openDuplicate("Ações do andar", "Duplicar andar");

		await submit(dialog);

		expect(
			await within(dialog).findByText(
				"Já existem as unidades “1101” e “1102” na Torre A. Troque o número do andar e tente de novo.",
			),
		).toBeInTheDocument();
		expect(
			within(dialog).queryByText(/Confira sua conexão/),
		).not.toBeInTheDocument();
		expect(nameField(dialog)).toHaveAttribute("aria-invalid", "false");
	});
});

describe("duplicating a unit", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("asks for the next number on the floor in the unit's own font", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra(), several, { remaining: 12 }).handler,
		});
		renderAt(pathOf(ninth.id));

		const dialog = await openDuplicate(
			"Ações da unidade 903",
			"Duplicar unidade",
		);

		expect(
			within(dialog).getByRole("heading", { name: "Duplicar a unidade 903" }),
		).toBeInTheDocument();
		expect(nameField(dialog)).toHaveValue("905");
		expect(nameField(dialog)).toHaveClass("font-mono");
		expect(
			plain((await within(dialog).findByText(/^Cria 1 unidade/)).textContent),
		).toBe("Cria 1 unidade das 12 que restam nesta obra. Depois, sobram 11.");
	});

	test("says the only unit left in the singular", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra(), several, { remaining: 1 }).handler,
		});
		renderAt(pathOf(ninth.id));

		const dialog = await openDuplicate(
			"Ações da unidade 903",
			"Duplicar unidade",
		);

		expect(
			plain((await within(dialog).findByText(/^Cria 1 unidade/)).textContent),
		).toBe("Cria 1 unidade, a única que resta nesta obra. Depois, sobram 0.");
		expect(
			within(dialog).getByRole("button", { name: "Duplicar" }),
		).toBeEnabled();
	});

	test("adds the copy to the end of the floor with the same unit type and refreshes the list", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		const dialog = await openDuplicate(
			"Ações da unidade 901",
			"Duplicar unidade",
		);

		await submit(dialog);

		expect(await screen.findByText("Unidade 905 criada.")).toBeInTheDocument();
		expect(api.created[0]?.locations).toEqual([
			{
				id: expect.any(String),
				parentId: ninth.id,
				type: "unit",
				name: "905",
				unitTypeId: nth(ninth.units, 0).unitType?.id,
			},
		]);
		expect(
			await screen.findByRole("link", { name: /^905/ }),
		).toBeInTheDocument();
	});

	test("is offered on the unit's own page", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra(), several, { remaining: 12 }).handler,
		});
		renderAt(pathOf(nth(ninth.units, 2).id));

		const dialog = await openDuplicate("Ações da unidade", "Duplicar unidade");

		expect(nameField(dialog)).toHaveValue("905");
	});

	test("works in the bottom panel on the phone", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });
		setViewport("phone");
		renderAt(pathOf(ninth.id));
		const dialog = await openDuplicate(
			"Ações da unidade 903",
			"Duplicar unidade",
		);

		await typeName(dialog, "906");
		await user.keyboard("{Enter}");

		expect(await screen.findByText("Unidade 906 criada.")).toBeInTheDocument();
		expect(api.created).toHaveLength(1);
		await waitFor(() => expect(dialog).not.toBeInTheDocument());
	});

	test("stays open with the error in the field when the name is taken (R7)", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, {
			remaining: 12,
			create: () => problem(409, LOCATION_NAME_TAKEN, { names: ["905"] }),
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		const dialog = await openDuplicate(
			"Ações da unidade 903",
			"Duplicar unidade",
		);

		await submit(dialog);

		expect(
			await within(dialog).findByText("Já existe a unidade 905 na Torre A."),
		).toBeInTheDocument();
		expect(nameField(dialog)).toHaveAttribute("aria-invalid", "true");
		expect(dialog).toBeInTheDocument();
	});

	test("asks for a name before sending", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remaining: 12 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		const dialog = await openDuplicate(
			"Ações da unidade 903",
			"Duplicar unidade",
		);
		await user.clear(nameField(dialog));

		await submit(dialog);

		expect(
			await within(dialog).findByText("Informe o nome."),
		).toBeInTheDocument();
		expect(api.created).toHaveLength(0);
	});

	test("shows a failure in the dialog and keeps the copy retryable with the same ids", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, {
			remaining: 12,
			create: (_body, attempt) => (attempt === 1 ? json({}, 500) : undefined),
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		const dialog = await openDuplicate(
			"Ações da unidade 903",
			"Duplicar unidade",
		);

		await typeName(dialog, "907");
		await submit(dialog);
		expect(
			await within(dialog).findByText(
				"Não foi possível duplicar. Confira sua conexão e tente de novo.",
			),
		).toBeInTheDocument();
		await submit(dialog);

		expect(await screen.findByText("Unidade 907 criada.")).toBeInTheDocument();
		expect(api.created).toHaveLength(2);
		expect(api.created[1]?.locations[0]?.id).toBe(
			api.created[0]?.locations[0]?.id,
		);
	});
});

describe("duplicating past the reserva (R9b)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("refuses a floor that does not fit and tells the manager to ask the admin", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra("manager"), several, { remaining: 2 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));

		const dialog = await openDuplicate("Ações do andar", "Duplicar andar");

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Duplicar o 9º andar cria 4 unidades e restam 2.",
		);
		expect(
			within(dialog).queryByRole("button", { name: "Alterar reserva" }),
		).not.toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Duplicar" }),
		).toBeDisabled();
		expect(within(dialog).queryByText(/^Cria /)).not.toBeInTheDocument();
	});

	test("says the reserva is over when nothing remains", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra("manager"), several, { remaining: 0 }).handler,
		});
		renderAt(pathOf(ninth.id));

		const dialog = await openDuplicate(
			"Ações da unidade 903",
			"Duplicar unidade",
		);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Duplicar a unidade 903 cria 1 unidade e a reserva da obra acabou.",
		);
		expect(
			within(dialog).getByRole("button", { name: "Duplicar" }),
		).toBeDisabled();
	});

	test("gives the admin the link to change the reserva", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra("admin"), several, { remaining: 2 }).handler,
		});
		renderAt(pathOf(ninth.id));

		const dialog = await openDuplicate("Ações do andar", "Duplicar andar");

		expect(
			await within(dialog).findByRole("button", { name: "Alterar reserva" }),
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Duplicar" }),
		).toBeDisabled();
	});

	test("lands in the same state with the server's numbers when the places were taken first", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra("manager"), several, {
			remaining: 12,
			create: () => {
				api.state.units.remaining = 3;
				return problem(409, NO_UNITS_LEFT, { requested: 4, available: 3 });
			},
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		const dialog = await openDuplicate("Ações do andar", "Duplicar andar");
		await within(dialog).findByText(/^Cria 4 unidades/);

		await submit(dialog);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Duplicar o 9º andar cria 4 unidades e restam 3.",
		);
		expect(
			within(dialog).getByRole("button", { name: "Duplicar" }),
		).toBeDisabled();
		expect(dialog).toBeInTheDocument();
	});
});

describe("who may duplicate", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("offers nothing on a delivered obra", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra("manager", true), several).handler,
		});
		renderAt(pathOf(ninth.id));

		await screen.findByRole("heading", { name: "9º andar" });

		expect(
			screen.queryByRole("button", { name: "Ações do andar" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Ações da unidade 901" }),
		).not.toBeInTheDocument();
	});

	test("does not offer it on a common area", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra(), several, { remaining: 12 }).handler,
		});
		renderAt(pathOf(nth(ninth.commonAreas, 0).id));

		await user.click(
			await screen.findByRole("button", { name: "Ações da área comum" }),
		);

		expect(
			screen.queryByRole("menuitem", { name: /Duplicar/ }),
		).not.toBeInTheDocument();
	});
});
