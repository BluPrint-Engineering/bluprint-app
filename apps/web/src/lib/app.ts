import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter, type RouterHistory } from "@tanstack/react-router";
import { discardSession } from "@/features/auth";
import { routeTree } from "@/routeTree.gen";
import { ApiError } from "./api";

/**
 * Builds the QueryClient and the router together, because the 401 handler needs both. The app and
 * the tests go through here, so no rule holds only in production.
 */
export function createApp({ history }: { history?: RouterHistory } = {}) {
	// runs after both consts below exist: it fires from a request, never during construction
	function onUnauthorized(error: Error) {
		if (!(error instanceof ApiError && error.status === 401)) return;
		// a public screen has no session to lose, and redirecting from it would loop
		if (!router.state.matches.some((m) => m.routeId === "/_authenticated"))
			return;
		discardSession(queryClient);
		const { pathname, searchStr } = router.state.location;
		void router.navigate({
			to: "/login",
			search: { redirect: pathname + searchStr },
		});
	}

	const queryClient = new QueryClient({
		queryCache: new QueryCache({ onError: onUnauthorized }),
		mutationCache: new MutationCache({ onError: onUnauthorized }),
	});
	const router = createRouter({
		routeTree,
		context: { queryClient },
		...(history && { history }),
	});

	return { queryClient, router };
}
