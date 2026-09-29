import {
	MAX_PROJECT_SEARCH_LENGTH,
	type ProjectSort,
	type ProjectStatusFilter,
	projectListQuerySchema,
	projectSortSchema,
	projectStatusFilterSchema,
} from "@bluprint/shared";

export interface ProjectsFilters {
	/** Trimmed; empty when there is no search. */
	q: string;
	status: ProjectStatusFilter;
	sort: ProjectSort;
	manager: string | undefined;
}

const apiDefaults = projectListQuerySchema.parse({});

export const DEFAULT_FILTERS: ProjectsFilters = {
	q: apiDefaults.q,
	status: apiDefaults.status,
	sort: apiDefaults.sort,
	manager: undefined,
};

export type ProjectsSearch = {
	page?: number | undefined;
	q?: string | undefined;
	status?: ProjectStatusFilter | undefined;
	sort?: ProjectSort | undefined;
	manager?: string | undefined;
};

function readPage(value: unknown): number {
	const page =
		typeof value === "number" || typeof value === "string"
			? Number(value)
			: Number.NaN;
	return Number.isInteger(page) && page > 1 ? page : 1;
}

function readQ(value: unknown): string {
	if (typeof value !== "string") return DEFAULT_FILTERS.q;
	const trimmed = value.trim();
	return trimmed.length <= MAX_PROJECT_SEARCH_LENGTH
		? trimmed
		: DEFAULT_FILTERS.q;
}

export function readSearch(search: Record<string, unknown>): {
	page: number;
	filters: ProjectsFilters;
} {
	return {
		page: readPage(search.page),
		filters: {
			q: readQ(search.q),
			status:
				projectStatusFilterSchema.safeParse(search.status).data ??
				DEFAULT_FILTERS.status,
			sort:
				projectSortSchema.safeParse(search.sort).data ?? DEFAULT_FILTERS.sort,
			manager:
				typeof search.manager === "string" && search.manager !== ""
					? search.manager
					: undefined,
		},
	};
}

function unlessDefault<T>(value: T, fallback: T): T | undefined {
	return value === fallback ? undefined : value;
}

export function writeSearch({
	page,
	filters,
}: {
	page: number;
	filters: ProjectsFilters;
}): ProjectsSearch {
	return {
		page: unlessDefault(page, 1),
		q: unlessDefault(filters.q, DEFAULT_FILTERS.q),
		status: unlessDefault(filters.status, DEFAULT_FILTERS.status),
		sort: unlessDefault(filters.sort, DEFAULT_FILTERS.sort),
		manager: filters.manager,
	};
}

export function countActiveFilters({
	status,
	manager,
}: ProjectsFilters): number {
	return (status === DEFAULT_FILTERS.status ? 0 : 1) + (manager ? 1 : 0);
}

export function isNarrowed(filters: ProjectsFilters): boolean {
	return filters.q !== DEFAULT_FILTERS.q || countActiveFilters(filters) > 0;
}

export function clearFilters({ q, sort }: ProjectsFilters): ProjectsFilters {
	return { ...DEFAULT_FILTERS, q, sort };
}

export function clearAllFilters({ sort }: ProjectsFilters): ProjectsFilters {
	return { ...DEFAULT_FILTERS, sort };
}

export function sameFilters(a: ProjectsFilters, b: ProjectsFilters): boolean {
	return (
		a.q === b.q &&
		a.status === b.status &&
		a.sort === b.sort &&
		a.manager === b.manager
	);
}

/** Never a user id, so this sentinel can't collide with a real manager. */
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
