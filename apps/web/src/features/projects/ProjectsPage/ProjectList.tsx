import type { ProjectSummary } from "@bluprint/shared";
import { cn } from "@/lib/utils";
import { ProjectCard, ProjectCardSkeleton } from "./ProjectCard";

const GRID =
	"grid grid-cols-1 gap-(--space-3) md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]";

const SKELETON_WIDTHS = ["62%", "48%", "70%", "55%", "66%", "44%"];

export function ListSkeleton() {
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
