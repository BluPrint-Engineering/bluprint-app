import {
	PROJECT_PAGE_SIZE,
	type ProjectSort,
	projectListSchema,
} from "@bluprint/shared";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function projectsQueryOptions({
	page,
	sort,
}: {
	page: number;
	sort: ProjectSort;
}) {
	return queryOptions({
		queryKey: ["projects", { page, pageSize: PROJECT_PAGE_SIZE, sort }],
		queryFn: async () => {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: String(PROJECT_PAGE_SIZE),
				sort,
			});
			const list = await apiFetch(`/projects?${params}`, projectListSchema);
			// tagged with its page: while the next page loads, the data on screen is still the previous one's
			return { ...list, page };
		},
	});
}
