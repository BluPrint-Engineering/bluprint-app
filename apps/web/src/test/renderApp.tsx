import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { createApp } from "@/lib/app";

const USER = { id: "u1", email: "ana@horizonte.test" };
const SESSION = { session: { id: "s1" }, user: USER };

type Session = typeof SESSION | null;

export function json(body: unknown, status = 200): Promise<Response> {
	return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

/** Answers any request the auth stub doesn't; `undefined` falls through to the defaults. */
export type ApiHandler = (url: URL) => Promise<Response> | Response | undefined;

/**
 * Stubs the API at the network boundary. `setSession` changes what the server would answer from
 * then on; a successful sign-in or sign-up flips it to a session, as a real one would. The project
 * list answers empty unless `api` answers it.
 */
export function stubAuthApi(initial: Session, api?: ApiHandler) {
	let session = initial;
	const fetchMock = vi.fn((input: RequestInfo | URL) => {
		const url = new URL(String(input), "http://localhost");
		if (url.pathname.endsWith("/get-session")) return json(session);
		if (
			url.pathname.endsWith("/sign-in/email") ||
			url.pathname.endsWith("/sign-up/email")
		) {
			session = SESSION;
			return json({ token: "t", user: USER });
		}
		const answered = api?.(url);
		if (answered) return Promise.resolve(answered);
		if (url.pathname === "/api/projects") return json({ items: [], total: 0 });
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
