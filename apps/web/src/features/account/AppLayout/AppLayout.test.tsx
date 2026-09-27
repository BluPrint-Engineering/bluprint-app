import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
	organization,
	renderAt,
	signedIn,
	stubAuthApi,
} from "@/test/renderApp";

async function openMenu() {
	await userEvent.click(
		await screen.findByRole("button", { name: "Conta de Ana Ribeiro" }),
	);
	return screen.findByRole("menu");
}

describe("app layout", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		document.documentElement.classList.remove("dark");
		localStorage.clear();
		// sonner keeps active toasts module-wide and replays them to the next test's Toaster
		toast.dismiss();
	});

	test("links the logo to the projects list", async () => {
		stubAuthApi(signedIn);

		renderAt("/projects");

		expect(
			await screen.findByRole("link", { name: "BluPrint, obras" }),
		).toHaveAttribute("href", "/projects");
	});

	test("shows the person's initials when they have no photo", async () => {
		stubAuthApi(signedIn);

		renderAt("/projects");

		const trigger = await screen.findByRole("button", {
			name: "Conta de Ana Ribeiro",
		});
		expect(within(trigger).getByText("AR")).toBeInTheDocument();
	});

	test("opens the account menu with the person's name and e-mail", async () => {
		stubAuthApi(signedIn);
		renderAt("/projects");

		const menu = await openMenu();

		expect(within(menu).getByText("Ana Ribeiro")).toBeInTheDocument();
		expect(within(menu).getByText("ana@horizonte.test")).toBeInTheDocument();
		expect(
			within(menu).getByRole("menuitem", { name: "Sair" }),
		).toBeInTheDocument();
	});

	test("tells an admin their role in the account menu", async () => {
		stubAuthApi(signedIn, { organization: { ...organization, role: "admin" } });
		renderAt("/projects");

		const menu = await openMenu();

		expect(
			await within(menu).findByText("Admin da construtora"),
		).toBeInTheDocument();
	});

	test("shows no organization role to a manager or an assistant", async () => {
		const { fetchMock } = stubAuthApi(signedIn);
		renderAt("/projects");

		const menu = await openMenu();
		await waitFor(() => {
			expect(
				fetchMock.mock.calls.some(([url]) =>
					String(url).endsWith("/api/organization"),
				),
			).toBe(true);
		});

		expect(
			within(menu).queryByText("Admin da construtora"),
		).not.toBeInTheDocument();
	});

	test("switches to the dark theme and remembers it on the device", async () => {
		stubAuthApi(signedIn);
		renderAt("/projects");

		const menu = await openMenu();
		await userEvent.click(
			within(menu).getByRole("radio", { name: "Tema escuro" }),
		);

		expect(document.documentElement).toHaveClass("dark");
		expect(localStorage.getItem("bp-theme")).toBe("dark");
		expect(
			within(menu).getByRole("radio", { name: "Tema escuro" }),
		).toBeChecked();
	});

	test("signs out without confirmation, back to the login with nothing of the account left", async () => {
		stubAuthApi(signedIn, { organization: { ...organization, role: "admin" } });
		const { router, queryClient } = renderAt("/projects");

		const menu = await openMenu();
		await within(menu).findByText("Admin da construtora");
		await userEvent.click(within(menu).getByRole("menuitem", { name: "Sair" }));

		expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/login");
		expect(router.state.location.search).toEqual({});
		expect(queryClient.getQueryCache().getAll()).toEqual([]);
	});

	test("keeps the menu open and locked while signing out", async () => {
		stubAuthApi(signedIn, { signOut: () => new Promise(() => {}) });
		renderAt("/projects");

		const menu = await openMenu();
		const signOut = within(menu).getByRole("menuitem", { name: "Sair" });
		await userEvent.click(signOut);

		expect(signOut).toHaveAttribute("aria-busy", "true");
		expect(
			within(menu).getByRole("radio", { name: "Tema escuro" }),
		).toBeDisabled();
		await userEvent.keyboard("{Escape}");
		expect(screen.getByRole("menu")).toBeInTheDocument();
	});

	test("keeps the person signed in and says so when signing out fails", async () => {
		stubAuthApi(signedIn, {
			signOut: () => Promise.reject(new TypeError("Failed to fetch")),
		});
		const { router } = renderAt("/projects");

		const menu = await openMenu();
		await userEvent.click(within(menu).getByRole("menuitem", { name: "Sair" }));

		expect(
			await screen.findByText(
				"Não foi possível sair. Confira sua conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/projects");
		expect(
			screen.getByRole("button", { name: "Conta de Ana Ribeiro" }),
		).toBeInTheDocument();
	});

	test("takes a server error on sign-out for a failure too", async () => {
		stubAuthApi(signedIn, {
			signOut: () => Promise.resolve(new Response("{}", { status: 500 })),
		});
		const { router } = renderAt("/projects");

		const menu = await openMenu();
		await userEvent.click(within(menu).getByRole("menuitem", { name: "Sair" }));

		expect(
			await screen.findByText(
				"Não foi possível sair. Confira sua conexão e tente de novo.",
			),
		).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/projects");
	});
});
