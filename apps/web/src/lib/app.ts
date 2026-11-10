import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter, type RouterHistory } from "@tanstack/react-router";
import {
	discardSession,
	forgetFailedSubmission,
	rememberFailedSubmission,
	screenPath,
} from "@/features/auth";
import { routeTree } from "@/routeTree.gen";
import { ApiError } from "./api";

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

	function signedInAccountId() {
		return router.state.matches.find((m) => m.routeId === "/_authenticated")
			?.context.session?.user.id;
	}

	const queryClient = new QueryClient({
		queryCache: new QueryCache({ onError: onUnauthorized }),
		mutationCache: new MutationCache({
			onError: (error, variables, _result, mutation) => {
				if (error instanceof ApiError && error.status === 401) {
					rememberFailedSubmission({
						accountId: signedInAccountId(),
						path: screenPath(router.state.location),
						kind: mutation.options.meta?.sessionDraft,
						variables,
					});
				}
				if (error instanceof Error) onUnauthorized(error);
			},
			onSuccess: (_data, _variables, _result, mutation) => {
				forgetFailedSubmission({
					accountId: signedInAccountId(),
					path: screenPath(router.state.location),
					kind: mutation.options.meta?.sessionDraft,
				});
			},
		}),
	});
	const router = createRouter({
		routeTree,
		context: { queryClient },
		...(history && { history }),
	});

	return { queryClient, router };
}
