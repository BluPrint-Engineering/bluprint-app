import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";

function stubGetSession(session: unknown) {
	const fetchMock = vi.fn((input: RequestInfo | URL) => {
		const body = String(input).includes("/get-session") ? session : {};
		return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function renderAt(path: string) {
	const history = createMemoryHistory({ initialEntries: [path] });
	const router = createRouter({ routeTree, history });
	render(<RouterProvider router={router} />);
	return router;
}

describe("/signup route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	test("redirects to the login when self-signup is off", async () => {
		vi.stubEnv("VITE_ALLOW_SELF_SIGNUP", undefined);
		stubGetSession(null);

		const router = renderAt("/signup");

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
		stubGetSession(null);

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

	test("redirects to / when a session already exists", async () => {
		vi.stubEnv("VITE_ALLOW_SELF_SIGNUP", "true");
		stubGetSession({
			session: { id: "s1" },
			user: { id: "u1", email: "ana@horizonte.test" },
		});

		const router = renderAt("/signup");

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
		expect(router.state.location.pathname).toBe("/");
	});
});
