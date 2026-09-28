import { useIsDesktop } from "@/lib/useIsDesktop";
import { ContinuousProjectList } from "./ContinuousProjectList";
import { PagedProjectList } from "./PagedProjectList";

interface ProjectsPageProps {
	/** Of the desktop's pages; the phone's list always starts at the first. */
	page: number;
	onPageChange: (page: number, options?: { replace?: boolean }) => void;
}

export function ProjectsPage({ page, onPageChange }: ProjectsPageProps) {
	const desktop = useIsDesktop();
	return desktop ? (
		<PagedProjectList page={page} onPageChange={onPageChange} />
	) : (
		<ContinuousProjectList />
	);
}
