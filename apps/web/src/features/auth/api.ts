import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";

/**
 * The only way to read the session, in the guard and on the public screens alike.
 * Resolves to `null` for a definite "no session" and throws for anything else, so a 500 or a dropped
 * connection never reads as signed out (ADR 0038).
 */
export const sessionQueryOptions = queryOptions({
	queryKey: ["session"],
	queryFn: async () => {
		// Better Auth's client resolves to `{ data, error }` on an HTTP error instead of throwing
		const { data, error } = await authClient.getSession();
		if (error) throw new Error(error.message ?? "Session check failed");
		return data;
	},
	// a revoked session can go unnoticed for this long on navigation; any 401 closes the window
	staleTime: 5 * 60 * 1000,
	// queryClient.query() retries 0 times unless told otherwise, which would fail on the first flicker of signal
	retry: 3,
});

/** Drops the cached session, so a sign-in, sign-up or 401 is never followed by a stale answer. */
export function discardSession(queryClient: QueryClient) {
	queryClient.removeQueries({ queryKey: sessionQueryOptions.queryKey });
}

/**
 * Reads the session for a public screen, where it is only a shortcut past the form: no retries, and
 * an unverifiable session counts as none, so the form shows at once.
 */
export function peekSession(queryClient: QueryClient) {
	return queryClient
		.query({ ...sessionQueryOptions, retry: false })
		.catch(() => null);
}
