import type { ProjectSort } from "@bluprint/shared";

/** What narrows or reorders the list; changing any of it goes back to the first page. */
export interface ProjectsFilters {
	sort: ProjectSort;
}

/** Counts what hides projects; the sort only reorders them, so it never counts. */
export function countActiveFilters(_filters: ProjectsFilters): number {
	return 0;
}

/** Every filter back to its default; the sort is kept. */
export function clearFilters({ sort }: ProjectsFilters): ProjectsFilters {
	return { sort };
}

export function sameFilters(a: ProjectsFilters, b: ProjectsFilters): boolean {
	return a.sort === b.sort;
}
