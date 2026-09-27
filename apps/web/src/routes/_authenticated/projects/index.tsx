import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { ProjectsPage } from "@/features/projects";

/** The first page is the default, so it never shows in the address; anything invalid falls back to it. */
function pageParam(value: unknown): number | undefined {
	const page =
		typeof value === "number" || typeof value === "string"
			? Number(value)
			: Number.NaN;
	return Number.isInteger(page) && page > 1 ? page : undefined;
}

export const Route = createFileRoute("/_authenticated/projects/")({
	validateSearch: (search): { page?: number | undefined } => ({
		page: pageParam(search.page),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { page = 1 } = Route.useSearch();
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

	return <ProjectsPage page={page} onPageChange={onPageChange} />;
}
