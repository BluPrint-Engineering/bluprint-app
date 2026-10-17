import {
	LOCATION_NOT_FOUND,
	type LocationDetail,
	PROJECT_DELIVERED,
	type ProjectSummary,
	ROOM_NAME_TAKEN,
	type UnitTypeList,
} from "@bluprint/shared";
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
	combine,
	droppedRoom,
	floor,
	locationIn,
	room,
	structureApi,
	structureOf,
	tower,
} from "@/test/structureApi";
import { setViewport } from "@/test/viewport";

const OBRA: ProjectSummary = { ...project(3), name: "Casa Moinhos" };

const ninth = floor(
	"9º andar",
	[{ name: "903", unitType: "Tipologia A" }, "904"],
	["Hall"],
);
const towerA = tower("Torre A", [ninth], ["Salão de festas"]);
const structure = structureOf([towerA, tower("Torre B")]);
const unit903 = nth(ninth.units, 0);
const unit904 = nth(ninth.units, 1);
const hall = nth(ninth.commonAreas, 0);

const sala = room("Sala", { fromType: true });
const cozinha = room("Cozinha", { fromType: true });
const sacada = room("Sacada", { fromType: true });
const lavanderia = room("Lavanderia");
const sacadaTaken = droppedRoom("Sacada");

function unitDetail(own: Partial<LocationDetail> = {}): LocationDetail {
	const found = locationIn(structure, unit903.id, {
		[unit903.id]: { rooms: [sala, cozinha, sacada], ...own },
	});
	if (!found) throw new Error("Unit 903 is not in the structure.");
	return found;
}

interface Write {
	method: string;
	path: string;
	body: unknown;
}

type Answer = (write: Write) => Promise<Response> | undefined;

function locationApi({
	details = {},
	summary = OBRA,
	unitTypes,
	answer,
}: {
	details?: Record<string, Partial<LocationDetail>>;
	summary?: ProjectSummary;
	unitTypes?: UnitTypeList;
	answer?: Answer;
} = {}) {
	const writes: Write[] = [];
	const base = `/api/projects/${OBRA.id}`;
	const handler: ApiHandler = combine(
		(url, init) => {
			const method = init?.method ?? "GET";
			if (method !== "GET" && url.pathname.startsWith(base)) {
				const write = {
					method,
					path: url.pathname.slice(base.length),
					body: init?.body ? (JSON.parse(String(init.body)) as unknown) : null,
				};
				writes.push(write);
				return answer?.(write);
			}
			if (url.pathname === `${base}/unit-types` && unitTypes) {
				return json(unitTypes);
			}
			if (url.pathname === base) return json(summary);
			return undefined;
		},
		structureApi(OBRA.id, structure, details),
	);
	return { handler, writes };
}

const UNIT_TYPES: UnitTypeList = {
	unitTypes: [
		{
			id: nth(unit903.unitType ? [unit903.unitType] : [], 0).id,
			name: "Tipologia A",
			rooms: [
				{ id: sala.unitTypeRoomId ?? "", name: "Sala" },
				{ id: cozinha.unitTypeRoomId ?? "", name: "Cozinha" },
				{ id: sacada.unitTypeRoomId ?? "", name: "Sacada" },
			],
			unitCount: 2,
			changedUnitCount: 0,
		},
		{
			id: "0190b000-0000-7000-8000-00000000f001",
			name: "Tipologia B",
			rooms: [{ id: "0190b000-0000-7000-8000-00000000f002", name: "Suíte" }],
			unitCount: 1,
			changedUnitCount: 0,
		},
	],
};

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Error", status, code, ...extra },
		status,
	);
}

const roomsList = () => screen.getByRole("list", { name: "Cômodos" });

function roomNames() {
	return within(roomsList())
		.getAllByRole("listitem")
		.map((item) => item.textContent);
}

async function openUnit(handler: ApiHandler) {
	const stubbed = stubApi(signedIn, { api: handler });
	renderAt(`/projects/${OBRA.id}/locations/${unit903.id}`);
	await screen.findByRole("heading", { level: 1, name: "903" });
	return stubbed;
}

async function openRoomMenu(name: string, action: string) {
	await userEvent.click(
		await screen.findByRole("button", { name: `Ações do cômodo ${name}` }),
	);
	await userEvent.click(await screen.findByRole("menuitem", { name: action }));
}

afterEach(() => {
	vi.unstubAllGlobals();
	toast.dismiss();
});

describe("adding a room (U3)", () => {
	test("opens the form in the list with the focus on the field, and Escape closes it", async () => {
		const { handler, writes } = locationApi({
			details: { [unit903.id]: { rooms: [sala] } },
		});
		await openUnit(handler);

		await userEvent.click(
			screen.getByRole("button", { name: "Adicionar cômodo" }),
		);

		const field = screen.getByRole("textbox", { name: "Adicionar cômodo" });
		expect(field).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		expect(
			screen.queryByRole("textbox", { name: "Adicionar cômodo" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Adicionar cômodo" }),
		).toBeInTheDocument();
		expect(writes).toEqual([]);
	});

	test("adds the room with an id the client chose and the trimmed name, then lists it", async () => {
		const { handler, writes } = locationApi({
			details: { [unit903.id]: { rooms: [sala] } },
			answer: () =>
				json(unitDetail({ rooms: [sala, lavanderia], changes: 1 }), 201),
		});
		await openUnit(handler);
		await userEvent.click(
			screen.getByRole("button", { name: "Adicionar cômodo" }),
		);

		await userEvent.type(
			screen.getByRole("textbox", { name: "Adicionar cômodo" }),
			"  Lavanderia {Enter}",
		);

		expect(await screen.findByText("Lavanderia")).toBeInTheDocument();
		expect(writes).toHaveLength(1);
		const [write] = writes;
		expect(write).toMatchObject({
			method: "POST",
			path: `/locations/${unit903.id}/rooms`,
		});
		expect(write?.body).toEqual({
			id: expect.stringMatching(/^[0-9a-f-]{36}$/) as string,
			name: "Lavanderia",
		});
		expect(
			screen.queryByRole("textbox", { name: "Adicionar cômodo" }),
		).not.toBeInTheDocument();
		expect(screen.getByText("1 alteração")).toBeInTheDocument();
	});

	test("says the name is taken in this unit and keeps what was typed", async () => {
		const { handler } = locationApi({
			details: { [unit903.id]: { rooms: [sala] } },
			answer: () => problem(409, ROOM_NAME_TAKEN, { names: ["sala"] }),
		});
		await openUnit(handler);
		await userEvent.click(
			screen.getByRole("button", { name: "Adicionar cômodo" }),
		);

		await userEvent.type(
			screen.getByRole("textbox", { name: "Adicionar cômodo" }),
			"sala{Enter}",
		);

		expect(
			await screen.findByText("Já existe o cômodo sala nesta unidade."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Adicionar cômodo" }),
		).toHaveValue("sala");
	});

	test("asks for a name before sending anything", async () => {
		const { handler, writes } = locationApi();
		await openUnit(handler);
		await userEvent.click(
			screen.getByRole("button", { name: "Adicionar cômodo" }),
		);

		await userEvent.type(
			screen.getByRole("textbox", { name: "Adicionar cômodo" }),
			"   {Enter}",
		);

		expect(
			await screen.findByText("Informe o nome do cômodo."),
		).toBeInTheDocument();
		expect(writes).toEqual([]);
	});

	test("says it could not add when the request fails, and keeps the form", async () => {
		const { handler } = locationApi({
			answer: () => problem(500, "INTERNAL_ERROR"),
		});
		await openUnit(handler);
		await userEvent.click(
			screen.getByRole("button", { name: "Adicionar cômodo" }),
		);

		await userEvent.type(
			screen.getByRole("textbox", { name: "Adicionar cômodo" }),
			"Varanda{Enter}",
		);

		expect(
			await screen.findByText(
				"Não foi possível adicionar o cômodo. Confira sua conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Adicionar cômodo" }),
		).toHaveValue("Varanda");
	});

	test("retries a failed name with the same id, and sends a new name or a reopened form with a new one", async () => {
		const { handler, writes } = locationApi({
			answer: () => problem(500, "INTERNAL_ERROR"),
		});
		await openUnit(handler);
		const field = () =>
			screen.getByRole("textbox", { name: "Adicionar cômodo" });
		const failure =
			"Não foi possível adicionar o cômodo. Confira sua conexão e tente de novo.";
		const sent = async (count: number) => {
			await screen.findByText(failure);
			await waitFor(() => expect(writes).toHaveLength(count));
		};
		await userEvent.click(
			screen.getByRole("button", { name: "Adicionar cômodo" }),
		);

		await userEvent.type(field(), "Lavanderia{Enter}");
		await sent(1);
		await userEvent.click(screen.getByRole("button", { name: "Adicionar" }));
		await sent(2);
		await userEvent.clear(field());
		await userEvent.type(field(), "Despensa{Enter}");
		await sent(3);
		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		await userEvent.click(
			screen.getByRole("button", { name: "Adicionar cômodo" }),
		);
		await userEvent.type(field(), "Despensa{Enter}");
		await sent(4);

		const ids = writes.map((write) => (write.body as { id: string }).id);
		expect(ids[1]).toBe(ids[0]);
		expect(new Set([ids[0], ids[2], ids[3]]).size).toBe(3);
	});

	test("adds a room to a common area and names it in the error (U5)", async () => {
		const { handler, writes } = locationApi({
			details: { [hall.id]: { rooms: [room("Banheiro")] } },
			answer: () => problem(409, ROOM_NAME_TAKEN, { names: ["Banheiro"] }),
		});
		stubApi(signedIn, { api: handler });
		renderAt(`/projects/${OBRA.id}/locations/${hall.id}`);
		await screen.findByRole("heading", { level: 1, name: "Hall" });

		await userEvent.click(
			screen.getByRole("button", { name: "Adicionar cômodo" }),
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: "Adicionar cômodo" }),
			"Banheiro{Enter}",
		);

		expect(
			await screen.findByText("Já existe o cômodo Banheiro nesta área comum."),
		).toBeInTheDocument();
		expect(writes[0]?.path).toBe(`/locations/${hall.id}/rooms`);
	});
});

describe("renaming a room", () => {
	test("renames a room of the unit type only in this unit, and says so (G3)", async () => {
		const renamed = { ...sala, name: "Sala de estar", renamed: true };
		const { handler, writes } = locationApi({
			details: { [unit903.id]: { rooms: [sala, cozinha] } },
			answer: () => json(unitDetail({ rooms: [renamed, cozinha], changes: 1 })),
		});
		await openUnit(handler);

		await openRoomMenu("Sala", "Renomear");

		const dialog = await screen.findByRole("dialog", {
			name: "Renomear o cômodo",
		});
		expect(dialog).toHaveTextContent(
			"Muda só nesta unidade. A tipologia continua com o nome dela.",
		);
		const field = within(dialog).getByRole("textbox", { name: "Nome" });
		expect(field).toHaveValue("Sala");
		await userEvent.clear(field);
		await userEvent.type(field, "Sala de estar");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Salvar" }),
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(await screen.findByText("Sala de estar")).toBeInTheDocument();
		expect(screen.getByText("1 alteração")).toBeInTheDocument();
		expect(writes).toEqual([
			{
				method: "PATCH",
				path: `/rooms/${sala.id}`,
				body: { name: "Sala de estar" },
			},
		]);
	});

	test("says the name is taken in the field and keeps the dialog open", async () => {
		const { handler } = locationApi({
			details: { [unit903.id]: { rooms: [sala, cozinha] } },
			answer: () => problem(409, ROOM_NAME_TAKEN, { names: ["Cozinha"] }),
		});
		await openUnit(handler);
		await openRoomMenu("Sala", "Renomear");
		const dialog = await screen.findByRole("dialog", {
			name: "Renomear o cômodo",
		});
		const field = within(dialog).getByRole("textbox", { name: "Nome" });

		await userEvent.clear(field);
		await userEvent.type(field, "Cozinha{Enter}");

		expect(
			await within(dialog).findByText(
				"Já existe o cômodo Cozinha nesta unidade.",
			),
		).toBeInTheDocument();
		expect(dialog).toBeInTheDocument();
	});

	test("closes without a request when the name did not change", async () => {
		const { handler, writes } = locationApi({
			details: { [unit903.id]: { rooms: [sala] } },
		});
		await openUnit(handler);
		await openRoomMenu("Sala", "Renomear");
		const dialog = await screen.findByRole("dialog", {
			name: "Renomear o cômodo",
		});

		await userEvent.type(
			within(dialog).getByRole("textbox", { name: "Nome" }),
			"{Enter}",
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(writes).toEqual([]);
	});

	test("opens as a bottom panel on a phone", async () => {
		setViewport("phone");
		const { handler } = locationApi({
			details: { [unit903.id]: { rooms: [lavanderia] } },
		});
		await openUnit(handler);

		await openRoomMenu("Lavanderia", "Renomear");

		const dialog = await screen.findByRole("dialog", {
			name: "Renomear o cômodo",
		});
		expect(dialog).toHaveTextContent(
			"O nome novo vale em todo lugar onde o cômodo aparece.",
		);
		expect(
			within(dialog).getByRole("button", { name: "Salvar" }),
		).toBeInTheDocument();
	});
});

describe("removing a room", () => {
	test("takes a room of the unit type out of this unit and lists it under Tirados desta unidade", async () => {
		const { handler, writes } = locationApi({
			details: { [unit903.id]: { rooms: [sala, cozinha, sacada] } },
			answer: () =>
				json(
					unitDetail({
						rooms: [sala, cozinha],
						droppedRooms: [sacadaTaken],
						changes: 1,
					}),
				),
		});
		await openUnit(handler);

		await openRoomMenu("Sacada", "Remover desta unidade");

		const dropped = await screen.findByRole("list", {
			name: "Tirados desta unidade",
		});
		expect(within(dropped).getByText("Sacada")).toBeInTheDocument();
		expect(roomNames()).toEqual(["Sala", "Cozinha", "Adicionar cômodo"]);
		expect(writes).toEqual([
			{ method: "DELETE", path: `/rooms/${sacada.id}`, body: null },
		]);
	});

	test("offers Remover cômodo, not Remover desta unidade, on a room only the unit has", async () => {
		const { handler } = locationApi({
			details: { [unit903.id]: { rooms: [sala, lavanderia] } },
		});
		await openUnit(handler);

		await userEvent.click(
			screen.getByRole("button", { name: "Ações do cômodo Lavanderia" }),
		);

		expect(
			await screen.findByRole("menuitem", { name: "Remover cômodo" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("menuitem", { name: "Remover desta unidade" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("menuitem", { name: "Renomear" }),
		).toBeInTheDocument();
	});

	test("removes a room only the unit has", async () => {
		const { handler, writes } = locationApi({
			details: { [unit903.id]: { rooms: [sala, lavanderia] } },
			answer: () => json(unitDetail({ rooms: [sala] })),
		});
		await openUnit(handler);

		await openRoomMenu("Lavanderia", "Remover cômodo");

		await waitFor(() => {
			expect(roomNames()).toEqual(["Sala", "Adicionar cômodo"]);
		});
		expect(writes[0]).toMatchObject({
			method: "DELETE",
			path: `/rooms/${lavanderia.id}`,
		});
	});

	test("toasts when the removal fails, and the room stays", async () => {
		const { handler } = locationApi({
			details: { [unit903.id]: { rooms: [sala, lavanderia] } },
			answer: () => problem(500, "INTERNAL_ERROR"),
		});
		await openUnit(handler);

		await openRoomMenu("Lavanderia", "Remover cômodo");

		expect(
			await screen.findByText(
				"Não foi possível remover o cômodo Lavanderia. Confira sua conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(roomNames()).toContain("LavanderiaSó desta unidade");
	});

	test("reloads the room when it is already gone", async () => {
		const { handler } = locationApi({
			details: { [unit903.id]: { rooms: [sala, lavanderia] } },
			answer: () => problem(404, "ROOM_NOT_FOUND"),
		});
		const { fetchMock } = await openUnit(handler);
		const reads = () =>
			fetchMock.mock.calls.filter(
				([input, init]) =>
					String(input) ===
						`/api/projects/${OBRA.id}/locations/${unit903.id}` &&
					(init?.method ?? "GET") === "GET",
			).length;
		const before = reads();

		await openRoomMenu("Lavanderia", "Remover cômodo");

		await waitFor(() => {
			expect(reads()).toBeGreaterThan(before);
		});
	});
});

describe("giving a room back", () => {
	test("brings back a room the unit took out", async () => {
		const { handler, writes } = locationApi({
			details: {
				[unit903.id]: {
					rooms: [sala, cozinha],
					droppedRooms: [sacadaTaken],
					changes: 1,
				},
			},
			answer: () => json(unitDetail({ rooms: [sala, cozinha, sacada] })),
		});
		await openUnit(handler);

		await userEvent.click(
			screen.getByRole("button", { name: "Devolver o cômodo Sacada" }),
		);

		await waitFor(() => {
			expect(roomNames()).toEqual([
				"Sala",
				"Cozinha",
				"Sacada",
				"Adicionar cômodo",
			]);
		});
		expect(
			screen.queryByRole("list", { name: "Tirados desta unidade" }),
		).not.toBeInTheDocument();
		expect(writes).toEqual([
			{
				method: "DELETE",
				path: `/locations/${unit903.id}/dropped-rooms/${sacadaTaken.unitTypeRoomId}`,
				body: null,
			},
		]);
	});

	test("toasts that the name is taken when the unit made a room of that name since", async () => {
		const { handler } = locationApi({
			details: {
				[unit903.id]: { rooms: [sala], droppedRooms: [sacadaTaken] },
			},
			answer: () => problem(409, ROOM_NAME_TAKEN, { names: ["Sacada"] }),
		});
		await openUnit(handler);

		await userEvent.click(
			screen.getByRole("button", { name: "Devolver o cômodo Sacada" }),
		);

		expect(
			await screen.findByText(
				"Não foi possível devolver o cômodo Sacada: Já existe o cômodo Sacada nesta unidade.",
			),
		).toBeInTheDocument();
	});
});

describe("trocar tipologia (U4)", () => {
	async function openTypeDialog() {
		await userEvent.click(
			screen.getByRole("button", { name: "Trocar tipologia" }),
		);
		return screen.findByRole("dialog", {
			name: "Trocar a tipologia da 903",
		});
	}

	test("lists the unit types with their rooms and Sem tipologia, the current one chosen", async () => {
		const { handler } = locationApi({ unitTypes: UNIT_TYPES });
		await openUnit(handler);

		const dialog = await openTypeDialog();

		expect(dialog).toHaveTextContent(
			"Os cômodos passam a ser os da tipologia escolhida. Cômodo com pins continua na unidade.",
		);
		const options = await within(dialog).findAllByRole("radio");
		expect(options.map((option) => option.textContent)).toEqual([
			"Tipologia A3 cômodos",
			"Tipologia B1 cômodo",
			"Sem tipologiaCômodos só desta unidade",
		]);
		expect(nth(options, 0)).toBeChecked();
		expect(
			within(dialog).getByRole("button", { name: "Trocar" }),
		).toBeDisabled();
	});

	test("starts the unit over on the chosen unit type", async () => {
		const typeB = nth(UNIT_TYPES.unitTypes, 1);
		const suite = room("Suíte", { fromType: true });
		const { handler, writes } = locationApi({
			unitTypes: UNIT_TYPES,
			answer: () =>
				json(
					unitDetail({
						unitType: { id: typeB.id, name: typeB.name },
						rooms: [suite],
						changes: 0,
					}),
				),
		});
		await openUnit(handler);
		const dialog = await openTypeDialog();

		await userEvent.click(
			await within(dialog).findByRole("radio", { name: /Tipologia B/ }),
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Trocar" }),
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(writes).toEqual([
			{
				method: "PUT",
				path: `/locations/${unit903.id}/unit-type`,
				body: { unitTypeId: typeB.id },
			},
		]);
		expect(
			await screen.findByText(
				"A unidade 903 agora segue a tipologia Tipologia B.",
			),
		).toBeInTheDocument();
		expect(roomNames()).toEqual(["Suíte", "Adicionar cômodo"]);
	});

	test("leaves the unit without a unit type, keeping the rooms as its own (G4)", async () => {
		const { handler, writes } = locationApi({
			unitTypes: UNIT_TYPES,
			answer: () =>
				json(
					unitDetail({
						unitType: null,
						rooms: [room("Sala"), room("Cozinha")],
						changes: 0,
					}),
				),
		});
		await openUnit(handler);
		const dialog = await openTypeDialog();

		await userEvent.click(
			await within(dialog).findByRole("radio", { name: /Sem tipologia/ }),
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Trocar" }),
		);

		expect(
			await screen.findByText("Os cômodos desta unidade são só dela."),
		).toBeInTheDocument();
		expect(writes[0]?.body).toEqual({ unitTypeId: null });
		expect(
			screen.getByText("A unidade 903 ficou sem tipologia."),
		).toBeInTheDocument();
	});

	test("says the unit types could not load and offers to try again", async () => {
		let attempts = 0;
		const base = locationApi({ unitTypes: UNIT_TYPES });
		const handler: ApiHandler = (url, init) => {
			if (url.pathname === `/api/projects/${OBRA.id}/unit-types`) {
				attempts += 1;
				return attempts < 5 ? problem(500, "INTERNAL_ERROR") : json(UNIT_TYPES);
			}
			return base.handler(url, init);
		};
		await openUnit(handler);
		const dialog = await openTypeDialog();

		expect(
			await within(dialog).findByText(
				"Não foi possível carregar as tipologias. Confira sua conexão e tente de novo.",
			),
		).toBeInTheDocument();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Tentar de novo" }),
		);
		expect(
			await within(dialog).findByRole("radio", { name: /Tipologia B/ }),
		).toBeInTheDocument();
	});
});

describe("voltar à tipologia", () => {
	test("is offered only when the unit has changes, and drops them", async () => {
		const { handler, writes } = locationApi({
			details: {
				[unit903.id]: {
					rooms: [sala, cozinha, lavanderia],
					droppedRooms: [sacadaTaken],
					changes: 2,
				},
			},
			answer: () => json(unitDetail({ changes: 0 })),
		});
		await openUnit(handler);
		expect(screen.getByText("2 alterações")).toBeInTheDocument();

		await userEvent.click(
			screen.getByRole("button", { name: "Voltar à tipologia" }),
		);

		await waitFor(() => {
			expect(
				screen.queryByRole("button", { name: "Voltar à tipologia" }),
			).not.toBeInTheDocument();
		});
		expect(roomNames()).toEqual([
			"Sala",
			"Cozinha",
			"Sacada",
			"Adicionar cômodo",
		]);
		expect(
			screen.getByText("A unidade 903 voltou à tipologia Tipologia A."),
		).toBeInTheDocument();
		expect(writes).toEqual([
			{
				method: "POST",
				path: `/locations/${unit903.id}/unit-type/reset`,
				body: null,
			},
		]);
	});

	test("is not offered to a unit on its unit type with no changes", async () => {
		const { handler } = locationApi();
		await openUnit(handler);

		expect(
			screen.getByRole("button", { name: "Trocar tipologia" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Voltar à tipologia" }),
		).not.toBeInTheDocument();
	});

	test("is not offered to a unit without a unit type", async () => {
		const { handler } = locationApi();
		stubApi(signedIn, { api: handler });
		renderAt(`/projects/${OBRA.id}/locations/${unit904.id}`);
		await screen.findByRole("heading", { level: 1, name: "904" });

		expect(
			screen.getByRole("button", { name: "Trocar tipologia" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Voltar à tipologia" }),
		).not.toBeInTheDocument();
	});

	test("toasts when it fails", async () => {
		const { handler } = locationApi({
			details: { [unit903.id]: { rooms: [sala, lavanderia], changes: 1 } },
			answer: () => problem(500, "INTERNAL_ERROR"),
		});
		await openUnit(handler);

		await userEvent.click(
			screen.getByRole("button", { name: "Voltar à tipologia" }),
		);

		expect(
			await screen.findByText(
				"Não foi possível voltar a unidade 903 à tipologia. Confira sua conexão e tente de novo.",
			),
		).toBeInTheDocument();
	});
});

describe("a project delivered under an old tab", () => {
	test("turns the page read-only when a write answers PROJECT_DELIVERED", async () => {
		let delivered = false;
		const base = locationApi({
			details: { [unit903.id]: { rooms: [sala, lavanderia], changes: 1 } },
			answer: () => {
				delivered = true;
				return problem(409, PROJECT_DELIVERED);
			},
		});
		const handler: ApiHandler = (url, init) =>
			url.pathname === `/api/projects/${OBRA.id}` && delivered
				? json({ ...OBRA, status: "delivered" })
				: base.handler(url, init);
		await openUnit(handler);

		await openRoomMenu("Lavanderia", "Remover cômodo");

		await waitFor(() => {
			expect(
				screen.queryByRole("button", { name: "Adicionar cômodo" }),
			).not.toBeInTheDocument();
		});
		expect(
			screen.queryByRole("button", { name: "Trocar tipologia" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Ações do cômodo/ }),
		).not.toBeInTheDocument();
	});

	test("reloads the location when it was removed under the page", async () => {
		let removed = false;
		const base = locationApi({
			answer: () => {
				removed = true;
				return problem(404, LOCATION_NOT_FOUND);
			},
		});
		const handler: ApiHandler = (url, init) =>
			removed &&
			url.pathname === `/api/projects/${OBRA.id}/locations/${unit903.id}`
				? problem(404, LOCATION_NOT_FOUND)
				: base.handler(url, init);
		await openUnit(handler);

		await userEvent.click(
			screen.getByRole("button", { name: "Adicionar cômodo" }),
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: "Adicionar cômodo" }),
			"Varanda{Enter}",
		);

		expect(await screen.findByText("Local não encontrado")).toBeInTheDocument();
	});
});
