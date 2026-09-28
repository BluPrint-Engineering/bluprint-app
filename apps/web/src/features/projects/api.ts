import { PROJECT_PAGE_SIZE, projectListSchema } from "@bluprint/shared";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

function fetchProjectsPage(page: number) {
	const params = new URLSearchParams({
		page: String(page),
		pageSize: String(PROJECT_PAGE_SIZE),
	});
	return apiFetch(`/projects?${params}`, projectListSchema);
}

export function projectsQueryOptions(page: number) {
	return queryOptions({
		queryKey: ["projects", { page, pageSize: PROJECT_PAGE_SIZE }],
		queryFn: async () => {
			const list = await fetchProjectsPage(page);
			// tagged with its page: while the next page loads, the data on screen is still the previous one's
			return { ...list, page };
		},
	});
}

/** The phone's list: the same pages as the desktop's, appended one after another. */
export function projectsInfiniteQueryOptions() {
	return infiniteQueryOptions({
		queryKey: ["projects", "infinite", { pageSize: PROJECT_PAGE_SIZE }],
		queryFn: ({ pageParam }) => fetchProjectsPage(pageParam),
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
