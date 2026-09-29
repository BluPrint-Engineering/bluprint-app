import {
	MAX_PROJECT_SEARCH_LENGTH,
	type ProjectSort,
	type ProjectStatusFilter,
	projectSortSchema,
	projectStatusFilterSchema,
} from "@bluprint/shared";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { type ProjectsFilters, ProjectsPage } from "@/features/projects";

function pageParam(value: unknown): number | undefined {
	const page =
		typeof value === "number" || typeof value === "string"
			? Number(value)
			: Number.NaN;
	return Number.isInteger(page) && page > 1 ? page : undefined;
}

function qParam(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const q = value.trim();
	return q !== "" && q.length <= MAX_PROJECT_SEARCH_LENGTH ? q : undefined;
}

function sortParam(value: unknown): ProjectSort | undefined {
	const sort = projectSortSchema.safeParse(value).data;
	return sort === "recent" ? undefined : sort;
}

function statusParam(value: unknown): ProjectStatusFilter | undefined {
	const status = projectStatusFilterSchema.safeParse(value).data;
	return status === "active" ? undefined : status;
}

function managerParam(value: unknown): string | undefined {
	return typeof value === "string" && value !== "" ? value : undefined;
}

export const Route = createFileRoute("/_authenticated/projects/")({
	validateSearch: (
		search,
	): {
		page?: number | undefined;
		q?: string | undefined;
		status?: ProjectStatusFilter | undefined;
		sort?: ProjectSort | undefined;
		manager?: string | undefined;
	} => ({
		page: pageParam(search.page),
		q: qParam(search.q),
		status: statusParam(search.status),
		sort: sortParam(search.sort),
		manager: managerParam(search.manager),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const {
		page = 1,
		q = "",
		status = "active",
		sort = "recent",
		manager,
	} = Route.useSearch();
	const navigate = Route.useNavigate();
	const onPageChange = useCallback(
		(next: number, { replace = false }: { replace?: boolean } = {}) =>
			navigate({
				search: (prev) => ({ ...prev, page: pageParam(next) }),
				replace,
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
					status: statusParam(next.status),
					sort: sortParam(next.sort),
					manager: managerParam(next.manager),
					page: undefined,
				}),
				// each pause in typing would otherwise add a history entry for Back to step through
				replace: qParam(next.q) !== (q || undefined),
			}),
		[navigate, q],
	);

	return (
		<ProjectsPage
			page={page}
			filters={{ q, status, sort, manager }}
			onPageChange={onPageChange}
			onFiltersChange={onFiltersChange}
		/>
	);
}
