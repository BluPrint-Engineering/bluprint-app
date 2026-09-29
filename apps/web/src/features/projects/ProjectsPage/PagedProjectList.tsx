import { PROJECT_PAGE_SIZE } from "@bluprint/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { projectsQueryOptions } from "../api";
import { clearAllFilters, isNarrowed, type ProjectsFilters } from "./filters";
import {
	EmptyList,
	firstLoadState,
	hasProjects,
	ListPlaceholder,
	NoResults,
	ProjectList,
	ProjectsMain,
} from "./ProjectList";
import { ProjectsPagination } from "./ProjectsPagination";
import { ProjectsToolbar } from "./ProjectsToolbar";

interface PagedProjectListProps {
	page: number;
	filters: ProjectsFilters;
	admin: boolean | undefined;
	onFiltersChange: (filters: ProjectsFilters) => void;
	onPageChange: (page: number, options?: { replace?: boolean }) => void;
}

export function PagedProjectList({
	page,
	filters,
	admin,
	onFiltersChange,
	onPageChange,
}: PagedProjectListProps) {
	const query = useQuery({
		...projectsQueryOptions({ page, ...filters }),
		placeholderData: keepPreviousData,
	});
	const { data, isPlaceholderData } = query;
	const landed = isPlaceholderData ? undefined : data;

	// an old link can point past the last page once projects leave the list
	const overshotTo =
		landed && landed.items.length === 0 && landed.total > 0
			? Math.ceil(landed.total / PROJECT_PAGE_SIZE)
			: undefined;
	useEffect(() => {
		if (overshotTo) onPageChange(overshotTo, { replace: true });
	}, [overshotTo, onPageChange]);

	const landedPage = landed?.page;
	const previousLandedPage = useRef(landedPage);
	useEffect(() => {
		if (landedPage === undefined) return;
		if (
			previousLandedPage.current !== undefined &&
			previousLandedPage.current !== landedPage
		) {
			window.scrollTo({ top: 0 });
		}
		previousLandedPage.current = landedPage;
	}, [landedPage]);

	let content: React.ReactNode;
	if (!data || overshotTo) {
		content = <ListPlaceholder query={query} />;
	} else if (data.total === 0) {
		content = filters.q ? (
			<NoResults
				q={filters.q}
				status={filters.status}
				onClear={() => onFiltersChange(clearAllFilters(filters))}
			/>
		) : (
			<EmptyList
				admin={admin}
				counts={data.counts}
				filters={filters}
				onFiltersChange={onFiltersChange}
			/>
		);
	} else {
		content = (
			<>
				<ProjectList projects={data.items} busy={isPlaceholderData} />
				<ProjectsPagination
					page={data.page}
					loadingPage={isPlaceholderData ? page : undefined}
					total={data.total}
					onPageChange={onPageChange}
				/>
			</>
		);
	}

	const showToolbar = data
		? data.total > 0 || isNarrowed(filters) || hasProjects(data.counts)
		: firstLoadState(query) === "loading";

	return (
		<ProjectsMain
			total={data?.total}
			counting={query.isFetching}
			toolbar={
				showToolbar && (
					<ProjectsToolbar
						filters={filters}
						admin={admin === true}
						onFiltersChange={onFiltersChange}
						total={data?.total}
					/>
				)
			}
		>
			{content}
		</ProjectsMain>
	);
}
