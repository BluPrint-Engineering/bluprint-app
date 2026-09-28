import {
	MAX_PROJECT_SEARCH_LENGTH,
	type ProjectSort,
	projectSortSchema,
} from "@bluprint/shared";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { type ProjectsFilters, ProjectsPage } from "@/features/projects";

/** The first page is the default, so it never shows in the address; anything invalid falls back to it. */
function pageParam(value: unknown): number | undefined {
	const page =
		typeof value === "number" || typeof value === "string"
			? Number(value)
			: Number.NaN;
	return Number.isInteger(page) && page > 1 ? page : undefined;
}

/** No search is the default, so it never shows in the address; blank or too long falls back to it. */
function qParam(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const q = value.trim();
	return q !== "" && q.length <= MAX_PROJECT_SEARCH_LENGTH ? q : undefined;
}

/** Newest first is the default, so it never shows in the address; anything invalid falls back to it. */
function sortParam(value: unknown): ProjectSort | undefined {
	const sort = projectSortSchema.safeParse(value).data;
	return sort === "recent" ? undefined : sort;
}

export const Route = createFileRoute("/_authenticated/projects/")({
	validateSearch: (
		search,
	): {
		page?: number | undefined;
		q?: string | undefined;
		sort?: ProjectSort | undefined;
	} => ({
		page: pageParam(search.page),
		q: qParam(search.q),
		sort: sortParam(search.sort),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { page = 1, q = "", sort = "recent" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const onPageChange = useCallback(
		(next: number, { replace = false }: { replace?: boolean } = {}) =>
			navigate({
				search: (prev) => ({ ...prev, page: pageParam(next) }),
				replace,
				// the list scrolls up when the next page lands, not while it loads
				resetScroll: false,
			}),
		[navigate],
	);
	const onFiltersChange = useCallback(
		(next: ProjectsFilters) =>
			navigate({
				search: (prev) => ({
					...prev,
					q: qParam(next.q),
					sort: sortParam(next.sort),
					// the page the caller was on may not exist in the new result
					page: undefined,
				}),
			}),
		[navigate],
	);

	return (
		<ProjectsPage
			page={page}
			filters={{ q, sort }}
			onPageChange={onPageChange}
			onFiltersChange={onFiltersChange}
		/>
	);
}
