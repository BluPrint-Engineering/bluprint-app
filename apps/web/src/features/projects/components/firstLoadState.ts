import type { FetchStatus } from "@tanstack/react-query";

export interface FirstLoad {
	isError: boolean;
	isFetching: boolean;
	fetchStatus: FetchStatus;
	refetch: () => unknown;
}

export function firstLoadState(
	query: FirstLoad,
): "loading" | "failed" | "offline" {
	if (query.isError && !query.isFetching) return "failed";
	// paused, not failed: TanStack Query resumes the request when the connection returns
	if (query.fetchStatus === "paused") return "offline";
	return "loading";
}
