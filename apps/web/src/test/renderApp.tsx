import type { Organization } from "@bluprint/shared";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { createApp } from "@/lib/app";

const USER = {
	id: "u1",
	name: "Ana Ribeiro",
	email: "ana@horizonte.test",
	image: null,
};
const SESSION = { session: { id: "s1" }, user: USER };

type Session = typeof SESSION | null;

export const organization: Organization = {
	id: "0199a1f4-3c2e-7d5a-9b1e-2f4c6a8e0d13",
	name: "Construtora Horizonte",
	role: "manager",
};

export function json(body: unknown, status = 200): Promise<Response> {
	return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

/** Answers any request the stub doesn't; `undefined` falls through to the defaults. */
export type ApiHandler = (url: URL) => Promise<Response> | Response | undefined;

/**
 * Stubs the API at the network boundary. `setSession` changes what the server would answer from
 * then on; a successful sign-in or sign-up flips it to a session and a sign-out back to none, as a
 * real one would. `signOut` replaces the sign-out answer, to make it fail or hang. The project list
 * answers empty unless `api` answers it.
 */
export function stubApi(
	initial: Session,
	options: {
		organization?: Organization;
		signOut?: () => Promise<Response>;
		api?: ApiHandler;
	} = {},
) {
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
		if (url.pathname.endsWith("/sign-out")) {
			if (options.signOut) return options.signOut();
			session = null;
			return json({ success: true });
		}
		const answered = options.api?.(url);
		if (answered) return Promise.resolve(answered);
		if (url.pathname === "/api/organization") {
			return json(options.organization ?? organization);
		}
		if (url.pathname === "/api/projects")
			return json({
				items: [],
				total: 0,
				counts: { active: 0, delivered: 0 },
			});
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
