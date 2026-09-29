import {
	PROJECT_PAGE_SIZE,
	projectListSchema,
	projectManagersSchema,
} from "@bluprint/shared";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ProjectsFilters } from "./filters";

function fetchProjectsPage(
	page: number,
	{ q, status, sort, manager }: ProjectsFilters,
	pageSize = PROJECT_PAGE_SIZE,
) {
	const params = new URLSearchParams({
		page: String(page),
		pageSize: String(pageSize),
		status,
		sort,
	});
	if (q) params.set("q", q);
	if (manager) params.set("manager", manager);
	return apiFetch(`/projects?${params}`, projectListSchema);
}

export function projectsQueryOptions(page: number, filters: ProjectsFilters) {
	return queryOptions({
		queryKey: ["projects", { page, pageSize: PROJECT_PAGE_SIZE, ...filters }],
		queryFn: async () => {
			const list = await fetchProjectsPage(page, filters);
			// tagged with its page: while the next page loads, the data on screen is still the previous one's
			return { ...list, page };
		},
	});
}

export function projectsInfiniteQueryOptions(filters: ProjectsFilters) {
	return infiniteQueryOptions({
		queryKey: [
			"projects",
			"infinite",
			{ pageSize: PROJECT_PAGE_SIZE, ...filters },
		],
		queryFn: ({ pageParam }) => fetchProjectsPage(pageParam, filters),
		initialPageParam: 1,
		getNextPageParam: (lastPage, pages, lastPageParam) => {
			const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
			// an empty page means the list shrank under us; asking for more would never end
			return lastPage.items.length > 0 && loaded < lastPage.total
				? lastPageParam + 1
				: undefined;
		},
	});
}

export function projectsTotalQueryOptions(filters: ProjectsFilters) {
	return queryOptions({
		queryKey: ["projects", "total", filters],
		queryFn: async () => (await fetchProjectsPage(1, filters, 1)).total,
	});
}

/** Only the admin may ask. */
export function projectManagersQueryOptions(enabled: boolean) {
	return queryOptions({
		queryKey: ["projects", "managers"],
		queryFn: () => apiFetch("/projects/managers", projectManagersSchema),
		enabled,
		staleTime: 60 * 1000,
	});
}
