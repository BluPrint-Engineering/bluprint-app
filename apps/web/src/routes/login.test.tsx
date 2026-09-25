import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderAt, signedIn, stubAuthApi } from "@/test/renderApp";

describe("/login route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		onlineManager.setOnline(true);
	});

	async function signIn() {
		await userEvent.type(
			await screen.findByLabelText("E-mail"),
			"ana@horizonte.test",
		);
		await userEvent.type(
			screen.getByLabelText("Senha"),
			"correct horse battery",
		);
		await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
	}

	test("redirects to / when a session already exists", async () => {
		stubAuthApi(signedIn);

		renderAt("/login");

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
	});

	test("renders the login form when there is no session", async () => {
		stubAuthApi(null);

		renderAt("/login");

		await waitFor(() => {
			expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
		});
	});

	test("renders the login form when the session check fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.reject(new Error("offline"))),
		);

		renderAt("/login");

		await waitFor(() => {
			expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
		});
	});

	test("goes back to the screen the visitor was heading to after signing in", async () => {
		stubAuthApi(null);

		const { router } = renderAt("/login?redirect=%2F%3Ffrom%3Demail");
		await signIn();

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
		expect(router.state.location.pathname).toBe("/");
		expect(router.state.location.search).toEqual({ from: "email" });
	});

	test.each([
		"//evil.test",
		"https://evil.test/phish",
		"/\\evil.test",
		"evil.test",
	])(
		"ignores the external destination %s and lands on /",
		async (destination) => {
			stubAuthApi(null);

			const { router } = renderAt(
				`/login?redirect=${encodeURIComponent(destination)}`,
			);
			await signIn();

			await waitFor(() => {
				expect(screen.getByText("Obras")).toBeInTheDocument();
			});
			expect(router.state.location.pathname).toBe("/");
			expect(router.state.location.search).toEqual({});
		},
	);

	test("skips the form for a visitor who already has a session, to the requested screen", async () => {
		stubAuthApi(signedIn);

		const { router } = renderAt("/login?redirect=%2F%3Ffrom%3Demail");

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
		expect(router.state.location.search).toEqual({ from: "email" });
	});

	test("lands on the protected screen after signing in from a redirect, not back on the login", async () => {
		stubAuthApi(null);

		const { router } = renderAt("/");
		await signIn();

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
		expect(router.state.location.pathname).toBe("/");
	});

	test("shows the form at once when the API is down instead of retrying", async () => {
		const failing = vi.fn(() => Promise.reject(new Error("down")));
		vi.stubGlobal("fetch", failing);

		renderAt("/login");

		expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
		expect(failing).toHaveBeenCalledTimes(1);
	});

	test("says the device is offline instead of showing a form that cannot work", async () => {
		onlineManager.setOnline(false);
		stubAuthApi(null);

		renderAt("/login");

		expect(
			await screen.findByText(
				"Sem conexão. Continuamos assim que a internet voltar.",
			),
		).toBeInTheDocument();

		act(() => onlineManager.setOnline(true));

		expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
	});
});
