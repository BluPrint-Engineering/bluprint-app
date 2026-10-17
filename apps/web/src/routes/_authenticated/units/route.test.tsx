import {
	NO_UNITS_LEFT,
	type OrganizationReservations,
	type OrganizationUnits,
	PROJECT_DELIVERED,
	RESERVATION_BELOW_USED,
} from "@bluprint/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { nth } from "@/test/nth";
import {
	type ApiHandler,
	json,
	organization,
	renderAt,
	signedIn,
	stubApi,
} from "@/test/renderApp";
import { setViewport } from "@/test/viewport";

const UNITS: OrganizationUnits = {
	contracted: 2000,
	reserved: 1700,
	free: 300,
	reclaimable: 288,
};

const AURORA = "0190a000-0000-7000-8000-00000000000a";
const JARDINS = "0190a000-0000-7000-8000-00000000000b";
const PRIMAVERA = "0190a000-0000-7000-8000-00000000000c";
const ATLANTICA = "0190a000-0000-7000-8000-00000000000d";

const RESERVATIONS: OrganizationReservations = {
	items: [
		{ projectId: AURORA, name: "Edifício Aurora", reserved: 300, used: 180 },
		{
			projectId: JARDINS,
			name: "Residencial Jardins",
			reserved: 400,
			used: 250,
		},
		{
			projectId: PRIMAVERA,
			name: "Residencial Primavera",
			reserved: 50,
			used: 0,
		},
		{ projectId: ATLANTICA, name: "Torre Atlântica", reserved: 500, used: 482 },
	],
	delivered: { projects: 2, used: 450 },
};

const SAVE_FAILED =
	"Não foi possível salvar as reservas. Confira sua conexão e tente de novo.";

interface Sent {
	items: { projectId: string; reserved: number }[];
}

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Conflict", status, code, ...extra },
		status,
	);
}

function unitsApi(
	options: {
		reservations?: () => Promise<Response> | Response;
		units?: () => Promise<Response> | Response;
		save?: (sent: Sent) => Promise<Response> | Response;
	} = {},
) {
	const sent: Sent[] = [];
	const handler: ApiHandler = (url, init) => {
		if (url.pathname === "/api/organization/units/reservations") {
			if (init?.method === "PATCH") {
				const body = JSON.parse(String(init.body)) as Sent;
				sent.push(body);
				return options.save?.(body) ?? json(savedFrom(RESERVATIONS, body));
			}
			return options.reservations ? options.reservations() : json(RESERVATIONS);
		}
		if (url.pathname === "/api/organization/units") {
			return options.units ? options.units() : json(UNITS);
		}
		return undefined;
	};
	return { sent, handler };
}

function savedFrom(
	base: OrganizationReservations,
	{ items }: Sent,
): OrganizationReservations {
	return {
		...base,
		items: base.items.map((row) => ({
			...row,
			reserved:
				items.find(({ projectId }) => projectId === row.projectId)?.reserved ??
				row.reserved,
		})),
	};
}

function openAs(role: "admin" | "manager", api: ApiHandler) {
	const stub = stubApi(signedIn, {
		organization: { ...organization, role },
		api,
	});
	return { ...renderAt("/units"), ...stub };
}

function openUnits(options: Parameters<typeof unitsApi>[0] = {}) {
	const api = unitsApi(options);
	return { ...openAs("admin", api.handler), ...api };
}

const field = (name: string) =>
	screen.getByRole("textbox", { name: `Reserva de ${name}` });

async function ready() {
	await screen.findByRole("textbox", { name: "Reserva de Edifício Aurora" });
}

async function type(name: string, value: string) {
	const input = field(name);
	await userEvent.clear(input);
	if (value) await userEvent.type(input, value);
}

function figure(label: string) {
	const group = screen.getByRole("region", { name: "Unidades da construtora" });
	return within(group)
		.getByText(label)
		.closest("[data-slot=card]") as HTMLElement;
}

async function editBoth() {
	await ready();
	await type("Residencial Jardins", "300");
	await type("Torre Atlântica", "650");
}

describe("units screen", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		toast.dismiss();
	});

	describe("who may open it", () => {
		test.each([["a manager", "manager" as const]])(
			"sends %s back to the project list without a screen",
			async (_who, role) => {
				const api = unitsApi();
				const { router } = openAs(role, api.handler);

				await waitFor(() => {
					expect(router.state.location.pathname).toBe("/projects");
				});
				expect(
					screen.queryByRole("heading", { name: "Unidades" }),
				).not.toBeInTheDocument();
			},
		);

		test("sends a caller with no organization back to the project list", async () => {
			const api = unitsApi();
			vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(String(input), "http://localhost");
				if (url.pathname === "/api/organization") {
					return json({ code: "ORGANIZATION_NOT_FOUND" }, 404);
				}
				if (url.pathname.endsWith("/get-session")) return json(signedIn);
				return Promise.resolve(api.handler(url, init) ?? json({}));
			});
			const { router } = renderAt("/units");

			await waitFor(() => {
				expect(router.state.location.pathname).toBe("/projects");
			});
		});
	});

	describe("on the desktop", () => {
		test("shows the figures, one row per project in progress and what the delivered ones used (RS1)", async () => {
			openUnits();
			await ready();

			expect(
				screen.getByRole("heading", { level: 1, name: "Unidades" }),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"A reserva de cada obra sai das unidades contratadas. O que sobra fica livre.",
				),
			).toBeInTheDocument();
			expect(within(figure("Contratadas")).getByText("2.000")).toBeVisible();
			expect(within(figure("Reservadas")).getByText("1.700")).toBeVisible();
			expect(within(figure("Livres")).getByText("300")).toBeVisible();
			const rows = within(
				screen.getByRole("table", { name: "Reservas das obras" }),
			).getAllByRole("row");
			expect(rows).toHaveLength(5);
			const aurora = within(nth(rows, 1));
			expect(
				aurora.getByRole("rowheader", { name: "Edifício Aurora" }),
			).toBeInTheDocument();
			expect(nth(aurora.getAllByRole("cell"), 0)).toHaveTextContent("180");
			expect(field("Edifício Aurora")).toHaveValue("300");
			expect(nth(aurora.getAllByRole("cell"), 2)).toHaveTextContent("120");
			expect(
				screen.getByText("2 obras entregues usaram 450 unidades."),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Salvar" }),
			).not.toBeInTheDocument();
		});

		test("links back to the project list", async () => {
			openUnits();
			await ready();

			expect(screen.getByRole("link", { name: "Obras" })).toHaveAttribute(
				"href",
				"/projects",
			);
		});

		test("says 1 obra entregue usou in the singular", async () => {
			openUnits({
				reservations: () =>
					json({ ...RESERVATIONS, delivered: { projects: 1, used: 1 } }),
			});
			await ready();

			expect(
				screen.getByText("1 obra entregue usou 1 unidade."),
			).toBeInTheDocument();
		});

		test("hides the delivered line when no project was delivered", async () => {
			openUnits({
				reservations: () =>
					json({ ...RESERVATIONS, delivered: { projects: 0, used: 0 } }),
			});
			await ready();

			expect(screen.queryByText(/entregue/)).not.toBeInTheDocument();
		});

		test("moves units from one project to another and shows the free ones change at once (RS2)", async () => {
			openUnits();
			await editBoth();

			expect(within(figure("Reservadas")).getByText("1.750")).toBeVisible();
			expect(
				within(figure("Reservadas")).getByText("Antes: 1.700"),
			).toBeVisible();
			expect(within(figure("Livres")).getByText("250")).toBeVisible();
			expect(within(figure("Livres")).getByText("Antes: 300")).toBeVisible();
			expect(screen.getByText("2 reservas alteradas")).toBeInTheDocument();
			expect(screen.getByText("Antes: 400")).toBeInTheDocument();
			expect(screen.getByText("Antes: 500")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
		});

		test("says 1 reserva alterada in the singular", async () => {
			openUnits();
			await ready();
			await type("Residencial Jardins", "399");

			expect(screen.getByText("1 reserva alterada")).toBeInTheDocument();
		});

		test("takes digits only", async () => {
			openUnits();
			await ready();
			await type("Residencial Jardins", "3a0.0");

			expect(field("Residencial Jardins")).toHaveValue("300");
		});

		test("drops back to saved when the typed value matches it", async () => {
			openUnits();
			await ready();
			await type("Residencial Jardins", "300");
			await type("Residencial Jardins", "400");

			expect(screen.queryByText(/reserva alterada/)).not.toBeInTheDocument();
			expect(screen.queryByText("Antes: 400")).not.toBeInTheDocument();
		});

		test("refuses a reservation below the units used once the field loses focus, and keeps the free units honest (RS3)", async () => {
			openUnits();
			await ready();
			await type("Edifício Aurora", "150");

			expect(
				screen.queryByText(/A obra já usa 180 unidades/),
			).not.toBeInTheDocument();

			await userEvent.tab();

			expect(
				await screen.findByText(
					"A obra já usa 180 unidades. A reserva não pode ficar abaixo disso.",
				),
			).toBeInTheDocument();
			expect(field("Edifício Aurora")).toBeInvalid();
			expect(screen.getByText("−30")).toHaveClass("text-destructive");
			expect(within(figure("Livres")).getByText("450")).toBeVisible();
			expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
		});

		test("says 1 unidade when a project uses one", async () => {
			openUnits({
				reservations: () =>
					json({
						...RESERVATIONS,
						items: [
							{
								projectId: AURORA,
								name: "Edifício Aurora",
								reserved: 5,
								used: 1,
							},
						],
					}),
			});
			await ready();
			await type("Edifício Aurora", "0");
			await userEvent.tab();

			expect(
				await screen.findByText(
					"A obra já usa 1 unidade. A reserva não pode ficar abaixo disso.",
				),
			).toBeInTheDocument();
		});

		test("asks for a number when the field is emptied, and shows a dash in Restam", async () => {
			openUnits();
			await ready();
			await type("Edifício Aurora", "");
			await userEvent.tab();

			expect(
				await screen.findByText("Informe quantas unidades reservar."),
			).toBeInTheDocument();
			expect(screen.getByText("–")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
		});

		test("accepts 0 for a project that uses none", async () => {
			openUnits();
			await ready();
			await type("Residencial Primavera", "0");
			await userEvent.tab();

			expect(screen.queryByText(/A obra já usa/)).not.toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
		});

		test("warns at the top when the reservations pass the contracted units and blocks saving (RS4)", async () => {
			openUnits();
			await ready();
			await type("Residencial Primavera", "390");

			expect(
				screen.getByText(
					"As reservas passam das unidades contratadas em 40. Baixe alguma reserva ou fale com a BluPrint.",
				),
			).toBeInTheDocument();
			expect(within(figure("Livres")).getByText("−40")).toHaveClass(
				"text-destructive",
			);
			expect(within(figure("Reservadas")).getByText("2.040")).toBeVisible();
			expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
		});

		test("discards every draft and error at once", async () => {
			openUnits();
			await editBoth();
			await type("Edifício Aurora", "150");
			await userEvent.tab();

			await userEvent.click(screen.getByRole("button", { name: "Descartar" }));

			expect(field("Residencial Jardins")).toHaveValue("400");
			expect(field("Edifício Aurora")).toHaveValue("300");
			expect(screen.queryByText(/reserva.? alterada/)).not.toBeInTheDocument();
			expect(screen.queryByText(/A obra já usa/)).not.toBeInTheDocument();
		});

		test("does not save on Enter", async () => {
			const { sent } = openUnits();
			await editBoth();

			await userEvent.type(field("Torre Atlântica"), "{Enter}");

			expect(sent).toHaveLength(0);
		});

		test("blocks the inputs and Descartar while it saves (RS5)", async () => {
			openUnits({ save: () => new Promise(() => {}) });
			await editBoth();

			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

			expect(
				await screen.findByRole("button", { name: /Salvando…/ }),
			).toBeDisabled();
			expect(screen.getByRole("button", { name: "Descartar" })).toBeDisabled();
			expect(field("Residencial Jardins")).toBeDisabled();
		});

		test("saves only the changed rows in one request and settles on the saved values (RS6)", async () => {
			const { sent } = openUnits();
			await editBoth();

			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

			await waitFor(() => {
				expect(
					screen.queryByText(/reservas alteradas/),
				).not.toBeInTheDocument();
			});
			expect(sent).toEqual([
				{
					items: [
						{ projectId: JARDINS, reserved: 300 },
						{ projectId: ATLANTICA, reserved: 650 },
					],
				},
			]);
			expect(await screen.findByText("Reservas salvas.")).toBeInTheDocument();
			expect(field("Residencial Jardins")).toHaveValue("300");
			expect(screen.queryByText(/Antes:/)).not.toBeInTheDocument();
			expect(within(figure("Reservadas")).getByText("1.750")).toBeVisible();
			expect(within(figure("Livres")).getByText("250")).toBeVisible();
		});

		test("refreshes the project list and the free units after saving", async () => {
			const { fetchMock } = openUnits();
			await editBoth();
			const before = fetchMock.mock.calls.length;

			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
			await screen.findByText("Reservas salvas.");

			await waitFor(() => {
				const paths = fetchMock.mock.calls
					.slice(before)
					.map(
						([input]) => new URL(String(input), "http://localhost").pathname,
					);
				expect(paths).toContain("/api/organization/units");
			});
		});

		test("keeps the values and offers Salvar again when saving fails (RS7)", async () => {
			openUnits({ save: () => json({ status: 500, code: "INTERNAL" }, 500) });
			await editBoth();

			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

			expect(await screen.findByText(SAVE_FAILED)).toBeInTheDocument();
			expect(field("Residencial Jardins")).toHaveValue("300");
			expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
			expect(screen.getByText("2 reservas alteradas")).toBeInTheDocument();
		});

		test("clears the failure once a value changes", async () => {
			openUnits({ save: () => json({ status: 500, code: "INTERNAL" }, 500) });
			await editBoth();
			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
			await screen.findByText(SAVE_FAILED);

			await type("Torre Atlântica", "640");

			expect(screen.queryByText(SAVE_FAILED)).not.toBeInTheDocument();
		});

		test("shows the server's used units on a row it refuses, and keeps the draft", async () => {
			let atlanticaUsed = 482;
			openUnits({
				reservations: () =>
					json({
						...RESERVATIONS,
						items: RESERVATIONS.items.map((row) =>
							row.projectId === ATLANTICA
								? { ...row, used: atlanticaUsed }
								: row,
						),
					}),
				save: () => {
					atlanticaUsed = 700;
					return problem(409, RESERVATION_BELOW_USED, {
						items: [{ projectId: ATLANTICA, used: 700 }],
					});
				},
			});
			await editBoth();

			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

			expect(
				await screen.findByText(
					"A obra já usa 700 unidades. A reserva não pode ficar abaixo disso.",
				),
			).toBeInTheDocument();
			expect(field("Torre Atlântica")).toHaveValue("650");
			expect(field("Residencial Jardins")).toHaveValue("300");
			expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
		});

		test("tells how far over the free units the server found the request, and keeps the draft", async () => {
			openUnits({
				save: () =>
					problem(409, NO_UNITS_LEFT, { requested: 150, available: 110 }),
			});
			await editBoth();

			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

			expect(
				await screen.findByText(
					"As reservas passam das unidades contratadas em 40. Baixe alguma reserva ou fale com a BluPrint.",
				),
			).toBeInTheDocument();
			expect(field("Torre Atlântica")).toHaveValue("650");
		});

		test("reloads the rows when the free units ran out meanwhile, showing what took them and blocking saving", async () => {
			let createdMeanwhile = false;
			openUnits({
				reservations: () =>
					json(
						createdMeanwhile
							? {
									...RESERVATIONS,
									items: [
										...RESERVATIONS.items,
										{
											projectId: "0190a000-0000-7000-8000-00000000000e",
											name: "Vila Nova",
											reserved: 290,
											used: 0,
										},
									],
								}
							: RESERVATIONS,
					),
				save: () => {
					createdMeanwhile = true;
					return problem(409, NO_UNITS_LEFT, { requested: 50, available: 10 });
				},
			});
			await editBoth();

			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

			expect(
				await screen.findByRole("textbox", { name: "Reserva de Vila Nova" }),
			).toBeInTheDocument();
			expect(within(figure("Livres")).getByText("−40")).toHaveClass(
				"text-destructive",
			);
			expect(field("Torre Atlântica")).toHaveValue("650");

			await type("Residencial Primavera", "40");

			expect(within(figure("Livres")).getByText("−30")).toBeVisible();
			expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
		});

		test("reloads the rows when a project was delivered meanwhile, naming it and keeping the other drafts", async () => {
			let delivered = false;
			openUnits({
				reservations: () =>
					json(
						delivered
							? {
									items: RESERVATIONS.items.filter(
										({ projectId }) => projectId !== ATLANTICA,
									),
									delivered: { projects: 3, used: 950 },
								}
							: RESERVATIONS,
					),
				save: () => {
					delivered = true;
					return problem(409, PROJECT_DELIVERED, { projectId: ATLANTICA });
				},
			});
			await editBoth();

			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

			expect(
				await screen.findByText(/A obra “Torre Atlântica” foi entregue/),
			).toBeInTheDocument();
			await waitFor(() => {
				expect(
					screen.queryByRole("textbox", { name: "Reserva de Torre Atlântica" }),
				).not.toBeInTheDocument();
			});
			expect(field("Residencial Jardins")).toHaveValue("300");
			expect(
				screen.getByText("3 obras entregues usaram 950 unidades."),
			).toBeInTheDocument();
			expect(screen.getByText("1 reserva alterada")).toBeInTheDocument();
		});

		test("holds the figures and rows as placeholders while it loads (RS8)", async () => {
			openUnits({ reservations: () => new Promise(() => {}) });

			expect(
				await screen.findByRole("heading", { level: 1, name: "Unidades" }),
			).toBeInTheDocument();
			expect(screen.getByRole("link", { name: "Obras" })).toBeInTheDocument();
			for (const label of ["Contratadas", "Reservadas", "Livres"]) {
				expect(screen.getByText(label)).toBeInTheDocument();
			}
			expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
			expect(
				document.querySelectorAll("[data-slot=skeleton]").length,
			).toBeGreaterThan(3);
		});

		test("explains a failed load and retries on demand (RS9)", async () => {
			let attempts = 0;
			openUnits({
				reservations: () =>
					++attempts <= 4
						? json({ status: 500, code: "INTERNAL" }, 500)
						: json(RESERVATIONS),
			});

			expect(
				await screen.findByText(
					"Não foi possível carregar as unidades",
					{},
					{ timeout: 5000 },
				),
			).toBeInTheDocument();
			expect(screen.getByRole("link", { name: "Obras" })).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 1, name: "Unidades" }),
			).toBeInTheDocument();

			await userEvent.click(
				screen.getByRole("button", { name: "Tentar de novo" }),
			);

			await ready();
		});

		test("explains a failed free units load the same way", async () => {
			openUnits({ units: () => json({ status: 500, code: "INTERNAL" }, 500) });

			expect(
				await screen.findByText(
					"Não foi possível carregar as unidades",
					{},
					{ timeout: 5000 },
				),
			).toBeInTheDocument();
		});

		test("says no project is in progress, with what the delivered ones used (RS10)", async () => {
			openUnits({
				reservations: () =>
					json({ items: [], delivered: { projects: 6, used: 1700 } }),
				units: () => json({ ...UNITS, reserved: 1700, free: 300 }),
			});

			expect(
				await screen.findByText("Nenhuma obra em andamento"),
			).toBeInTheDocument();
			expect(
				screen.getByText("6 obras entregues usaram 1.700 unidades."),
			).toBeInTheDocument();
			expect(within(figure("Contratadas")).getByText("2.000")).toBeVisible();
			expect(within(figure("Reservadas")).getByText("1.700")).toBeVisible();
			expect(within(figure("Livres")).getByText("300")).toBeVisible();
			expect(
				screen.queryByRole("button", { name: /Salvar|Descartar|Tentar/ }),
			).not.toBeInTheDocument();
		});

		test("leaves the text line out when no project exists at all", async () => {
			openUnits({
				reservations: () =>
					json({ items: [], delivered: { projects: 0, used: 0 } }),
			});

			expect(
				await screen.findByText("Nenhuma obra em andamento"),
			).toBeInTheDocument();
			expect(screen.queryByText(/entregue/)).not.toBeInTheDocument();
		});
	});

	describe("on the phone", () => {
		test("lists a card per project with the usadas and what is left (RS1)", async () => {
			setViewport("phone");
			openUnits();

			const input = await screen.findByRole("textbox", {
				name: "Reserva de Edifício Aurora",
			});

			expect(screen.queryByRole("table")).not.toBeInTheDocument();
			const cards = within(
				screen.getByRole("list", { name: "Reservas das obras" }),
			).getAllByRole("listitem");
			expect(cards).toHaveLength(4);
			expect(cards[0]).toHaveTextContent("Edifício Aurora");
			expect(cards[0]).toHaveTextContent("Usadas180");
			expect(cards[0]).toHaveTextContent("Restam120");
			expect(input).toHaveValue("300");
			expect(
				screen.queryByRole("button", { name: "Salvar" }),
			).not.toBeInTheDocument();
		});

		test("pins a bar with the changed count, the free units and the actions once something changes (RS2)", async () => {
			setViewport("phone");
			openUnits();
			await editBoth();

			const bar = screen
				.getByRole("button", { name: "Salvar" })
				.closest(".fixed");
			if (!(bar instanceof HTMLElement)) throw new Error("No pinned bar");
			expect(bar).toHaveClass("fixed", "bottom-0");
			expect(within(bar).getByText("2 reservas alteradas")).toBeInTheDocument();
			expect(within(bar).getByText("250")).toBeInTheDocument();
			expect(screen.getAllByText("Antes: 400")).toHaveLength(1);
			expect(
				document.documentElement.style.getPropertyValue("--bottom-bar-height"),
			).toMatch(/^\d+(\.\d+)?px$/);
		});

		test("puts the row error in place of the hint, under the input (RS3)", async () => {
			setViewport("phone");
			openUnits();
			await ready();
			await type("Edifício Aurora", "150");
			await userEvent.tab();

			expect(
				await screen.findByText(
					"A obra já usa 180 unidades. A reserva não pode ficar abaixo disso.",
				),
			).toBeInTheDocument();
			expect(
				within(
					screen.getByRole("list", { name: "Reservas das obras" }),
				).queryByText("Antes: 300"),
			).not.toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
		});

		test("shows the failure in the bar, above the buttons (RS7)", async () => {
			setViewport("phone");
			openUnits({ save: () => json({ status: 500, code: "INTERNAL" }, 500) });
			await editBoth();

			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

			const alert = await screen.findByText(SAVE_FAILED);
			expect(alert.closest(".fixed")).not.toBeNull();
		});

		test("saves and drops the bar (RS6)", async () => {
			setViewport("phone");
			const { sent } = openUnits();
			await editBoth();

			await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

			await waitFor(() => {
				expect(
					screen.queryByRole("button", { name: "Salvar" }),
				).not.toBeInTheDocument();
			});
			expect(sent).toHaveLength(1);
			expect(await screen.findByText("Reservas salvas.")).toBeInTheDocument();
		});

		test("holds card placeholders while it loads (RS8)", async () => {
			setViewport("phone");
			openUnits({ reservations: () => new Promise(() => {}) });

			await screen.findByRole("heading", { level: 1, name: "Unidades" });

			expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
			expect(
				document.querySelectorAll("[data-slot=skeleton]").length,
			).toBeGreaterThan(3);
		});
	});
});
