import { PROJECT_PAGE_SIZE } from "@bluprint/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { projectsQueryOptions } from "../api";
import {
	firstLoadState,
	ListPlaceholder,
	NoProjects,
	ProjectList,
	ProjectsMain,
} from "./ProjectList";
import type { ProjectsControls, ProjectsFilters } from "./ProjectsPage";
import { ProjectsPagination } from "./ProjectsPagination";
import { ProjectsToolbar } from "./ProjectsToolbar";

interface PagedProjectListProps {
	page: number;
	filters: ProjectsFilters;
	controls: ProjectsControls;
	onPageChange: (page: number, options?: { replace?: boolean }) => void;
}

/** The desktop's list: one numbered page at a time, the page kept in the address. */
export function PagedProjectList({
	page,
	filters,
	controls,
	onPageChange,
}: PagedProjectListProps) {
	const query = useQuery({
		...projectsQueryOptions({ page, ...filters }),
		// the page on screen stays, dimmed, until the next one lands
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
	// only a first load can fail into the error block; a failed refresh keeps the list on screen
	if (!data || overshotTo) {
		content = <ListPlaceholder query={query} />;
	} else if (data.total === 0) {
		content = <NoProjects />;
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
		? data.total > 0
		: firstLoadState(query) === "loading";

	return (
		<ProjectsMain
			total={data?.total}
			counting={query.isFetching}
			toolbar={
				showToolbar && <ProjectsToolbar {...controls} total={data?.total} />
			}
		>
			{content}
		</ProjectsMain>
	);
}
