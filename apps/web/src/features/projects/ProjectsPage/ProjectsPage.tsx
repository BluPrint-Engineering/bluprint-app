import { useQuery } from "@tanstack/react-query";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { organizationQueryOptions } from "../../account/api";
import { ContinuousProjectList } from "./ContinuousProjectList";
import type { ProjectsFilters } from "./filters";
import { PagedProjectList } from "./PagedProjectList";

interface ProjectsPageProps {
	/** The phone's list ignores it and always starts at the first page. */
	page: number;
	filters: ProjectsFilters;
	onPageChange: (page: number, options?: { replace?: boolean }) => void;
	onFiltersChange: (filters: ProjectsFilters) => void;
}

export function ProjectsPage({
	page,
	filters: requested,
	onPageChange,
	onFiltersChange,
}: ProjectsPageProps) {
	const desktop = useIsDesktop();
	const { data: organization, isPending } = useQuery(organizationQueryOptions);
	// a failed role lookup leaves the admin's controls out
	const admin = isPending ? undefined : organization?.role === "admin";

	// the API ignores a manager for anyone else, so the screen must not count or show it either
	const filters =
		admin === false ? { ...requested, manager: undefined } : requested;

	return desktop ? (
		<PagedProjectList
			page={page}
			filters={filters}
			admin={admin}
			onFiltersChange={onFiltersChange}
			onPageChange={onPageChange}
		/>
	) : (
		<ContinuousProjectList
			filters={filters}
			admin={admin}
			onFiltersChange={onFiltersChange}
		/>
	);
}
