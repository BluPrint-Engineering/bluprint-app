import type { ProjectSummary } from "@bluprint/shared";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProjectStatusBadge } from "../components/ProjectStatusBadge";
import { ROLE_LABELS } from "../components/roleLabels";
import { formatLastActivity } from "./lastActivity";

const CARD = "rounded-xl shadow-(--ring-hairline) ring-0";

export function ProjectCard({ project }: { project: ProjectSummary }) {
	return (
		<Link
			to="/projects/$projectId"
			params={{ projectId: project.id }}
			className="block rounded-xl transition-[box-shadow,transform] duration-(--duration-fast) ease-standard outline-none hover:shadow-[0_0_0_1px_var(--input)] focus-visible:shadow-(--shadow-focus) active:translate-y-px"
		>
			<Card
				className={cn(CARD, project.status === "delivered" && "bg-transparent")}
			>
				<CardContent className="grid gap-(--space-3)">
					<div className="flex min-h-13 items-start justify-between gap-(--space-3)">
						<div className="grid min-w-0 content-start gap-0.5">
							<h2 className="line-clamp-2 text-lg leading-snug font-semibold tracking-tight text-pretty">
								{project.name}
							</h2>
							{project.role !== "admin" && (
								<p className="text-sm text-muted-foreground">
									{ROLE_LABELS[project.role]}
								</p>
							)}
						</div>
						<ProjectStatusBadge status={project.status} />
					</div>
					{/* TODO(#7): the open-pin count takes the left side once pins exist */}
					<div className="flex justify-end border-t pt-(--space-3) text-sm text-muted-foreground">
						<time dateTime={project.lastActivityAt}>
							{formatLastActivity(project.lastActivityAt, Date.now())}
						</time>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

export function ProjectCardSkeleton({
	width,
	className,
}: {
	width: string;
	className?: string;
}) {
	return (
		<Card className={cn(CARD, className)}>
			<CardContent className="grid gap-(--space-3)">
				<div className="min-h-13 pt-0.5">
					<Skeleton className="h-5" style={{ width }} />
				</div>
				<div className="flex justify-end border-t pt-(--space-3)">
					<Skeleton className="h-4 w-28" />
				</div>
			</CardContent>
		</Card>
	);
}
