import {
	PROJECT_PAGE_SIZE,
	type ProjectSort,
	projectListSchema,
} from "@bluprint/shared";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

function fetchProjectsPage(
	page: number,
	{ q, sort }: { q: string; sort: ProjectSort },
	pageSize = PROJECT_PAGE_SIZE,
) {
	const params = new URLSearchParams({
		page: String(page),
		pageSize: String(pageSize),
		sort,
	});
	if (q) params.set("q", q);
	return apiFetch(`/projects?${params}`, projectListSchema);
}

export function projectsQueryOptions({
	page,
	q,
	sort,
}: {
	page: number;
	q: string;
	sort: ProjectSort;
}) {
	return queryOptions({
		queryKey: ["projects", { page, pageSize: PROJECT_PAGE_SIZE, q, sort }],
		queryFn: async () => {
			const list = await fetchProjectsPage(page, { q, sort });
			// tagged with its page: while the next page loads, the data on screen is still the previous one's
			return { ...list, page };
		},
	});
}

/** The phone's list: the same pages as the desktop's, appended one after another. */
export function projectsInfiniteQueryOptions({
	q,
	sort,
}: {
	q: string;
	sort: ProjectSort;
}) {
	return infiniteQueryOptions({
		queryKey: [
			"projects",
			"infinite",
			{ pageSize: PROJECT_PAGE_SIZE, q, sort },
		],
		queryFn: ({ pageParam }) => fetchProjectsPage(pageParam, { q, sort }),
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

/** How many projects the filters leave, without loading them: one project is the smallest page. */
export function projectsTotalQueryOptions({
	q,
	sort,
}: {
	q: string;
	sort: ProjectSort;
}) {
	return queryOptions({
		queryKey: ["projects", "total", { q, sort }],
		queryFn: async () => (await fetchProjectsPage(1, { q, sort }, 1)).total,
	});
}
