import { PROJECT_PAGE_SIZE } from "@bluprint/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building, CircleAlert, WifiOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { projectsQueryOptions } from "../api";
import { ProjectCard, ProjectCardSkeleton } from "./ProjectCard";
import { ProjectsPagination } from "./ProjectsPagination";
import { StateBlock } from "./StateBlock";

const GRID =
	"grid grid-cols-1 gap-(--space-3) md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]";

const SKELETON_WIDTHS = ["62%", "48%", "70%", "55%", "66%", "44%"];

interface ProjectsPageProps {
	page: number;
	onPageChange: (page: number, options?: { replace?: boolean }) => void;
}

export function ProjectsPage({ page, onPageChange }: ProjectsPageProps) {
	const query = useQuery({
		...projectsQueryOptions(page),
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
	if (query.isError && !query.isFetching) {
		content = (
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
	} else if (!data && query.fetchStatus === "paused") {
		// paused, not failed: TanStack Query resumes the request when the connection returns
		content = (
			<StateBlock
				icon={WifiOff}
				title="Sem conexão."
				description="Continuamos assim que a internet voltar."
			/>
		);
	} else if (!data || overshotTo) {
		content = (
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
	} else if (data.total === 0) {
		content = (
			<StateBlock
				icon={Building}
				title="Nenhuma obra por aqui"
				description="Você verá uma obra aqui quando o admin da construtora te vincular a ela."
			/>
		);
	} else {
		content = (
			<>
				<ul
					aria-label="Obras"
					aria-busy={isPlaceholderData}
					className={cn(
						GRID,
						"transition-opacity duration-(--duration) ease-standard",
						isPlaceholderData && "opacity-55",
					)}
				>
					{data.items.map((project) => (
						<li key={project.id} className="min-w-0">
							<ProjectCard project={project} />
						</li>
					))}
				</ul>
				<ProjectsPagination
					page={data.page}
					loadingPage={isPlaceholderData ? page : undefined}
					total={data.total}
					onPageChange={onPageChange}
				/>
			</>
		);
	}

	return (
		<main className="mx-auto grid w-full max-w-(--content-max-wide) content-start gap-(--space-4) px-(--page-pad) pt-(--space-5) pb-(--space-8) md:gap-(--space-5) md:px-(--page-pad-desktop) md:pt-(--space-8) md:pb-(--space-12)">
			<div className="flex min-h-(--tap-min) min-w-0 items-baseline gap-(--space-3)">
				<h1 className="text-2xl leading-tight font-semibold tracking-tight md:text-3xl">
					Obras
				</h1>
				{data && data.total > 0 ? (
					<span className="text-base text-muted-foreground tabular-nums">
						{data.total === 1 ? "1 obra" : `${data.total} obras`}
					</span>
				) : (
					!data &&
					query.isFetching && <Skeleton className="h-4.5 w-16 self-center" />
				)}
			</div>
			{content}
		</main>
	);
}
