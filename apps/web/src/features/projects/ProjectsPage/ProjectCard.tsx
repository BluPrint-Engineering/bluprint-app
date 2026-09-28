import type {
	EffectiveRole,
	ProjectStatus,
	ProjectSummary,
} from "@bluprint/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatLastActivity } from "./lastActivity";
import { STATUS_LABELS } from "./statusLabels";

const ROLE_LABELS: Record<EffectiveRole, string> = {
	manager: "Gerente de obra",
	assistant: "Assistente de obra",
};

const STATUS_BADGE_VARIANT = {
	active: "primary",
	delivered: "neutral",
} as const satisfies Record<ProjectStatus, "primary" | "neutral">;

const CARD = "rounded-xl shadow-(--ring-hairline) ring-0";

// not a link, nor styled as one: the project screen it would open does not exist yet
export function ProjectCard({ project }: { project: ProjectSummary }) {
	return (
		// a delivered project is quieter, not disabled: no fill, the same card otherwise
		<Card
			className={cn(CARD, project.status === "delivered" && "bg-transparent")}
		>
			<CardContent className="grid gap-(--space-3)">
				<div className="flex min-h-13 items-start justify-between gap-(--space-3)">
					<div className="grid min-w-0 content-start gap-0.5">
						<h2 className="line-clamp-2 text-lg leading-snug font-semibold tracking-tight text-pretty">
							{project.name}
						</h2>
						{/* an admin's role would repeat on every card; it belongs in the account menu */}
						{project.role !== "admin" && (
							<p className="text-sm text-muted-foreground">
								{ROLE_LABELS[project.role]}
							</p>
						)}
					</div>
					<Badge variant={STATUS_BADGE_VARIANT[project.status]}>
						<span
							aria-hidden="true"
							className="size-1.5 rounded-full bg-current"
						/>
						{STATUS_LABELS[project.status]}
					</Badge>
				</div>
				{/* TODO(#7): the open-pin count takes the left side once pins exist */}
				<div className="flex justify-end border-t pt-(--space-3) text-sm text-muted-foreground">
					<time dateTime={project.lastActivityAt}>
						{formatLastActivity(project.lastActivityAt, Date.now())}
					</time>
				</div>
			</CardContent>
		</Card>
	);
}

export function ProjectCardSkeleton({
	width,
	className,
}: {
	/** Of the name line, varied so the placeholders don't read as one block. */
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
