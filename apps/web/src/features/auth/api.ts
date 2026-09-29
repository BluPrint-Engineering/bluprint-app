import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";

/** `null` only for a definite "no session"; anything else throws, so a 500 or a dropped connection never reads as signed out (ADR 0038). */
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

export function discardSession(queryClient: QueryClient) {
	queryClient.removeQueries({ queryKey: sessionQueryOptions.queryKey });
}

/** Unlike the guard's read, an unverifiable session counts as none, so the form shows at once. */
export function peekSession(queryClient: QueryClient) {
	return queryClient
		.query({ ...sessionQueryOptions, retry: false })
		.catch(() => null);
}

/** Throws when the server could not end the session, so no one is told they left while still signed in. */
export async function signOut() {
	const { error } = await authClient.signOut();
	if (error) throw new Error(error.message ?? "Sign-out failed");
}
