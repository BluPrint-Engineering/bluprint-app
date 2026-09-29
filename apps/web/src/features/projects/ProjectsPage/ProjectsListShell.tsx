import type {
	ProjectList as ProjectListData,
	ProjectStatusFilter,
} from "@bluprint/shared";
import type { FetchStatus } from "@tanstack/react-query";
import { Building, CircleAlert, Search, WifiOff } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clearAllFilters, isNarrowed, type ProjectsFilters } from "../filters";
import { ListSkeleton } from "./ProjectList";
import type { ProjectsToolbarProps } from "./ProjectsToolbar";
import { StateBlock } from "./StateBlock";

interface ProjectsMainProps {
	total: number | undefined;
	counting: boolean;
	toolbar?: React.ReactNode;
	children: React.ReactNode;
}

function ProjectsMain({
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

function firstLoadState(query: FirstLoad): "loading" | "failed" | "offline" {
	if (query.isError && !query.isFetching) return "failed";
	// paused, not failed: TanStack Query resumes the request when the connection returns
	if (query.fetchStatus === "paused") return "offline";
	return "loading";
}

function ListPlaceholder({ query }: { query: FirstLoad }) {
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

function hasProjects(counts: ProjectListData["counts"]) {
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

function NoResults({
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

function EmptyList({
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

interface ProjectsListShellProps {
	query: FirstLoad;
	loaded: Pick<ProjectListData, "total" | "counts"> | undefined;
	filters: ProjectsFilters;
	admin: boolean | undefined;
	onFiltersChange: (filters: ProjectsFilters) => void;
	Toolbar: React.ComponentType<ProjectsToolbarProps>;
	children: React.ReactNode;
}

export function ProjectsListShell({
	query,
	loaded,
	filters,
	admin,
	onFiltersChange,
	Toolbar,
	children,
}: ProjectsListShellProps) {
	let content: React.ReactNode;
	if (!loaded) {
		content = <ListPlaceholder query={query} />;
	} else if (loaded.total === 0) {
		content = filters.q ? (
			<NoResults
				q={filters.q}
				status={filters.status}
				onClear={() => onFiltersChange(clearAllFilters(filters))}
			/>
		) : (
			<EmptyList
				admin={admin}
				counts={loaded.counts}
				filters={filters}
				onFiltersChange={onFiltersChange}
			/>
		);
	} else {
		content = children;
	}

	const nothingToFilter =
		loaded !== undefined &&
		loaded.total === 0 &&
		!isNarrowed(filters) &&
		!hasProjects(loaded.counts);
	const showToolbar = loaded
		? !nothingToFilter
		: firstLoadState(query) === "loading";

	return (
		<ProjectsMain
			total={loaded?.total}
			counting={query.isFetching}
			toolbar={
				showToolbar && (
					<Toolbar
						filters={filters}
						admin={admin === true}
						onFiltersChange={onFiltersChange}
						total={loaded?.total}
					/>
				)
			}
		>
			{content}
		</ProjectsMain>
	);
}
