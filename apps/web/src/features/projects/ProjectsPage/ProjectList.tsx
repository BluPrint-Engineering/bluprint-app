import type {
	ProjectList as ProjectListData,
	ProjectStatusFilter,
	ProjectSummary,
} from "@bluprint/shared";
import type { FetchStatus } from "@tanstack/react-query";
import { Building, CircleAlert, Search, WifiOff } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { clearFilters, type ProjectsFilters } from "./filters";
import { ProjectCard, ProjectCardSkeleton } from "./ProjectCard";
import { StateBlock } from "./StateBlock";

const GRID =
	"grid grid-cols-1 gap-(--space-3) md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]";

const SKELETON_WIDTHS = ["62%", "48%", "70%", "55%", "66%", "44%"];

interface ProjectsMainProps {
	/** Of the whole list, not of what is on screen; `undefined` until it lands. */
	total: number | undefined;
	counting: boolean;
	/** Between the title and the list; left out where there is nothing to sort or filter. */
	toolbar?: React.ReactNode;
	children: React.ReactNode;
}

/** The page around the list: the title with the count, the toolbar, then the list or what stands in for it. */
export function ProjectsMain({
	total,
	counting,
	toolbar,
	children,
}: ProjectsMainProps) {
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
			{toolbar}
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

export function firstLoadState(
	query: FirstLoad,
): "loading" | "failed" | "offline" {
	if (query.isError && !query.isFetching) return "failed";
	// paused, not failed: TanStack Query resumes the request when the connection returns
	if (query.fetchStatus === "paused") return "offline";
	return "loading";
}

/** Stands in for the list until its first page lands: loading, failed or waiting for the connection. */
export function ListPlaceholder({ query }: { query: FirstLoad }) {
	const state = firstLoadState(query);
	if (state === "failed") {
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
	if (state === "offline") {
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

/** Whether the person can see any project at all, whatever the status filter leaves on screen. */
export function hasProjects(counts: ProjectListData["counts"]) {
	return counts.active + counts.delivered > 0;
}

function NoProjects() {
	return (
		<StateBlock
			icon={Building}
			title="Nenhuma obra por aqui"
			description="Você verá uma obra aqui quando o admin da construtora te vincular a ela."
		/>
	);
}

/** The clause a search-empty message appends, so its scope reads with the status it ran against. */
function searchScopeText(status: ProjectStatusFilter): string {
	if (status === "active") return " em obras em andamento";
	if (status === "delivered") return " em obras entregues";
	return "";
}

/** What a search that matches no project shows; "Limpar filtros" is the way back to the list. */
export function NoResults({
	q,
	status,
	onClear,
}: {
	q: string;
	status: ProjectStatusFilter;
	onClear: () => void;
}) {
	return (
		<StateBlock
			icon={Search}
			title="Nenhuma obra encontrada"
			description={`Nenhum resultado para “${q}”${searchScopeText(status)}.`}
		>
			<Button variant="outline" onClick={onClear}>
				Limpar filtros
			</Button>
		</StateBlock>
	);
}

interface EmptyListProps {
	counts: ProjectListData["counts"];
	filters: ProjectsFilters;
	onFiltersChange: (filters: ProjectsFilters) => void;
}

/** What stands in for a list with nothing on it: no project at all, or none in the status on screen. */
export function EmptyList({
	counts,
	filters,
	onFiltersChange,
}: EmptyListProps) {
	if (!hasProjects(counts)) return <NoProjects />;

	// "all" cannot come up empty while any project exists, so what is left is a single status
	if (filters.status === "delivered") {
		return (
			<StateBlock
				icon={Building}
				title="Nenhuma obra entregue"
				description="As obras aparecem aqui depois de marcadas como entregues."
			>
				<Button
					variant="outline"
					size="lg"
					onClick={() => onFiltersChange(clearFilters(filters))}
				>
					Ver em andamento
				</Button>
			</StateBlock>
		);
	}
	return (
		<StateBlock
			icon={Building}
			title="Nenhuma obra em andamento"
			description="As obras entregues continuam disponíveis."
		>
			<Button
				variant="outline"
				size="lg"
				onClick={() => onFiltersChange({ ...filters, status: "delivered" })}
			>
				Ver entregues
			</Button>
		</StateBlock>
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
