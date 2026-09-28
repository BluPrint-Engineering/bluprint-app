import type { ProjectSort } from "@bluprint/shared";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { ContinuousProjectList } from "./ContinuousProjectList";
import { PagedProjectList } from "./PagedProjectList";
import type { ProjectsFilterSheetProps } from "./ProjectsFilterSheet";

/** What narrows or reorders the list; changing any of it goes back to the first page. */
export interface ProjectsFilters {
	sort: ProjectSort;
}

/** The toolbar's controls, less the total each list reads from its own query. */
export type ProjectsControls = Omit<ProjectsFilterSheetProps, "total">;

interface ProjectsPageProps {
	/** Of the desktop's pages; the phone's list always starts at the first. */
	page: number;
	filters: ProjectsFilters;
	onPageChange: (page: number, options?: { replace?: boolean }) => void;
	onFiltersChange: (filters: Partial<ProjectsFilters>) => void;
}

export function ProjectsPage({
	page,
	filters,
	onPageChange,
	onFiltersChange,
}: ProjectsPageProps) {
	const desktop = useIsDesktop();
	const controls: ProjectsControls = {
		sort: filters.sort,
		onSortChange: (sort) => onFiltersChange({ sort }),
		// the sort is the only control so far, and it hides no project
		activeFilterCount: 0,
		onClearFilters: () => onFiltersChange({}),
	};

	return desktop ? (
		<PagedProjectList
			page={page}
			filters={filters}
			controls={controls}
			onPageChange={onPageChange}
		/>
	) : (
		<ContinuousProjectList filters={filters} controls={controls} />
	);
}
