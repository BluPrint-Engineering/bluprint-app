import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { renderAt, signedIn, stubApi } from "@/test/renderApp";

describe("protected layout", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		onlineManager.setOnline(true);
	});

	test("sends a signed-out visitor to the login, remembering where they were going", async () => {
		stubApi(null);

		const { router } = renderAt("/projects");

		await waitFor(() => {
			expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
		});
		expect(router.state.location.pathname).toBe("/login");
		expect(router.state.location.search).toEqual({ redirect: "/projects" });
	});

	test("sends the root to the projects list", async () => {
		stubApi(signedIn);

		const { router } = renderAt("/");

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/projects");
		});
		expect(await screen.findByText("Obras")).toBeInTheDocument();
	});

	test("renders the requested screen when there is a session", async () => {
		stubApi(signedIn);

		const { router } = renderAt("/projects");

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
		expect(router.state.location.pathname).toBe("/projects");
	});

	test("shows the splash, not the login or the screen, while the session is checked", async () => {
		vi.stubGlobal("fetch", () => new Promise(() => {}));

		renderAt("/projects");

		expect(await screen.findByText("Verificando sua sessão…")).toBeVisible();
		expect(screen.queryByText("Obras")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
	});

	test("explains a failed check instead of sending the visitor to the login, and retries on demand", async () => {
		const failing = vi.fn(() => Promise.reject(new Error("network down")));
		vi.stubGlobal("fetch", failing);

		const { router } = renderAt("/projects");

		expect(
			await screen.findByText("Não foi possível verificar sua sessão"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Confira sua conexão e tente de novo."),
		).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/projects");
		// the first try plus three automatic retries
		expect(failing).toHaveBeenCalledTimes(4);

		stubApi(signedIn);
		await userEvent.click(
			screen.getByRole("button", { name: "Tentar de novo" }),
		);

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
	});

	test("does not take a server error for a missing session", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.resolve(new Response("{}", { status: 500 }))),
		);

		const { router } = renderAt("/projects");

		expect(
			await screen.findByText("Não foi possível verificar sua sessão"),
		).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/projects");
	});

	test("lets the visitor retry as many times as they need", async () => {
		vi.stubGlobal("fetch", () => Promise.reject(new Error("network down")));

		renderAt("/projects");

		for (let attempt = 0; attempt < 3; attempt++) {
			await userEvent.click(
				await screen.findByRole("button", { name: "Tentar de novo" }),
			);
		}

		expect(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		).toBeInTheDocument();
	});

	test("waits for the connection when the device is offline, then continues on its own", async () => {
		onlineManager.setOnline(false);
		stubApi(signedIn);

		renderAt("/projects");

		expect(await screen.findByText("Sem conexão.")).toBeInTheDocument();
		expect(
			screen.getByText("Continuamos assim que a internet voltar."),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Tentar de novo" }),
		).not.toBeInTheDocument();

		act(() => onlineManager.setOnline(true));

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
	});

	test("does not ask the server again when navigating with a fresh session", async () => {
		const { fetchMock } = stubApi(signedIn);

		const { router } = renderAt("/projects");
		await screen.findByText("Obras");
		const checks = () =>
			fetchMock.mock.calls.filter(([url]) =>
				String(url).includes("/get-session"),
			).length;
		expect(checks()).toBe(1);

		await router.navigate({ to: "/projects" });
		await router.invalidate();

		expect(checks()).toBe(1);
	});

	test("sends the visitor to the login, back to the current screen, when a request answers 401", async () => {
		const api = stubApi(signedIn);

		const { router, queryClient } = renderAt("/projects");
		await screen.findByText("Obras");

		api.setSession(null);
		vi.stubGlobal(
			"fetch",
			vi.fn((input: RequestInfo | URL) =>
				String(input).includes("/get-session")
					? Promise.resolve(new Response("null", { status: 200 }))
					: Promise.resolve(new Response("{}", { status: 401 })),
			),
		);
		await queryClient
			.query({
				queryKey: ["anything"],
				queryFn: () => apiFetch("/anything", z.object({})),
			})
			.catch(() => {});

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/login");
		});
		expect(router.state.location.search).toEqual({ redirect: "/projects" });
		expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
	});

	test("does not loop when a 401 arrives on a public screen", async () => {
		stubApi(null);
		const { router, queryClient } = renderAt("/login");
		await screen.findByLabelText("E-mail");
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.resolve(new Response("{}", { status: 401 }))),
		);

		await queryClient
			.query({
				queryKey: ["anything"],
				queryFn: () => apiFetch("/anything", z.object({})),
			})
			.catch(() => {});

		expect(router.state.location.pathname).toBe("/login");
		expect(router.state.location.search).toEqual({});
	});
});
