import type { ProjectSummary } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { LoadFailure } from "@/components/LoadFailure";
import { NotFound } from "@/components/NotFound";
import { PageMain } from "@/components/PageBand";
import { firstLoadState } from "@/lib/firstLoadState";
import { isProjectId, isProjectNotFound, projectQueryOptions } from "../api";
import {
	ProjectHeader,
	ProjectHeaderBackOnly,
	ProjectHeaderSkeleton,
	type ProjectSection,
} from "./ProjectHeader";

interface ProjectScreenProps {
	projectId: string;
	section: ProjectSection;
	loading: React.ReactNode;
	lockLine?: (project: ProjectSummary) => string | undefined;
	children: (project: ProjectSummary) => React.ReactNode;
}

export function ProjectScreen({
	projectId,
	section,
	loading,
	lockLine,
	children,
}: ProjectScreenProps) {
	const valid = isProjectId(projectId);
	const query = useQuery({ ...projectQueryOptions(projectId), enabled: valid });
	const scope = { projectId, section };

	if (!valid || isProjectNotFound(query.error)) {
		return <NotFound variant="project" />;
	}

	if (query.data) {
		return (
			<>
				<ProjectHeader
					project={query.data}
					section={section}
					lockLine={lockLine?.(query.data)}
				/>
				<PageMain>{children(query.data)}</PageMain>
			</>
		);
	}

	const state = firstLoadState(query);
	if (state === "loading") {
		return (
			<>
				<ProjectHeaderSkeleton {...scope} />
				<PageMain>{loading}</PageMain>
			</>
		);
	}

	return (
		<>
			<ProjectHeaderBackOnly {...scope} />
			<PageMain>
				<LoadFailure
					state={state}
					title="Não foi possível carregar a obra"
					onRetry={() => query.refetch()}
				/>
			</PageMain>
		</>
	);
}
