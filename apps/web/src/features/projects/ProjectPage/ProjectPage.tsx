import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Layers, WifiOff } from "lucide-react";
import { NotFound } from "@/components/NotFound";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isProjectId, isProjectNotFound, projectQueryOptions } from "../api";
import { firstLoadState } from "../components/firstLoadState";
import { StateBlock } from "../components/StateBlock";
import {
	ProjectHeader,
	ProjectHeaderBackOnly,
	ProjectHeaderSkeleton,
} from "./ProjectHeader";

function Main({ children }: { children: React.ReactNode }) {
	return (
		<main className="mx-auto w-full max-w-(--content-max-wide) flex-1 px-(--page-pad) pt-(--space-5) pb-(--space-8) md:px-(--page-pad-desktop) md:pt-(--space-8) md:pb-(--space-12)">
			{children}
		</main>
	);
}

function BlankProject() {
	return (
		<StateBlock
			icon={Layers}
			title="A obra ainda não tem estrutura"
			description="As pendências aparecem aqui quando a obra tiver estrutura."
		/>
	);
}

function BlankProjectSkeleton() {
	return (
		<div
			aria-hidden="true"
			className="mx-auto grid w-full max-w-(--content-max) justify-items-center gap-(--space-4) py-(--space-12) md:py-(--space-16)"
		>
			<Skeleton className="size-6 rounded-full" />
			<div className="grid justify-items-center gap-(--space-2)">
				<Skeleton className="h-5 w-60" />
				<Skeleton className="h-3.5 w-75" />
			</div>
		</div>
	);
}

export function ProjectPage({ projectId }: { projectId: string }) {
	const valid = isProjectId(projectId);
	const query = useQuery({ ...projectQueryOptions(projectId), enabled: valid });

	if (!valid || isProjectNotFound(query.error)) {
		return <NotFound variant="project" />;
	}

	if (query.data) {
		return (
			<>
				<ProjectHeader project={query.data} />
				<Main>
					<BlankProject />
				</Main>
			</>
		);
	}

	const state = firstLoadState(query);
	if (state === "loading") {
		return (
			<>
				<ProjectHeaderSkeleton />
				<Main>
					<BlankProjectSkeleton />
				</Main>
			</>
		);
	}

	return (
		<>
			<ProjectHeaderBackOnly />
			<Main>
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
			</Main>
		</>
	);
}
