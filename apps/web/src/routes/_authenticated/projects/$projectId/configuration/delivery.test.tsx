import { PROJECT_DELIVERED, type ProjectSummary } from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { organizationUnitsQueryOptions } from "@/features/account/api";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import { setViewport } from "@/test/viewport";

const OBRA: ProjectSummary = {
	...project(7),
	name: "Casa Moinhos",
	units: { reserved: 400, used: 250 },
};
const CONFIG_PATH = `/projects/${OBRA.id}/configuration`;
const DELIVERED_AT = "2026-10-14T15:00:00.000Z";
const DELIVER_FAILED =
	"Não foi possível entregar a obra. Confira sua conexão e tente de novo.";
const ACTIVE_TEXT =
	"A equipe registra e resolve pendências. Entregue a obra quando ela for passada ao cliente: depois disso ela fica fechada e não pode ser reaberta.";
const CLOSED_TEXT =
	"A obra está fechada: nada mais pode ser alterado. Os relatórios continuam disponíveis.";

type Deliver = () => Promise<Response> | Response;

function deliveredBy(current: ProjectSummary, by = "Rafael Souza") {
	return {
		...current,
		status: "delivered" as const,
		units: { ...current.units, reserved: current.units.used },
		delivery: { at: DELIVERED_AT, by },
	};
}

function deliveryApi(initial: ProjectSummary, deliver?: Deliver) {
	const state = { current: initial };
	const handler = (url: URL, init?: RequestInit) => {
		if (url.pathname === "/api/projects") {
			return json({
				items: [state.current],
				total: 1,
				counts: { active: 1, delivered: 0 },
			});
		}
		if (url.pathname === `/api/projects/${initial.id}/delivery`) {
			if (init?.method !== "POST") return undefined;
			if (deliver) return deliver();
			state.current = deliveredBy(state.current);
			return json(state.current);
		}
		if (url.pathname === `/api/projects/${initial.id}`)
			return json(state.current);
		return undefined;
	};
	return { state, handler };
}

function problem(status: number, code: string) {
	return json({ type: "about:blank", title: "Conflict", status, code }, status);
}

function deliveryRequests(fetchMock: ReturnType<typeof stubApi>["fetchMock"]) {
	return fetchMock.mock.calls.filter(
		([input]) => String(input) === `/api/projects/${OBRA.id}/delivery`,
	);
}

function scrim() {
	const overlay = document.querySelector("[data-slot=alert-dialog-overlay]");
	if (!overlay) throw new Error("The dialog has no scrim.");
	return overlay;
}

async function statusCard() {
	return screen.findByRole("region", { name: "Status da obra" });
}

async function openDialog() {
	const card = await statusCard();
	await userEvent.click(
		within(card).getByRole("button", { name: "Entregar obra" }),
	);
	return screen.findByRole("alertdialog", { name: "Entregar “Casa Moinhos”?" });
}

async function confirmIn(dialog: HTMLElement) {
	await userEvent.click(
		within(dialog).getByRole("checkbox", {
			name: "Entendi que a obra não poderá ser reaberta.",
		}),
	);
	await userEvent.click(
		within(dialog).getByRole("button", { name: "Entregar obra" }),
	);
}

describe("the Status da obra card", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test.each(["admin", "manager"] as const)(
		"a project in progress shows the badge, the text and Entregar obra to the %s",
		async (role) => {
			const { handler } = deliveryApi({ ...OBRA, role });
			stubApi(signedIn, { api: handler });

			renderAt(CONFIG_PATH);

			const card = await statusCard();
			expect(
				within(card).getByRole("heading", { level: 3, name: "Status da obra" }),
			).toBeInTheDocument();
			expect(within(card).getByText("Em andamento")).toBeInTheDocument();
			expect(within(card).getByText(ACTIVE_TEXT)).toBeInTheDocument();
			expect(
				within(card).getByRole("button", { name: "Entregar obra" }),
			).toBeInTheDocument();
			expect(card).not.toHaveTextContent("Só o gerente de obra");
		},
	);

	test("an assistant reads the status and why they cannot deliver, with no action", async () => {
		const { handler } = deliveryApi({ ...OBRA, role: "assistant" });
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		const card = await statusCard();
		expect(within(card).getByText(ACTIVE_TEXT)).toBeInTheDocument();
		expect(
			within(card).getByText(
				"Só o gerente de obra ou o admin da construtora entrega a obra.",
			),
		).toBeInTheDocument();
		expect(
			within(card).queryByRole("button", { name: "Entregar obra" }),
		).not.toBeInTheDocument();
	});

	test("comes right after Dados da obra", async () => {
		const { handler } = deliveryApi(OBRA);
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		const status = await statusCard();
		const details = screen.getByRole("region", { name: "Dados da obra" });
		expect(
			details.compareDocumentPosition(status) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	test.each(["admin", "manager", "assistant"] as const)(
		"a delivered project tells the %s who delivered and when, with no action (C6)",
		async (role) => {
			const { handler } = deliveryApi(
				deliveredBy({ ...OBRA, role }) as ProjectSummary,
			);
			stubApi(signedIn, { api: handler });

			renderAt(CONFIG_PATH);

			const card = await statusCard();
			expect(within(card).getByText("Entregue")).toBeInTheDocument();
			expect(
				within(card).getByText(
					`Entregue em 14/10/2026 por Rafael Souza. ${CLOSED_TEXT}`,
				),
			).toBeInTheDocument();
			expect(
				within(card).queryByRole("button", { name: "Entregar obra" }),
			).not.toBeInTheDocument();
			expect(card).not.toHaveTextContent("Só o gerente de obra");
			const details = screen.getByRole("region", { name: "Dados da obra" });
			expect(
				within(details).getByText("Usou 250 unidades."),
			).toBeInTheDocument();
		},
	);

	test("leaves out who delivered when that person no longer exists", async () => {
		const gone = {
			...deliveredBy(OBRA),
			delivery: { at: DELIVERED_AT, by: null },
		};
		const { handler } = deliveryApi(gone);
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		expect(
			within(await statusCard()).getByText(
				`Entregue em 14/10/2026. ${CLOSED_TEXT}`,
			),
		).toBeInTheDocument();
	});

	test("reads a delivered project with no recorded delivery without inventing one", async () => {
		const legacy = { ...deliveredBy(OBRA), delivery: null };
		const { handler } = deliveryApi(legacy);
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		expect(
			within(await statusCard()).getByText(CLOSED_TEXT),
		).toBeInTheDocument();
	});

	test("the side navigation lists Status da obra after Dados da obra and marks the section opened", async () => {
		const { handler } = deliveryApi(OBRA);
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		await statusCard();
		const nav = screen.getByRole("navigation", {
			name: "Seções da configuração",
		});

		const links = within(nav).getAllByRole("link");
		expect(links.map((link) => link.textContent)).toEqual([
			"Dados da obra",
			"Status da obra",
		]);
		expect(links[0]).toHaveAttribute("aria-current", "true");
		await userEvent.click(nth(links, 1));

		expect(links[1]).toHaveAttribute("aria-current", "true");
		expect(links[0]).not.toHaveAttribute("aria-current");
	});

	test("the phone has no side navigation", async () => {
		setViewport("phone");
		const { handler } = deliveryApi(OBRA);
		stubApi(signedIn, { api: handler });

		renderAt(CONFIG_PATH);

		await statusCard();
		expect(
			screen.queryByRole("navigation", { name: "Seções da configuração" }),
		).not.toBeInTheDocument();
	});
});

describe("the delivery dialog", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		toast.dismiss();
	});

	test("states what happens, starts on the checkbox and keeps Entregar obra locked until it is ticked (C5a)", async () => {
		const { handler } = deliveryApi(OBRA);
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const dialog = await openDialog();

		expect(
			within(dialog).getByText(
				"A entrega fecha a obra de vez. Depois de confirmar:",
			),
		).toBeInTheDocument();
		expect(
			within(dialog)
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual([
			"Ninguém mais cria, altera ou exclui pins, fotos, plantas, estrutura, equipe, disciplinas, empresas executoras ou o nome da obra: nada mais na obra muda.",
			"A obra não pode ser reaberta.",
			"Os relatórios continuam disponíveis para exportar.",
		]);
		expect(dialog).not.toHaveTextContent(/reserva|livres/i);
		const checkbox = within(dialog).getByRole("checkbox", {
			name: "Entendi que a obra não poderá ser reaberta.",
		});
		expect(checkbox).not.toBeChecked();
		expect(checkbox).toHaveFocus();
		const action = within(dialog).getByRole("button", {
			name: "Entregar obra",
		});
		expect(action).toBeDisabled();
		await userEvent.click(checkbox);
		expect(action).toBeEnabled();
		await userEvent.click(checkbox);
		expect(action).toBeDisabled();
	});

	test("Cancelar, Escape and the scrim close it without sending anything, and it reopens unticked", async () => {
		const { handler } = deliveryApi(OBRA);
		const { fetchMock } = stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const closed = () =>
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

		let dialog = await openDialog();
		await userEvent.click(within(dialog).getByRole("checkbox"));
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancelar" }),
		);
		await waitFor(closed);

		dialog = await openDialog();
		expect(within(dialog).getByRole("checkbox")).not.toBeChecked();
		await userEvent.keyboard("{Escape}");
		await waitFor(closed);

		await openDialog();
		await userEvent.click(scrim());
		await waitFor(closed);

		expect(deliveryRequests(fetchMock)).toEqual([]);
	});

	test("shows Entregando obra… with everything locked, and Escape and the scrim do nothing (C5b)", async () => {
		const { handler } = deliveryApi(OBRA, () => new Promise(() => {}));
		const { fetchMock } = stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();

		await confirmIn(dialog);

		const sending = await within(dialog).findByRole("button", {
			name: /Entregando obra/,
		});
		expect(sending).toBeDisabled();
		expect(sending).toHaveTextContent("Entregando obra…");
		expect(within(dialog).getByRole("checkbox")).toBeDisabled();
		expect(
			within(dialog).getByRole("button", { name: "Cancelar" }),
		).toBeDisabled();
		await userEvent.keyboard("{Escape}");
		await userEvent.click(scrim());
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
		expect(deliveryRequests(fetchMock)).toHaveLength(1);
	});

	test("a failure shows the alert above the buttons, keeps the checkbox ticked and allows another try (C5c)", async () => {
		let attempts = 0;
		const { handler, state } = deliveryApi(OBRA, () => {
			attempts += 1;
			if (attempts === 1) return json({}, 500);
			state.current = deliveredBy(state.current);
			return json(state.current);
		});
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();

		await confirmIn(dialog);

		const alert = await within(dialog).findByRole("alert");
		expect(alert).toHaveTextContent(DELIVER_FAILED);
		expect(within(dialog).getByRole("checkbox")).toBeChecked();
		const action = within(dialog).getByRole("button", {
			name: "Entregar obra",
		});
		expect(action).toBeEnabled();
		expect(
			alert.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			screen.getByRole("region", { name: "Status da obra", hidden: true }),
		).toHaveTextContent("Em andamento");
		await userEvent.click(action);
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
		expect(attempts).toBe(2);
	});

	test("delivering closes the dialog, toasts, and turns the project delivered everywhere without a reload", async () => {
		const { handler } = deliveryApi(OBRA);
		const { fetchMock } = stubApi(signedIn, { api: handler });
		const { queryClient } = renderAt(CONFIG_PATH);
		queryClient.setQueryData(["projects", "probe"], {});
		queryClient.setQueryData(organizationUnitsQueryOptions.queryKey, {
			contracted: 700,
			reserved: 550,
			free: 150,
			reclaimable: 150,
		});
		const dialog = await openDialog();

		await confirmIn(dialog);

		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
		expect(
			await screen.findByText("Obra “Casa Moinhos” entregue."),
		).toBeInTheDocument();
		const [[input, init]] = deliveryRequests(fetchMock) as [
			[RequestInfo, RequestInit],
		];
		expect(init.method).toBe("POST");
		expect(String(input)).toBe(`/api/projects/${OBRA.id}/delivery`);
		const header = screen.getByRole("heading", { level: 1 }).closest("div");
		expect(
			within(header as HTMLElement).getByText("Entregue"),
		).toBeInTheDocument();
		const status = screen.getByRole("region", { name: "Status da obra" });
		expect(
			within(status).getByText(
				`Entregue em 14/10/2026 por Rafael Souza. ${CLOSED_TEXT}`,
			),
		).toBeInTheDocument();
		expect(
			within(status).queryByRole("button", { name: "Entregar obra" }),
		).not.toBeInTheDocument();
		const details = screen.getByRole("region", { name: "Dados da obra" });
		expect(within(details).getByText("Usou 250 unidades.")).toBeInTheDocument();
		expect(
			within(details).getByText(
				"A obra foi entregue: o nome e a reserva não podem mais ser alterados.",
			),
		).toBeInTheDocument();
		expect(
			within(details).queryByRole("button", { name: "Renomear" }),
		).not.toBeInTheDocument();
		expect(
			within(details).queryByRole("button", { name: "Alterar reserva" }),
		).not.toBeInTheDocument();
		expect(
			queryClient.getQueryState(["projects", "probe"])?.isInvalidated,
		).toBe(true);
		expect(
			queryClient.getQueryState(organizationUnitsQueryOptions.queryKey)
				?.isInvalidated,
		).toBe(true);
	});

	test("a project delivered meanwhile in another tab closes the dialog and shows it closed (C6)", async () => {
		const { handler, state } = deliveryApi(OBRA, () => {
			state.current = deliveredBy(state.current, "Carla Mendes");
			return problem(409, PROJECT_DELIVERED);
		});
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);
		const dialog = await openDialog();

		await confirmIn(dialog);

		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
		expect(
			await screen.findByText(
				`Entregue em 14/10/2026 por Carla Mendes. ${CLOSED_TEXT}`,
			),
		).toBeInTheDocument();
		expect(screen.queryByText(DELIVER_FAILED)).not.toBeInTheDocument();
		expect(screen.queryByText(/entregue\.$/)).not.toBeInTheDocument();
	});

	test("on the phone it is a sheet with Entregar obra above Cancelar", async () => {
		setViewport("phone");
		const { handler } = deliveryApi(OBRA);
		stubApi(signedIn, { api: handler });
		renderAt(CONFIG_PATH);

		const dialog = await openDialog();

		const buttons = within(dialog)
			.getAllByRole("button")
			.map((button) => button.textContent);
		expect(buttons.slice(-2)).toEqual(["Entregar obra", "Cancelar"]);
		expect(within(dialog).getByRole("checkbox")).toHaveFocus();
		await confirmIn(dialog);
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
		expect(
			await screen.findByText("Obra “Casa Moinhos” entregue."),
		).toBeInTheDocument();
	});
});
