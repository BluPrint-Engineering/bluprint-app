import { useIsDesktop } from "@/lib/useIsDesktop";
import { ContinuousProjectList } from "./ContinuousProjectList";
import type { ProjectsFilters } from "./filters";
import { PagedProjectList } from "./PagedProjectList";

interface ProjectsPageProps {
	/** Of the desktop's pages; the phone's list always starts at the first. */
	page: number;
	filters: ProjectsFilters;
	onPageChange: (page: number, options?: { replace?: boolean }) => void;
	onFiltersChange: (filters: ProjectsFilters) => void;
}

export function ProjectsPage({
	page,
	filters,
	onPageChange,
	onFiltersChange,
}: ProjectsPageProps) {
	const desktop = useIsDesktop();
	return desktop ? (
		<PagedProjectList
			page={page}
			filters={filters}
			onFiltersChange={onFiltersChange}
			onPageChange={onPageChange}
		/>
	) : (
		<ContinuousProjectList
			filters={filters}
			onFiltersChange={onFiltersChange}
		/>
	);
}
