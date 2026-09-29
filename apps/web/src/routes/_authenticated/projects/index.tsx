import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import {
	type ProjectsFilters,
	ProjectsPage,
	type ProjectsSearch,
	readSearch,
	writeSearch,
} from "@/features/projects";

export const Route = createFileRoute("/_authenticated/projects/")({
	validateSearch: (search): ProjectsSearch => writeSearch(readSearch(search)),
	component: RouteComponent,
});

function RouteComponent() {
	const { page, filters } = readSearch(Route.useSearch());
	const navigate = Route.useNavigate();
	const onPageChange = useCallback(
		(next: number, { replace = false }: { replace?: boolean } = {}) =>
			navigate({
				search: (prev) => writeSearch({ ...readSearch(prev), page: next }),
				replace,
				resetScroll: false,
			}),
		[navigate],
	);
	const { q } = filters;
	const onFiltersChange = useCallback(
		(next: ProjectsFilters) => {
			const search = writeSearch({ page: 1, filters: next });
			return navigate({
				search,
				// each pause in typing would otherwise add a history entry for Back to step through
				replace: readSearch(search).filters.q !== q,
			});
		},
		[navigate, q],
	);

	return (
		<ProjectsPage
			page={page}
			filters={filters}
			onPageChange={onPageChange}
			onFiltersChange={onFiltersChange}
		/>
	);
}
