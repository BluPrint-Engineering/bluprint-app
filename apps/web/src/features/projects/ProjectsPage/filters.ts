import type { ProjectSort, ProjectStatusFilter } from "@bluprint/shared";

export interface ProjectsFilters {
	/** Trimmed; empty when there is no search. */
	q: string;
	status: ProjectStatusFilter;
	sort: ProjectSort;
	manager: string | undefined;
}

export function countActiveFilters({
	status,
	manager,
}: ProjectsFilters): number {
	return (status === "active" ? 0 : 1) + (manager ? 1 : 0);
}

export function isNarrowed(filters: ProjectsFilters): boolean {
	return filters.q !== "" || countActiveFilters(filters) > 0;
}

export function clearFilters({ q, sort }: ProjectsFilters): ProjectsFilters {
	return { q, status: "active", sort, manager: undefined };
}

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

/** The "no manager filter" radio value; a user id never takes this shape. */
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
