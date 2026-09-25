import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { createApp } from "@/lib/app";

const USER = { id: "u1", email: "ana@horizonte.test" };
const SESSION = { session: { id: "s1" }, user: USER };

type Session = typeof SESSION | null;

/**
 * Stubs the API at the network boundary. `setSession` changes what the server would answer from
 * then on; a successful sign-in or sign-up flips it to a session, as a real one would.
 */
export function stubAuthApi(initial: Session) {
	let session = initial;
	const json = (body: unknown) =>
		Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
	const fetchMock = vi.fn((input: RequestInfo | URL) => {
		const url = String(input);
		if (url.includes("/get-session")) return json(session);
		if (url.includes("/sign-in/email") || url.includes("/sign-up/email")) {
			session = SESSION;
			return json({ token: "t", user: USER });
		}
		return json({});
	});
	vi.stubGlobal("fetch", fetchMock);
	return {
		fetchMock,
		setSession(next: Session) {
			session = next;
		},
	};
}

export const signedIn = SESSION;

/** Renders the real route tree, built by the same factory as the app, on an in-memory history. */
export function renderAt(path: string) {
	const { router, queryClient } = createApp({
		history: createMemoryHistory({ initialEntries: [path] }),
	});
	// three automatic attempts would otherwise cost ~7 s per failing test
	queryClient.setDefaultOptions({ queries: { retryDelay: 0 } });
	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
	return { router, queryClient };
}
