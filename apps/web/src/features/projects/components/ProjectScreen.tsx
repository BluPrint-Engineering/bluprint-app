import type { ProjectSummary } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, WifiOff } from "lucide-react";
import { NotFound } from "@/components/NotFound";
import { Button } from "@/components/ui/button";
import { isProjectId, isProjectNotFound, projectQueryOptions } from "../api";
import { firstLoadState } from "./firstLoadState";
import {
	ProjectHeader,
	ProjectHeaderBackOnly,
	ProjectHeaderSkeleton,
	type ProjectSection,
} from "./ProjectHeader";
import { StateBlock } from "./StateBlock";

export function ProjectMain({ children }: { children: React.ReactNode }) {
	return (
		<main className="mx-auto w-full max-w-(--content-max-wide) flex-1 px-(--page-pad) pt-(--space-5) pb-(--space-8) md:px-(--page-pad-desktop) md:pt-(--space-8) md:pb-(--space-12)">
			{children}
		</main>
	);
}

interface ProjectScreenProps {
	projectId: string;
	section: ProjectSection;
	loading: React.ReactNode;
	children: (project: ProjectSummary) => React.ReactNode;
}

export function ProjectScreen({
	projectId,
	section,
	loading,
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
				<ProjectHeader project={query.data} section={section} />
				<ProjectMain>{children(query.data)}</ProjectMain>
			</>
		);
	}

	const state = firstLoadState(query);
	if (state === "loading") {
		return (
			<>
				<ProjectHeaderSkeleton {...scope} />
				<ProjectMain>{loading}</ProjectMain>
			</>
		);
	}

	return (
		<>
			<ProjectHeaderBackOnly {...scope} />
			<ProjectMain>
				{state === "failed" ? (
					<StateBlock
						role="alert"
						icon={CircleAlert}
						title="Não foi possível carregar a obra"
						description="Confira sua conexão e tente de novo."
					>
						<Button size="lg" onClick={() => query.refetch()}>
							Tentar de novo
						</Button>
					</StateBlock>
				) : (
					<StateBlock
						icon={WifiOff}
						title="Sem conexão."
						description="Continuamos assim que a internet voltar."
					/>
				)}
			</ProjectMain>
		</>
	);
}
