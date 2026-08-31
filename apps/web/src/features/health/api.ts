import { type HealthQuery, healthResponseSchema } from "@bluprint/shared";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function healthQueryOptions(query: HealthQuery) {
	const search = new URLSearchParams();
	if (query.verbose) search.set("verbose", "true");
	const qs = search.toString();

	return queryOptions({
		queryKey: ["health", query],
		queryFn: () =>
			apiFetch(`/health${qs ? `?${qs}` : ""}`, healthResponseSchema),
	});
}
