import type { ProjectSummary } from "@bluprint/shared";
import type { FetchStatus } from "@tanstack/react-query";
import { Building, CircleAlert, WifiOff } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProjectCard, ProjectCardSkeleton } from "./ProjectCard";
import { StateBlock } from "./StateBlock";

const GRID =
	"grid grid-cols-1 gap-(--space-3) md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]";

const SKELETON_WIDTHS = ["62%", "48%", "70%", "55%", "66%", "44%"];

interface ProjectsMainProps {
	/** Of the whole list, not of what is on screen; `undefined` until it lands. */
	total: number | undefined;
	counting: boolean;
	children: React.ReactNode;
}

/** The page around the list: the title with the count, then the list or what stands in for it. */
export function ProjectsMain({ total, counting, children }: ProjectsMainProps) {
	return (
		<main className="mx-auto flex w-full flex-1 max-w-(--content-max-wide) flex-col gap-(--space-4) px-(--page-pad) pt-(--space-5) pb-(--space-8) md:gap-(--space-5) md:px-(--page-pad-desktop) md:pt-(--space-8) md:pb-(--space-12)">
			<div className="flex min-h-(--tap-min) min-w-0 items-baseline gap-(--space-3)">
				<h1 className="text-2xl leading-tight font-semibold tracking-tight md:text-3xl">
					Obras
				</h1>
				{total !== undefined && total > 0 ? (
					<span className="text-base text-muted-foreground tabular-nums">
						{total === 1 ? "1 obra" : `${total} obras`}
					</span>
				) : (
					total === undefined &&
					counting && <Skeleton className="h-4.5 w-16 self-center" />
				)}
			</div>
			{children}
		</main>
	);
}

interface FirstLoad {
	isError: boolean;
	isFetching: boolean;
	fetchStatus: FetchStatus;
	refetch: () => unknown;
}

/** Stands in for the list until its first page lands: loading, failed or waiting for the connection. */
export function ListPlaceholder({ query }: { query: FirstLoad }) {
	if (query.isError && !query.isFetching) {
		return (
			<StateBlock
				role="alert"
				icon={CircleAlert}
				title="Não foi possível carregar suas obras"
				description="Confira sua conexão e tente de novo."
			>
				<Button size="lg" onClick={() => query.refetch()}>
					Tentar de novo
				</Button>
			</StateBlock>
		);
	}
	if (query.fetchStatus === "paused") {
		// paused, not failed: TanStack Query resumes the request when the connection returns
		return (
			<StateBlock
				icon={WifiOff}
				title="Sem conexão."
				description="Continuamos assim que a internet voltar."
			/>
		);
	}
	return (
		<div
			role="status"
			aria-label="Carregando obras"
			aria-busy="true"
			className={GRID}
		>
			{SKELETON_WIDTHS.map((width) => (
				<ProjectCardSkeleton key={width} width={width} />
			))}
			{/* a phone fills its screen with 6, a desktop grid needs a full page */}
			{SKELETON_WIDTHS.map((width) => (
				<ProjectCardSkeleton
					key={`${width}-desktop`}
					width={width}
					className="max-md:hidden"
				/>
			))}
		</div>
	);
}

export function NoProjects() {
	return (
		<StateBlock
			icon={Building}
			title="Nenhuma obra por aqui"
			description="Você verá uma obra aqui quando o admin da construtora te vincular a ela."
		/>
	);
}

export function ProjectList({
	projects,
	busy = false,
}: {
	projects: ProjectSummary[];
	/** Dims the list while the one replacing it loads. */
	busy?: boolean;
}) {
	return (
		<ul
			aria-label="Obras"
			aria-busy={busy}
			className={cn(
				GRID,
				"transition-opacity duration-(--duration) ease-standard",
				busy && "opacity-55",
			)}
		>
			{projects.map((project) => (
				<li key={project.id} className="min-w-0">
					<ProjectCard project={project} />
				</li>
			))}
		</ul>
	);
}
