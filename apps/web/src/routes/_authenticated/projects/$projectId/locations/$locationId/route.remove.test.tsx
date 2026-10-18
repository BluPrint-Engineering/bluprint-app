import { NO_UNITS_LEFT, PROJECT_DELIVERED } from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import {
	droppedRoom,
	floor,
	room,
	structureOf,
	tower,
	writableApi,
} from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const user = userEvent.setup({ delay: null });

function build() {
	const ninth = floor(
		"9º andar",
		["901", "902", "903", { name: "904", unitType: "Tipologia A" }],
		["Hall"],
	);
	const tenth = floor("10º andar");
	const towerA = tower("Torre A", [ninth, tenth], ["Salão de festas"]);
	const towerB = tower("Torre B", [floor("1º andar", ["101", "102"])]);
	const towerC = tower("Torre C");
	return {
		ninth,
		tenth,
		towerA,
		towerB,
		towerC,
		several: structureOf([towerA, towerB, towerC], ["Guarita"]),
	};
}

function obra(status: "active" | "delivered" = "active") {
	return { ...project(3, "manager", status), name: "Casa Moinhos" };
}

const pathOf = (id: string) => `/projects/${obra().id}/locations/${id}`;

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Conflict", status, code, ...extra },
		status,
	);
}

const failure = () => json({}, 500);

async function pick(menuName: string, itemName: string) {
	await user.click(await screen.findByRole("button", { name: menuName }));
	await user.click(await screen.findByRole("menuitem", { name: itemName }));
}

afterEach(() => {
	vi.unstubAllGlobals();
	toast.dismiss();
});

describe("removing an empty location at once (R1)", () => {
	test("deletes a unit from the floor's list without asking, and says so with Desfazer", async () => {
		const { ninth, several } = build();
		const unit = nth(ninth.units, 3);
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));

		await pick("Ações da unidade 904", "Remover unidade");

		expect(await screen.findByText("Unidade 904 excluída.")).toBeVisible();
		expect(screen.getByRole("button", { name: "Desfazer" })).toBeVisible();
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		expect(api.removed).toEqual([unit.id]);
		await waitFor(() => {
			expect(
				screen.queryByRole("button", { name: "Ações da unidade 904" }),
			).not.toBeInTheDocument();
		});
		expect(
			screen.getByRole("button", { name: "Ações da unidade 903" }),
		).toBeInTheDocument();
	});

	test("draws Desfazer as an outlined button", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, { api: writableApi(obra(), several).handler });
		renderAt(pathOf(ninth.id));

		await pick("Ações da unidade 904", "Remover unidade");

		const undo = await screen.findByRole("button", { name: "Desfazer" });
		expect(undo).toHaveClass("border-border");
		expect(undo).not.toHaveClass("border-transparent");
	});

	test("brings the unit back with the same id, place, unit type, rooms and changes when Desfazer is pressed", async () => {
		const { ninth, several } = build();
		const unit = nth(ninth.units, 3);
		const kept = room("Cozinha", { fromType: true });
		const renamed = room("Estar", { fromType: true, renamed: true });
		const own = room("Lavanderia");
		const taken = droppedRoom("Sacada");
		const api = writableApi(obra(), several, {
			details: {
				[unit.id]: {
					position: 3,
					rooms: [renamed, kept, own],
					droppedRooms: [taken],
					changes: 3,
				},
			},
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await pick("Ações da unidade 904", "Remover unidade");

		await user.click(await screen.findByRole("button", { name: "Desfazer" }));

		expect(
			await screen.findByRole("button", { name: "Ações da unidade 904" }),
		).toBeInTheDocument();
		expect(api.created).toEqual([
			{
				unitTypes: [],
				locations: [
					{
						id: unit.id,
						parentId: ninth.id,
						type: "unit",
						name: "904",
						position: 3,
						unitTypeId: unit.unitType?.id,
						rooms: [
							{
								id: renamed.id,
								name: "Estar",
								unitTypeRoomId: renamed.unitTypeRoomId,
								renamed: true,
							},
							{
								id: kept.id,
								name: "Cozinha",
								unitTypeRoomId: kept.unitTypeRoomId,
							},
							{ id: own.id, name: "Lavanderia" },
						],
						droppedRooms: [taken.unitTypeRoomId],
					},
				],
			},
		]);
		await waitFor(() => {
			expect(
				screen.queryByText("Unidade 904 excluída."),
			).not.toBeInTheDocument();
		});
	});

	test("brings a unit without a unit type back with its rooms and none taken out", async () => {
		const { ninth, several } = build();
		const unit = nth(ninth.units, 1);
		const own = room("Sala");
		const api = writableApi(obra(), several, {
			details: { [unit.id]: { position: 1, rooms: [own] } },
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await pick("Ações da unidade 902", "Remover unidade");

		await user.click(await screen.findByRole("button", { name: "Desfazer" }));

		await waitFor(() => expect(api.created).toHaveLength(1));
		expect(api.created[0]?.locations).toEqual([
			{
				id: unit.id,
				parentId: ninth.id,
				type: "unit",
				name: "902",
				position: 1,
				rooms: [{ id: own.id, name: "Sala" }],
			},
		]);
	});

	test("says the reservation ran out when the place was used before Desfazer (R1b)", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, {
			create: () => problem(409, NO_UNITS_LEFT, { requested: 1, available: 0 }),
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await pick("Ações da unidade 904", "Remover unidade");

		await user.click(await screen.findByRole("button", { name: "Desfazer" }));

		expect(
			await screen.findByText(
				"Não foi possível trazer a unidade 904 de volta: a reserva da obra acabou.",
			),
		).toBeVisible();
		await waitFor(() => {
			expect(
				screen.queryByRole("button", { name: "Desfazer" }),
			).not.toBeInTheDocument();
		});
		expect(
			screen.queryByRole("button", { name: "Ações da unidade 904" }),
		).not.toBeInTheDocument();
	});

	test("asks to check the connection when Desfazer fails for any other reason", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { create: failure });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await pick("Ações da unidade 904", "Remover unidade");

		await user.click(await screen.findByRole("button", { name: "Desfazer" }));

		expect(
			await screen.findByText(
				"Não foi possível trazer a unidade 904 de volta. Confira sua conexão e tente de novo.",
			),
		).toBeVisible();
	});

	test.each([
		[
			"a common area of the floor",
			"Ações da área comum Hall",
			"Remover área comum",
			"Área comum Hall excluída.",
		],
	])("deletes %s at once", async (_label, menu, item, text) => {
		const { ninth, several } = build();
		const hall = nth(ninth.commonAreas, 0);
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));

		await pick(menu, item);

		expect(await screen.findByText(text)).toBeVisible();
		expect(screen.getByRole("button", { name: "Desfazer" })).toBeVisible();
		expect(api.removed).toEqual([hall.id]);
	});

	test("deletes a floor without children from its page and goes up to the tower, with Desfazer", async () => {
		const { tenth, towerA, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(tenth.id));

		await pick("Ações do andar", "Remover andar");

		expect(await screen.findByText("10º andar excluído.")).toBeVisible();
		expect(screen.getByRole("button", { name: "Desfazer" })).toBeVisible();
		expect(
			await screen.findByRole("heading", { level: 1, name: "Torre A" }),
		).toBeInTheDocument();
		expect(api.removed).toEqual([tenth.id]);
		expect(towerA.floors).toHaveLength(1);
	});

	test("deletes a tower without floors from its page and goes up to the obra, with Desfazer", async () => {
		const { towerC, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		const { router } = renderAt(pathOf(towerC.id));

		await pick("Ações da torre", "Remover torre");

		expect(await screen.findByText("Torre C excluída.")).toBeVisible();
		expect(screen.getByRole("button", { name: "Desfazer" })).toBeVisible();
		await waitFor(() => {
			expect(router.state.location.pathname).toBe(`/projects/${obra().id}`);
		});
	});

	test("deletes a unit from its own page and goes up to the floor", async () => {
		const { ninth, several } = build();
		const unit = nth(ninth.units, 0);
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(unit.id));

		await pick("Ações da unidade", "Remover unidade");

		expect(await screen.findByText("Unidade 901 excluída.")).toBeVisible();
		expect(
			await screen.findByRole("heading", { level: 1, name: "9º andar" }),
		).toBeInTheDocument();
	});

	test("gives the unit's place back to the obra's reservation", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remaining: 5 });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));

		await pick("Ações da unidade 904", "Remover unidade");

		await waitFor(() => expect(api.state.units.remaining).toBe(6));
	});
});

describe("removing a location with children (R2)", () => {
	test("asks to confirm a floor, counting its units and common area, and says the units go back to the reservation", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));

		await pick("Ações do andar", "Remover andar");

		const dialog = await screen.findByRole("alertdialog");
		expect(
			within(dialog).getByRole("heading", { name: "Excluir o 9º andar?" }),
		).toBeInTheDocument();
		expect(
			within(dialog).getByText(
				"O 9º andar não tem pins, plantas nem dados. As 4 unidades e a área comum dele também são excluídas.",
			),
		).toBeInTheDocument();
		expect(
			within(dialog).getByText("As 4 unidades voltam para a reserva da obra."),
		).toBeInTheDocument();
		expect(api.removed).toEqual([]);
	});

	test("asks to confirm a tower, counting its floors, units and every common area under it", async () => {
		const { towerA, several } = build();
		stubApi(signedIn, { api: writableApi(obra(), several).handler });
		renderAt(pathOf(towerA.id));

		await pick("Ações da torre", "Remover torre");

		const dialog = await screen.findByRole("alertdialog");
		expect(
			within(dialog).getByRole("heading", { name: "Excluir a Torre A?" }),
		).toBeInTheDocument();
		expect(
			within(dialog).getByText(
				"A Torre A não tem pins, plantas nem dados. Os 2 andares, as 4 unidades e as 2 áreas comuns dela também são excluídos.",
			),
		).toBeInTheDocument();
		expect(
			within(dialog).getByText("As 4 unidades voltam para a reserva da obra."),
		).toBeInTheDocument();
	});

	test("leaves out the reservation line when nothing below is a unit", async () => {
		const tenth = floor("10º andar", [], ["Terraço"]);
		const towerA = tower("Torre A", [tenth]);
		stubApi(signedIn, {
			api: writableApi(obra(), structureOf([towerA])).handler,
		});
		renderAt(pathOf(tenth.id));

		await pick("Ações do andar", "Remover andar");

		const dialog = await screen.findByRole("alertdialog");
		expect(
			within(dialog).getByText(
				"O 10º andar não tem pins, plantas nem dados. A área comum dele também é excluída.",
			),
		).toBeInTheDocument();
		expect(
			within(dialog).queryByText(/reserva da obra/),
		).not.toBeInTheDocument();
	});

	test("asks to confirm a floor that looked empty when someone added a unit to it meanwhile", async () => {
		const { tenth, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(tenth.id));
		expect(
			await screen.findByRole("heading", { level: 1, name: "10º andar" }),
		).toBeInTheDocument();
		tenth.units.push(...floor("10º andar", ["1001"]).units);

		await pick("Ações do andar", "Remover andar");

		const dialog = await screen.findByRole("alertdialog");
		expect(
			within(dialog).getByRole("heading", { name: "Excluir o 10º andar?" }),
		).toBeInTheDocument();
		expect(
			within(dialog).getByText("A unidade volta para a reserva da obra."),
		).toBeInTheDocument();
		expect(api.removed).toEqual([]);
	});

	test("deletes after Excluir, goes up to the tower and says so without offering Desfazer", async () => {
		const { ninth, towerA, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await pick("Ações do andar", "Remover andar");
		const dialog = await screen.findByRole("alertdialog");

		await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

		expect(await screen.findByText("9º andar excluído.")).toBeVisible();
		expect(
			await screen.findByRole("heading", { level: 1, name: "Torre A" }),
		).toBeInTheDocument();
		expect(api.removed).toEqual([ninth.id]);
		expect(towerA.floors.map(({ name }) => name)).toEqual(["10º andar"]);
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Desfazer" }),
		).not.toBeInTheDocument();
		await waitFor(() => expect(api.state.units.remaining).toBe(104));
	});

	test("deletes nothing with Cancelar or Escape", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await pick("Ações do andar", "Remover andar");
		let dialog = await screen.findByRole("alertdialog");

		await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
		await pick("Ações do andar", "Remover andar");
		dialog = await screen.findByRole("alertdialog");
		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
		expect(api.removed).toEqual([]);
		expect(
			screen.getByRole("heading", { level: 1, name: "9º andar" }),
		).toBeInTheDocument();
	});

	test("holds the dialog while it deletes: Excluindo… and nothing else to press", async () => {
		const { ninth, several } = build();
		let finish: (response: Response) => void = () => {};
		const pending = new Promise<Response>((resolve) => {
			finish = resolve;
		});
		const api = writableApi(obra(), several, { remove: () => pending });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await pick("Ações do andar", "Remover andar");
		const dialog = await screen.findByRole("alertdialog");

		await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

		expect(
			await within(dialog).findByRole("button", { name: "Excluindo…" }),
		).toBeDisabled();
		expect(
			within(dialog).getByRole("button", { name: "Cancelar" }),
		).toBeDisabled();
		finish(
			new Response(
				JSON.stringify({
					outcome: "deleted",
					removed: { floors: 1, units: 4, commonAreas: 1 },
				}),
			),
		);
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
	});

	test("puts the action first on the phone", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, { api: writableApi(obra(), several).handler });
		setViewport("phone");
		renderAt(pathOf(ninth.id));

		await user.click(
			await screen.findByRole("button", { name: "Ações do andar" }),
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Remover andar" }),
		);

		const dialog = await screen.findByRole("alertdialog");
		expect(
			within(dialog)
				.getAllByRole("button")
				.map((button) => button.textContent)
				.filter(Boolean),
		).toEqual(["Excluir", "Cancelar"]);
	});
});

describe("when removing fails (R8)", () => {
	test("keeps the unit where it was and says so in a toast", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remove: failure });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));

		await pick("Ações da unidade 904", "Remover unidade");

		expect(
			await screen.findByText(
				"Não foi possível remover a unidade 904. Confira sua conexão e tente de novo.",
			),
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Ações da unidade 904" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Desfazer" }),
		).not.toBeInTheDocument();
	});

	test("closes the confirmation and stays on the floor", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, { remove: failure });
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await pick("Ações do andar", "Remover andar");
		const dialog = await screen.findByRole("alertdialog");

		await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

		expect(
			await screen.findByText(
				"Não foi possível remover o 9º andar. Confira sua conexão e tente de novo.",
			),
		).toBeVisible();
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
		expect(
			screen.getByRole("heading", { level: 1, name: "9º andar" }),
		).toBeInTheDocument();
	});

	test("turns the screen read-only when the obra was delivered meanwhile", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, {
			remove: () => problem(409, PROJECT_DELIVERED),
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));

		await pick("Ações da unidade 904", "Remover unidade");

		await waitFor(() => expect(api.removed).toHaveLength(1));
		expect(
			screen.queryByText(/Não foi possível remover/),
		).not.toBeInTheDocument();
	});
});

describe("in a delivered obra", () => {
	test("offers no menu to remove from", async () => {
		const { ninth, several } = build();
		stubApi(signedIn, {
			api: writableApi(obra("delivered"), several).handler,
		});
		renderAt(pathOf(ninth.id));

		await screen.findByRole("heading", { level: 1, name: "9º andar" });

		expect(
			screen.queryByRole("button", { name: /^Ações d/ }),
		).not.toBeInTheDocument();
	});
});
