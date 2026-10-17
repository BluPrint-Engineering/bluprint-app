import {
	NO_UNITS_LEFT,
	type OrganizationUnits,
	PROJECT_DELIVERED,
	type ProjectSummary,
	RESERVATION_BELOW_USED,
} from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import { setViewport } from "@/test/viewport";

const OBRA: ProjectSummary = {
	...project(7),
	name: "Casa Moinhos",
	units: { reserved: 400, used: 250 },
};
const CONFIG_PATH = `/projects/${OBRA.id}/configuration`;
const UNITS: OrganizationUnits = {
	contracted: 700,
	reserved: 550,
	free: 150,
	reclaimable: 150,
};
const SAVE_FAILED =
	"Não foi possível salvar a reserva. Confira sua conexão e tente de novo.";
const UNITS_FAILED =
	"Não foi possível carregar as unidades livres. Confira sua conexão e tente de novo.";

type Patch = (reserved: number) => Promise<Response> | Response;

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Conflict", status, code, ...extra },
		status,
	);
}

function reservationApi(
	initial: ProjectSummary,
	{ patch, units = UNITS }: { patch?: Patch; units?: OrganizationUnits } = {},
) {
	const state = { current: initial, units };
	const handler = (url: URL, init?: RequestInit) => {
		if (url.pathname === "/api/organization/units") return json(state.units);
		if (url.pathname === "/api/projects") {
			return json({
				items: [state.current],
				total: 1,
				counts: { active: 1, delivered: 0 },
			});
		}
		if (url.pathname === `/api/projects/${initial.id}/units`) {
			const { reserved } = JSON.parse(String(init?.body)) as {
				reserved: number;
			};
			if (patch) return patch(reserved);
			state.units = {
				...state.units,
				free: state.units.free + state.current.units.reserved - reserved,
			};
			state.current = {
				...state.current,
				units: { ...state.current.units, reserved },
			};
			return json(state.current);
		}
		if (url.pathname === `/api/projects/${initial.id}`)
			return json(state.current);
		return undefined;
	};
	return { state, handler };
}

function reservationRequests(
	fetchMock: ReturnType<typeof stubApi>["fetchMock"],
) {
	return fetchMock.mock.calls.filter(
		([input]) => String(input) === `/api/projects/${OBRA.id}/units`,
	);
}

async function openDialog() {
	await userEvent.click(
		await screen.findByRole("button", { name: "Alterar reserva" }),
	);
	return screen.findByRole("dialog", { name: "Alterar reserva" });
}

async function typeUnits(dialog: HTMLElement, value: string) {
	const field = within(dialog).getByRole("textbox", {
		name: "Unidades reservadas",
	});
	await userEvent.clear(field);
	if (value) await userEvent.type(field, value);
	return field;
}

function figure(dialog: HTMLElement, label: string) {
	const card = within(dialog).getByText(label).closest("[data-slot=card]");
	if (!card) throw new Error(`No figure named ${label}`);
	return card;
}

describe("the unidades row", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("the admin reads the reservation and gets Alterar reserva, with no lock line (C1)", async () => {
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		const card = await screen.findByRole("region", { name: "Dados da obra" });
		expect(within(card).getByText("Unidades")).toBeInTheDocument();
		expect(
			within(card).getByText("Usa 250 de 400 reservadas"),
		).toBeInTheDocument();
		expect(
			within(card).getByRole("button", { name: "Alterar reserva" }),
		).toBeInTheDocument();
		expect(card).not.toHaveTextContent("foi entregue");
	});

	test("an assistant only reads it, and keeps the rename lock line (C4)", async () => {
		const { handler } = reservationApi({ ...OBRA, role: "assistant" });
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		const card = await screen.findByRole("region", { name: "Dados da obra" });
		expect(
			within(card).getByText("Usa 250 de 400 reservadas"),
		).toBeInTheDocument();
		expect(
			within(card).queryByRole("button", { name: "Alterar reserva" }),
		).not.toBeInTheDocument();
		expect(
			within(card).getByText(
				"Só o gerente de obra ou o admin da construtora renomeia a obra.",
			),
		).toBeInTheDocument();
	});

	test("a manager only reads it, with no lock line (C4b)", async () => {
		const { handler } = reservationApi({ ...OBRA, role: "manager" });
		const { fetchMock } = stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		const card = await screen.findByRole("region", { name: "Dados da obra" });
		expect(
			within(card).getByText("Usa 250 de 400 reservadas"),
		).toBeInTheDocument();
		expect(
			within(card).queryByRole("button", { name: "Alterar reserva" }),
		).not.toBeInTheDocument();
		expect(
			within(card).getByRole("button", { name: "Renomear" }),
		).toBeInTheDocument();
		expect(card).not.toHaveTextContent("Só o gerente");
		expect(
			fetchMock.mock.calls.filter(
				([input]) => String(input) === "/api/organization/units",
			),
		).toEqual([]);
	});

	test.each(["admin", "manager", "assistant"] as const)(
		"a delivered project shows what the %s's obra used, closed (C6)",
		async (role) => {
			const { handler } = reservationApi({
				...OBRA,
				role,
				status: "delivered",
				units: { reserved: 380, used: 380 },
			});
			stubApi(signedIn, { api: handler });

			renderAt(CONFIG_PATH);

			const card = await screen.findByRole("region", {
				name: "Dados da obra",
			});
			expect(within(card).getByText("Usou 380 unidades.")).toBeInTheDocument();
			expect(
				within(card).getByText(
					"A obra foi entregue: o nome e a reserva não podem mais ser alterados.",
				),
			).toBeInTheDocument();
			expect(
				within(card).queryByRole("button", { name: "Alterar reserva" }),
			).not.toBeInTheDocument();
		},
	);

	test("reads a single unit in the singular", async () => {
		const { handler } = reservationApi({
			...OBRA,
			units: { reserved: 1, used: 1 },
		});
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		expect(await screen.findByText("Usa 1 de 1 reservada")).toBeInTheDocument();
	});
});

describe("Alterar reserva", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		toast.dismiss();
	});

	test("opens with the reservation, the context line and the untouched figures (C7a)", async () => {
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const dialog = await openDialog();

		expect(
			within(dialog).getByText(
				"A obra usa 250 unidades. A construtora tem 150 livres.",
			),
		).toBeInTheDocument();
		const field = within(dialog).getByRole("textbox", {
			name: "Unidades reservadas",
		});
		expect(field).toHaveValue("400");
		expect(field).toHaveFocus();
		expect(figure(dialog, "Restam na obra")).toHaveTextContent("150");
		expect(figure(dialog, "Livres na construtora")).toHaveTextContent("150");
		expect(dialog).not.toHaveTextContent("Antes");
		expect(
			within(dialog).getByRole("button", { name: "Salvar" }),
		).toBeEnabled();
	});

	test("moves both figures with every keystroke and shows the Antes line (C7a2)", async () => {
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();

		await typeUnits(dialog, "450");

		expect(figure(dialog, "Restam na obra")).toHaveTextContent("200");
		expect(figure(dialog, "Restam na obra")).toHaveTextContent("Antes: 150");
		expect(figure(dialog, "Livres na construtora")).toHaveTextContent("100");
		expect(figure(dialog, "Livres na construtora")).toHaveTextContent(
			"Antes: 150",
		);
	});

	test("explains a value below the usadas once the field loses focus, and clears it when fixed (C7b)", async () => {
		const { handler } = reservationApi(OBRA);
		const { fetchMock } = stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();

		const field = await typeUnits(dialog, "200");
		expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
		expect(figure(dialog, "Restam na obra")).toHaveTextContent("–");
		expect(
			within(dialog).getByRole("button", { name: "Salvar" }),
		).toBeDisabled();
		await userEvent.tab();

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"A obra já usa 250 unidades. A reserva não pode ficar abaixo disso.",
		);
		expect(field).toHaveAttribute("aria-invalid", "true");
		await userEvent.clear(field);
		await userEvent.type(field, "300");
		expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
		expect(reservationRequests(fetchMock)).toEqual([]);
	});

	test("explains a value above the livres on Enter, with the Livres figure at – (C7c)", async () => {
		const { handler } = reservationApi(OBRA);
		const { fetchMock } = stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();

		await typeUnits(dialog, "551{Enter}");

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Só há 150 unidades livres.",
		);
		expect(figure(dialog, "Livres na construtora")).toHaveTextContent("–");
		expect(figure(dialog, "Restam na obra")).toHaveTextContent("301");
		expect(reservationRequests(fetchMock)).toEqual([]);
	});

	test("accepts exactly the usadas and exactly the reservation plus the livres", async () => {
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();

		await typeUnits(dialog, "250");
		expect(
			within(dialog).getByRole("button", { name: "Salvar" }),
		).toBeEnabled();
		expect(figure(dialog, "Restam na obra")).toHaveTextContent("0");
		await typeUnits(dialog, "550");
		expect(
			within(dialog).getByRole("button", { name: "Salvar" }),
		).toBeEnabled();
		expect(figure(dialog, "Livres na construtora")).toHaveTextContent("0");
	});

	test("an empty field shows no error, both figures at – and Salvar disabled", async () => {
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();

		await typeUnits(dialog, "");

		expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
		expect(figure(dialog, "Restam na obra")).toHaveTextContent("–");
		expect(figure(dialog, "Livres na construtora")).toHaveTextContent("–");
		expect(
			within(dialog).getByRole("button", { name: "Salvar" }),
		).toBeDisabled();
	});

	test("keeps only digits in the field", async () => {
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();

		const field = await typeUnits(dialog, "4a5,0");

		expect(field).toHaveValue("450");
	});

	test("shows Salvando… with the field and Cancelar locked, and Escape does nothing (C7d)", async () => {
		const { handler } = reservationApi(OBRA, {
			patch: () => new Promise(() => {}),
		});
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();
		const field = await typeUnits(dialog, "450");

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Salvar" }),
		);

		const saving = await within(dialog).findByRole("button", {
			name: /Salvando/,
		});
		expect(saving).toBeDisabled();
		expect(saving).toHaveTextContent("Salvando…");
		expect(field).toBeDisabled();
		expect(
			within(dialog).getByRole("button", { name: "Cancelar" }),
		).toBeDisabled();
		await userEvent.keyboard("{Escape}");
		expect(
			screen.getByRole("dialog", { name: "Alterar reserva" }),
		).toBeInTheDocument();
	});

	test("saves, closes, updates the row and toasts (C7e)", async () => {
		const { handler } = reservationApi(OBRA);
		const { fetchMock } = stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();
		await typeUnits(dialog, "450");

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Salvar" }),
		);

		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "Alterar reserva" }),
			).not.toBeInTheDocument();
		});
		const card = screen.getByRole("region", { name: "Dados da obra" });
		expect(
			await within(card).findByText("Usa 250 de 450 reservadas"),
		).toBeInTheDocument();
		expect(
			await screen.findByText("Reserva da Casa Moinhos: 450 unidades."),
		).toBeInTheDocument();
		const [[input, init]] = reservationRequests(fetchMock) as [
			[RequestInfo, RequestInit],
		];
		expect(init.method).toBe("PATCH");
		expect(String(input)).toBe(`/api/projects/${OBRA.id}/units`);
		expect(JSON.parse(String(init.body))).toEqual({ reserved: 450 });
		expect(
			screen.getByRole("button", { name: "Alterar reserva" }),
		).toHaveFocus();
	});

	test("refetches the livres and the project list after saving", async () => {
		const { handler } = reservationApi(OBRA);
		const { fetchMock } = stubApi(signedIn, { api: handler });
		const { router } = renderAt(CONFIG_PATH);
		const dialog = await openDialog();
		await typeUnits(dialog, "450");
		const unitsReads = () =>
			fetchMock.mock.calls.filter(
				([input]) => String(input) === "/api/organization/units",
			).length;
		const before = unitsReads();

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Salvar" }),
		);
		await screen.findByText("Reserva da Casa Moinhos: 450 unidades.");
		await userEvent.click(
			screen.getByRole("button", { name: "Alterar reserva" }),
		);

		const reopened = await screen.findByRole("dialog", {
			name: "Alterar reserva",
		});
		await waitFor(() => {
			expect(unitsReads()).toBeGreaterThan(before);
		});
		expect(
			await within(reopened).findByText(
				"A obra usa 250 unidades. A construtora tem 100 livres.",
			),
		).toBeInTheDocument();
		expect(router.state.location.pathname).toBe(CONFIG_PATH);
	});

	test("Cancelar closes without sending anything and the next opening starts from the reservation", async () => {
		const { handler } = reservationApi(OBRA);
		const { fetchMock } = stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();
		await typeUnits(dialog, "451");

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancelar" }),
		);
		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "Alterar reserva" }),
			).not.toBeInTheDocument();
		});
		const reopened = await openDialog();

		expect(
			within(reopened).getByRole("textbox", { name: "Unidades reservadas" }),
		).toHaveValue("400");
		expect(reservationRequests(fetchMock)).toEqual([]);
	});

	test("Escape closes it", async () => {
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		await openDialog();

		await userEvent.keyboard("{Escape}");

		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "Alterar reserva" }),
			).not.toBeInTheDocument();
		});
	});

	test("shows the server's usadas under the field when the project grew meanwhile, keeping the number (C7b)", async () => {
		const { handler } = reservationApi(OBRA, {
			patch: () => problem(409, RESERVATION_BELOW_USED, { used: 320 }),
		});
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();
		const field = await typeUnits(dialog, "300");

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Salvar" }),
		);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"A obra já usa 320 unidades. A reserva não pode ficar abaixo disso.",
		);
		expect(field).toHaveValue("300");
		expect(field).toBeEnabled();
	});

	test("shows the server's livres under the field when someone reserved first, keeping the number (C7c)", async () => {
		const { handler } = reservationApi(OBRA, {
			patch: () =>
				problem(409, NO_UNITS_LEFT, { requested: 150, available: 40 }),
		});
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();
		const field = await typeUnits(dialog, "550");

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Salvar" }),
		);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Só há 40 unidades livres.",
		);
		expect(field).toHaveValue("550");
	});

	test("closes and shows the obra closed when it was delivered meanwhile (C6)", async () => {
		const { handler, state } = reservationApi(OBRA, {
			patch: () => {
				state.current = {
					...state.current,
					status: "delivered",
					units: { reserved: 250, used: 250 },
				};
				return problem(409, PROJECT_DELIVERED);
			},
		});
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();
		await typeUnits(dialog, "450");

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Salvar" }),
		);

		expect(await screen.findByText("Usou 250 unidades.")).toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Alterar reserva" }),
		).not.toBeInTheDocument();
	});

	test("keeps the dialog and the number on a network failure, then saves on the next try", async () => {
		let failing = true;
		const { handler, state } = reservationApi(OBRA, {
			patch: (reserved) => {
				if (failing) return json({}, 500);
				state.current = {
					...state.current,
					units: { ...state.current.units, reserved },
				};
				return json(state.current);
			},
		});
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();
		const field = await typeUnits(dialog, "450");

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Salvar" }),
		);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			SAVE_FAILED,
		);
		expect(field).toHaveValue("450");
		expect(
			within(dialog).getByRole("button", { name: "Salvar" }),
		).toBeEnabled();
		failing = false;
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Salvar" }),
		);
		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "Alterar reserva" }),
			).not.toBeInTheDocument();
		});
	});

	test("while the livres load it shows a skeleton and Salvar stays disabled", async () => {
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, {
			api: (url, init) =>
				url.pathname === "/api/organization/units"
					? new Promise(() => {})
					: handler(url, init),
		});
		renderAt(CONFIG_PATH);

		const dialog = await openDialog();

		expect(dialog).not.toHaveTextContent("livres.");
		expect(
			within(dialog).getByRole("button", { name: "Salvar" }),
		).toBeDisabled();
	});

	test("explains when the livres fail to load, keeps Salvar disabled and loads them on Tentar de novo", async () => {
		let failing = true;
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, {
			api: (url, init) =>
				failing && url.pathname === "/api/organization/units"
					? json({}, 500)
					: handler(url, init),
		});
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			UNITS_FAILED,
		);
		expect(
			within(dialog).getByRole("button", { name: "Salvar" }),
		).toBeDisabled();
		failing = false;
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Tentar de novo" }),
		);

		expect(
			await within(dialog).findByText(
				"A obra usa 250 unidades. A construtora tem 150 livres.",
			),
		).toBeInTheDocument();
		expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Salvar" }),
		).toBeEnabled();
	});
});

describe("Alterar reserva on a phone", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		toast.dismiss();
	});

	test("opens as a sheet with the same field and saves", async () => {
		setViewport("phone");
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();
		await typeUnits(dialog, "450");

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Salvar" }),
		);

		expect(
			await screen.findByText("Reserva da Casa Moinhos: 450 unidades."),
		).toBeInTheDocument();
	});
});

describe("the link to Alterar reserva", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("opens the dialog on arrival and closing it clears the address", async () => {
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, { api: handler });

		const { router } = renderAt(`${CONFIG_PATH}?reserva=alterar`);
		const dialog = await screen.findByRole("dialog", {
			name: "Alterar reserva",
		});
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancelar" }),
		);

		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "Alterar reserva" }),
			).not.toBeInTheDocument();
		});
		expect(router.state.location.search).toEqual({});
	});

	test("opening it from the button puts it in the address", async () => {
		const { handler } = reservationApi(OBRA);
		stubApi(signedIn, { api: handler });
		const { router } = renderAt(CONFIG_PATH);

		await openDialog();

		expect(router.state.location.search).toEqual({ reserva: "alterar" });
	});

	test("does nothing for a manager who follows it", async () => {
		const { handler } = reservationApi({ ...OBRA, role: "manager" });
		stubApi(signedIn, { api: handler });

		renderAt(`${CONFIG_PATH}?reserva=alterar`);

		await screen.findByRole("region", { name: "Dados da obra" });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});
