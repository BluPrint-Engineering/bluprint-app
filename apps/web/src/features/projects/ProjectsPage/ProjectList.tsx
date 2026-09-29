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
import { clearAllFilters, type ProjectsFilters } from "./filters";
import { ProjectCard, ProjectCardSkeleton } from "./ProjectCard";
import { StateBlock } from "./StateBlock";

const GRID =
	"grid grid-cols-1 gap-(--space-3) md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]";

const SKELETON_WIDTHS = ["62%", "48%", "70%", "55%", "66%", "44%"];

interface ProjectsMainProps {
	total: number | undefined;
	counting: boolean;
	toolbar?: React.ReactNode;
	children: React.ReactNode;
}

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
	return <ListSkeleton />;
}

function ListSkeleton() {
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

export function hasProjects(counts: ProjectListData["counts"]) {
	return counts.active + counts.delivered > 0;
}

function NoProjects({ admin }: { admin: boolean | undefined }) {
	// the wrong block, even for a moment, would tell an admin to wait for someone else
	if (admin === undefined) return <ListSkeleton />;
	if (admin) {
		return (
			<StateBlock
				icon={Building}
				title="Nenhuma obra ainda"
				description="Crie a primeira obra da construtora para começar a mapear pendências."
			/>
		);
	}
	return (
		<StateBlock
			icon={Building}
			title="Nenhuma obra por aqui"
			description="Você verá uma obra aqui quando o admin da construtora te vincular a ela."
		/>
	);
}

function searchScopeText(status: ProjectStatusFilter): string {
	if (status === "active") return " em obras em andamento";
	if (status === "delivered") return " em obras entregues";
	return "";
}

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
			description={
				q
					? `Nenhum resultado para “${q}”${searchScopeText(status)}.`
					: "Nenhuma obra combina com os filtros escolhidos."
			}
		>
			<Button variant="outline" onClick={onClear}>
				Limpar filtros
			</Button>
		</StateBlock>
	);
}

interface EmptyListProps {
	admin: boolean | undefined;
	counts: ProjectListData["counts"];
	filters: ProjectsFilters;
	onFiltersChange: (filters: ProjectsFilters) => void;
}

export function EmptyList({
	admin,
	counts,
	filters,
	onFiltersChange,
}: EmptyListProps) {
	if (!hasProjects(counts)) {
		// the counts follow the manager filter, so a manager with no project is no "empty organization"
		return filters.manager ? (
			<NoResults
				q=""
				status={filters.status}
				onClear={() => onFiltersChange(clearAllFilters(filters))}
			/>
		) : (
			<NoProjects admin={admin} />
		);
	}

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
					onClick={() => onFiltersChange({ ...filters, status: "active" })}
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
