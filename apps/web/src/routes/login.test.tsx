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

describe("/login route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("redirects to / when a session already exists", async () => {
		stubGetSession({
			session: { id: "s1" },
			user: { id: "u1", email: "ana@horizonte.test" },
		});

		renderAt("/login");

		await waitFor(() => {
			expect(screen.getByText("Obras")).toBeInTheDocument();
		});
	});

	test("renders the login form when there is no session", async () => {
		stubGetSession(null);

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
});
