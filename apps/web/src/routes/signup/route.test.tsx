import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderAt, signedIn, stubApi } from "@/test/renderApp";

describe("/signup route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	test("redirects to the login when self-signup is off", async () => {
		vi.stubEnv("VITE_ALLOW_SELF_SIGNUP", undefined);
		stubApi(null);

		const { router } = renderAt("/signup");

		await waitFor(() => {
			expect(
				screen.getByText(
					"Não tem conta? O acesso é por convite da sua construtora.",
				),
			).toBeInTheDocument();
		});
		expect(router.state.location.pathname).toBe("/login");
	});

	test("renders the signup form when self-signup is on and there is no session", async () => {
		vi.stubEnv("VITE_ALLOW_SELF_SIGNUP", "true");
		stubApi(null);

		renderAt("/signup");

		await waitFor(() => {
			expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
		});
	});

	test("renders the signup form when the session check fails", async () => {
		vi.stubEnv("VITE_ALLOW_SELF_SIGNUP", "true");
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.reject(new Error("offline"))),
		);

		renderAt("/signup");

		await waitFor(() => {
			expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
		});
	});

	test("redirects to the project list when a session already exists", async () => {
		vi.stubEnv("VITE_ALLOW_SELF_SIGNUP", "true");
		stubApi(signedIn);

		const { router } = renderAt("/signup");

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
		expect(router.state.location.pathname).toBe("/projects");
	});

	test("lands on the project list after signing up, not back on the signup", async () => {
		vi.stubEnv("VITE_ALLOW_SELF_SIGNUP", "true");
		stubApi(null);

		const { router } = renderAt("/signup");
		await userEvent.type(
			await screen.findByLabelText("Nome completo"),
			"Ana Horizonte",
		);
		await userEvent.type(screen.getByLabelText("E-mail"), "ana@horizonte.test");
		await userEvent.type(
			screen.getByLabelText("Senha"),
			"correct horse battery",
		);
		await userEvent.click(screen.getByLabelText(/Aceito os termos/));
		await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
		expect(router.state.location.pathname).toBe("/projects");
	});
});
