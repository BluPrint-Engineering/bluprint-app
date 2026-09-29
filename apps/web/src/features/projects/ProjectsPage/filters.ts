import type { ProjectSort, ProjectStatusFilter } from "@bluprint/shared";

/** What narrows or reorders the list; changing any of it goes back to the first page. */
export interface ProjectsFilters {
	/** Trimmed; empty when there is no search. */
	q: string;
	status: ProjectStatusFilter;
	sort: ProjectSort;
	/** A user id: only the projects that person manages. Meaningful for the admin alone. */
	manager: string | undefined;
}

/** Counts what the filter sheet holds and hides projects; the search has its own field, so it never counts, and the sort only reorders, so it never counts either. */
export function countActiveFilters({
	status,
	manager,
}: ProjectsFilters): number {
	return (status === "active" ? 0 : 1) + (manager ? 1 : 0);
}

/** Whether anything hides projects, the search included; what "Limpar filtros" in the toolbar answers to. */
export function isNarrowed(filters: ProjectsFilters): boolean {
	return filters.q !== "" || countActiveFilters(filters) > 0;
}

/** The sheet's filters back to their defaults; the search and the sort are kept. */
export function clearFilters({ q, sort }: ProjectsFilters): ProjectsFilters {
	return { q, status: "active", sort, manager: undefined };
}

/** Everything that hides projects back to its default, the search included; the sort is kept. */
export function clearAllFilters({ sort }: ProjectsFilters): ProjectsFilters {
	return { q: "", status: "active", sort, manager: undefined };
}

export function sameFilters(a: ProjectsFilters, b: ProjectsFilters): boolean {
	return (
		a.q === b.q &&
		a.status === b.status &&
		a.sort === b.sort &&
		a.manager === b.manager
	);
}

/** The radio value for "no manager filter"; a user id never takes this shape. */
export const ALL_MANAGERS = "all";

export function managerChoice(filters: ProjectsFilters): string {
	return filters.manager ?? ALL_MANAGERS;
}

export function withManager(
	filters: ProjectsFilters,
	choice: string,
): ProjectsFilters {
	return {
		...filters,
		manager: choice === ALL_MANAGERS ? undefined : choice,
	};
}
