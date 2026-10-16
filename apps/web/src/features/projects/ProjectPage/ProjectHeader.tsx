import type { ProjectSummary } from "@bluprint/shared";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectStatusBadge } from "../components/ProjectStatusBadge";
import { ROLE_LABELS } from "../components/roleLabels";

function Band({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-border">
			<div className="mx-auto grid max-w-(--content-max-wide) gap-(--space-2) px-(--page-pad) pt-1 pb-(--space-5) md:px-(--page-pad-desktop) md:pt-(--space-4) md:pb-(--space-6)">
				<Link
					to="/projects"
					activeOptions={{ exact: true }}
					className="-ml-1.5 flex min-h-(--tap-min) w-fit items-center gap-0.5 rounded-md pr-(--space-2) text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:shadow-(--shadow-focus) focus-visible:outline-none"
				>
					<ChevronLeft className="size-5" aria-hidden="true" />
					Obras
				</Link>
				{children}
			</div>
		</div>
	);
}

export function ProjectHeader({ project }: { project: ProjectSummary }) {
	return (
		<Band>
			<div className="grid min-w-0 gap-(--space-2)">
				<h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-balance [overflow-wrap:anywhere] md:text-4xl">
					{project.name}
				</h1>
				<div className="flex flex-wrap items-center gap-(--space-3)">
					<ProjectStatusBadge status={project.status} />
					{project.role !== "admin" && (
						<span className="text-sm text-muted-foreground">
							{ROLE_LABELS[project.role]}
						</span>
					)}
				</div>
			</div>
		</Band>
	);
}

export function ProjectHeaderSkeleton() {
	return (
		<Band>
			<div
				role="status"
				aria-label="Carregando obra"
				aria-busy="true"
				className="grid gap-(--space-2)"
			>
				<Skeleton className="h-7 w-[70%] md:h-9 md:w-90" />
				<Skeleton className="h-6 w-29 rounded-full" />
			</div>
		</Band>
	);
}

export function ProjectHeaderBackOnly() {
	return <Band>{null}</Band>;
}
