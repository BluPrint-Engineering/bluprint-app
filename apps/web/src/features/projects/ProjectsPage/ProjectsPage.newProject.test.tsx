import type { OrganizationUnits, ProjectSummary } from "@bluprint/shared";
import { onlineManager } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { project, projectsApi } from "@/test/projectsApi";
import {
	type ApiHandler,
	json,
	organization,
	renderAt,
	signedIn,
	stubApi,
} from "@/test/renderApp";
import { setViewport } from "@/test/viewport";

const FREE: OrganizationUnits = {
	contracted: 400,
	reserved: 100,
	free: 300,
	reclaimable: 100,
};
const NO_FREE_RECLAIMABLE: OrganizationUnits = {
	contracted: 400,
	reserved: 400,
	free: 0,
	reclaimable: 250,
};
const NO_FREE_ALL_USED: OrganizationUnits = {
	contracted: 400,
	reserved: 400,
	free: 0,
	reclaimable: 0,
};

const NO_FREE_RECLAIMABLE_TEXT =
	"Nenhuma unidade livre. Baixe a reserva de uma obra ou fale com a BluPrint.";
const NO_FREE_TEXT = "Nenhuma unidade livre. Fale com a BluPrint.";

const reclaimableLine = (_: string, element: Element | null) =>
	element?.tagName === "SPAN" &&
	element.textContent === NO_FREE_RECLAIMABLE_TEXT;

function open(
	path: string,
	options: {
		role?: "admin" | "manager";
		units?: () => Promise<Response> | Response;
		projects?: number;
		api?: ApiHandler;
	} = {},
) {
	const list = projectsApi(options.projects ?? 3);
	const stub = stubApi(signedIn, {
		organization: { ...organization, role: options.role ?? "admin" },
		api: (url, init) => {
			if (url.pathname === "/api/organization/units") {
				return options.units ? options.units() : json(FREE);
			}
			return options.api?.(url, init) ?? list(url);
		},
	});
	return { ...renderAt(path), ...stub };
}

const bottomBarHeight = () =>
	document.documentElement.style.getPropertyValue("--bottom-bar-height");

describe("new project entry on the project list", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		onlineManager.setOnline(true);
		toast.dismiss();
	});

	describe("on the desktop", () => {
		test("holds the free units line while they load and keeps the button (O1)", async () => {
			open("/projects", { units: () => new Promise(() => {}) });

			expect(
				await screen.findByRole("link", { name: "Nova obra" }),
			).toHaveAttribute("href", "/projects/new");
			await screen.findByRole("list", { name: "Obras" });
			expect(screen.queryByText(/unidades? livres?/)).not.toBeInTheDocument();
		});

		test("links the free units to the Unidades screen beside the button (O2)", async () => {
			open("/projects");

			expect(
				await screen.findByRole("link", { name: "300 unidades livres" }),
			).toHaveAttribute("href", "/units");
			expect(screen.getByRole("link", { name: "Nova obra" })).toHaveAttribute(
				"href",
				"/projects/new",
			);
			expect(
				screen.getByRole("heading", { name: "Obras" }).parentElement,
			).toContainElement(screen.getByRole("link", { name: "Nova obra" }));
		});

		test("says 1 unidade livre in the singular", async () => {
			open("/projects", { units: () => json({ ...FREE, free: 1 }) });

			expect(await screen.findByText("1 unidade livre")).toBeInTheDocument();
		});

		test("disables the button and offers lowering a reservation when some is unused (O4)", async () => {
			open("/projects", { units: () => json(NO_FREE_RECLAIMABLE) });

			expect(await screen.findByText(reclaimableLine)).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Baixe a reserva de uma obra" }),
			).toHaveAttribute("href", "/units");
			expect(screen.getByRole("button", { name: "Nova obra" })).toBeDisabled();
			expect(
				screen.queryByRole("link", { name: "Nova obra" }),
			).not.toBeInTheDocument();
		});

		test("only says to talk to BluPrint when every reservation is in use (O4b)", async () => {
			open("/projects", { units: () => json(NO_FREE_ALL_USED) });

			expect(await screen.findByText(NO_FREE_TEXT)).toBeInTheDocument();
			expect(screen.queryByText(/Baixe a reserva/)).not.toBeInTheDocument();
			expect(screen.queryByRole("link", { name: /unidade/ })).toBeNull();
			expect(screen.getByRole("button", { name: "Nova obra" })).toBeDisabled();
		});

		test("hides the line and keeps the button when the count fails", async () => {
			open("/projects", {
				units: () => json({ status: 500, code: "INTERNAL" }, 500),
			});

			await screen.findByRole("list", { name: "Obras" });
			await waitFor(() => {
				expect(
					screen.getByRole("link", { name: "Nova obra" }),
				).toBeInTheDocument();
			});
			expect(screen.queryByText(/unidades? livres?/)).not.toBeInTheDocument();
			expect(screen.queryByText(/Nenhuma unidade/)).not.toBeInTheDocument();
		});

		test("moves into the empty block with the free units under the button (O5)", async () => {
			open("/projects", { projects: 0 });

			const block = (await screen.findByText("Nenhuma obra ainda")).closest(
				"[role=status]",
			) as HTMLElement;
			expect(
				within(block).getByRole("link", { name: "Nova obra" }),
			).toHaveAttribute("href", "/projects/new");
			expect(
				await within(block).findByRole("link", { name: "300 unidades livres" }),
			).toHaveAttribute("href", "/units");
			expect(screen.getAllByRole("link", { name: "Nova obra" })).toHaveLength(
				1,
			);
		});

		test("disables the empty block's button without free units (O6)", async () => {
			open("/projects", { projects: 0, units: () => json(NO_FREE_ALL_USED) });

			const block = (await screen.findByText("Nenhuma obra ainda")).closest(
				"[role=status]",
			) as HTMLElement;
			expect(await within(block).findByText(NO_FREE_TEXT)).toBeInTheDocument();
			expect(
				within(block).getByRole("button", { name: "Nova obra" }),
			).toBeDisabled();
		});

		test("keeps the entry in the title when a search finds nothing", async () => {
			open("/projects?q=zzz", { projects: 0 });

			await screen.findByText("Nenhuma obra encontrada");
			expect(
				await screen.findByRole("link", { name: "Nova obra" }),
			).toBeInTheDocument();
		});

		test("shows nothing to a manager", async () => {
			const { fetchMock } = open("/projects", { role: "manager" });

			await screen.findByRole("list", { name: "Obras" });
			expect(
				screen.queryByRole("link", { name: "Nova obra" }),
			).not.toBeInTheDocument();
			expect(screen.queryByText(/unidades? livres?/)).not.toBeInTheDocument();
			expect(
				fetchMock.mock.calls.some(([input]) =>
					String(input).includes("/organization/units"),
				),
			).toBe(false);
		});

		test("shows no entry when the list fails to load", async () => {
			open("/projects", {
				api: (url) =>
					url.pathname === "/api/projects"
						? json({ status: 500, code: "INTERNAL" }, 500)
						: undefined,
			});

			await screen.findByText("Não foi possível carregar suas obras");
			expect(
				screen.queryByRole("link", { name: "Nova obra" }),
			).not.toBeInTheDocument();
		});
	});

	describe("on the phone", () => {
		beforeEach(() => {
			setViewport("phone");
		});

		test("pins the entry in a bar and lifts the toasts above it (O2)", async () => {
			open("/projects");

			expect(
				await screen.findByText("300 unidades livres"),
			).toBeInTheDocument();
			const link = screen.getByRole("link", { name: "Nova obra" });
			expect(link).toHaveAttribute("href", "/projects/new");
			expect(link.parentElement).toHaveClass("fixed", "bottom-0");
			expect(bottomBarHeight()).toMatch(/^\d+(\.\d+)?px$/);
		});

		test("raises the toasts by the bar's height instead of a fixed offset", async () => {
			open("/projects");
			await screen.findByRole("link", { name: "Nova obra" });

			toast("Aviso");

			const toaster = await waitFor(() => {
				const element = document.querySelector("[data-sonner-toaster]");
				expect(element).not.toBeNull();
				return element as HTMLElement;
			});
			expect(toaster.style.getPropertyValue("--mobile-offset-bottom")).toBe(
				"calc(var(--bottom-bar-height) + 16px)",
			);
		});

		test("holds the line while the units load (O1)", async () => {
			open("/projects", { units: () => new Promise(() => {}) });

			expect(
				await screen.findByRole("link", { name: "Nova obra" }),
			).toBeInTheDocument();
			expect(screen.queryByText(/unidades? livres?/)).not.toBeInTheDocument();
		});

		test("disables the button and offers lowering a reservation (O4)", async () => {
			open("/projects", { units: () => json(NO_FREE_RECLAIMABLE) });

			expect(await screen.findByText(reclaimableLine)).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Baixe a reserva de uma obra" }),
			).toHaveAttribute("href", "/units");
			expect(screen.getByRole("button", { name: "Nova obra" })).toBeDisabled();
		});

		test("only says to talk to BluPrint when every reservation is in use (O4b)", async () => {
			open("/projects", { units: () => json(NO_FREE_ALL_USED) });

			expect(await screen.findByText(NO_FREE_TEXT)).toBeInTheDocument();
			expect(screen.queryByText(/Baixe a reserva/)).not.toBeInTheDocument();
			expect(screen.queryByRole("link", { name: /unidade/ })).toBeNull();
		});

		test("puts the action in the empty block, not in a bar (O5)", async () => {
			open("/projects", { projects: 0 });

			const block = (await screen.findByText("Nenhuma obra ainda")).closest(
				"[role=status]",
			) as HTMLElement;
			expect(
				within(block).getByRole("link", { name: "Nova obra" }),
			).toBeInTheDocument();
			expect(screen.getAllByRole("link", { name: "Nova obra" })).toHaveLength(
				1,
			);
			expect(bottomBarHeight()).toBe("");
		});

		test("disables the empty block's button without free units (O6)", async () => {
			open("/projects", { projects: 0, units: () => json(NO_FREE_ALL_USED) });

			const block = (await screen.findByText("Nenhuma obra ainda")).closest(
				"[role=status]",
			) as HTMLElement;
			expect(await within(block).findByText(NO_FREE_TEXT)).toBeInTheDocument();
			expect(
				within(block).getByRole("button", { name: "Nova obra" }),
			).toBeDisabled();
		});

		test("hides the bar when the list fails to load", async () => {
			open("/projects", {
				api: (url) =>
					url.pathname === "/api/projects"
						? json({ status: 500, code: "INTERNAL" }, 500)
						: undefined,
			});

			await screen.findByText("Não foi possível carregar suas obras");
			expect(
				screen.queryByRole("link", { name: "Nova obra" }),
			).not.toBeInTheDocument();
			expect(bottomBarHeight()).toBe("");
		});

		test("hides the bar while offline", async () => {
			onlineManager.setOnline(false);
			open("/projects");

			await screen.findByText("Sem conexão.");
			expect(
				screen.queryByRole("link", { name: "Nova obra" }),
			).not.toBeInTheDocument();
			expect(bottomBarHeight()).toBe("");
		});

		test("shows nothing to a manager", async () => {
			open("/projects", { role: "manager" });

			await screen.findByRole("list", { name: "Obras" });
			expect(
				screen.queryByRole("link", { name: "Nova obra" }),
			).not.toBeInTheDocument();
			expect(bottomBarHeight()).toBe("");
		});
	});

	test("lists the new project and discounts its reservation when coming back from creating it", async () => {
		let units = FREE;
		const projects: ProjectSummary[] = [project(1), project(2)];
		const { router } = open("/projects", {
			units: () => json(units),
			api: (url, init) => {
				if (url.pathname === "/api/projects" && init?.method === "POST") {
					const sent = JSON.parse(String(init.body)) as {
						id: string;
						name: string;
						units: number;
					};
					const created = {
						...project(3),
						id: sent.id,
						name: sent.name,
						units: { reserved: sent.units, used: 0 },
					};
					projects.push(created);
					units = {
						...units,
						reserved: units.reserved + sent.units,
						free: units.free - sent.units,
						reclaimable: units.reclaimable + sent.units,
					};
					return json(created, 201);
				}
				if (url.pathname === "/api/projects") {
					return json({
						items: projects,
						total: projects.length,
						counts: { active: projects.length, delivered: 0 },
					});
				}
				return undefined;
			},
		});

		await userEvent.click(
			await screen.findByRole("link", { name: "Nova obra" }),
		);
		await userEvent.type(
			await screen.findByRole("textbox", { name: "Nome da obra" }),
			"Casa Moinhos",
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: "Unidades reservadas" }),
			"75",
		);
		await userEvent.click(screen.getByRole("button", { name: "Criar obra" }));
		await waitFor(() => {
			expect(router.state.location.pathname).toMatch(/\/configuration$/);
		});
		await userEvent.click(
			await screen.findByRole("link", { name: "Início da obra" }),
		);
		await userEvent.click(await screen.findByRole("link", { name: "Obras" }));

		expect(await screen.findByText("225 unidades livres")).toBeInTheDocument();
		expect(await screen.findByText("Casa Moinhos")).toBeInTheDocument();
		expect(screen.getByText("3 obras")).toBeInTheDocument();
	});
});
