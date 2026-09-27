import type { EffectiveRole, ProjectSummary } from "@bluprint/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<EffectiveRole, string> = {
	manager: "Gerente de obra",
	assistant: "Assistente de obra",
};

const CARD = "rounded-xl shadow-(--ring-hairline) ring-0";

// not a link, nor styled as one: the project screen it would open does not exist yet
export function ProjectCard({ project }: { project: ProjectSummary }) {
	return (
		<Card className={CARD}>
			<CardContent className="grid min-h-13 content-start gap-0.5">
				<h2 className="line-clamp-2 text-lg leading-snug font-semibold tracking-tight text-pretty">
					{project.name}
				</h2>
				{/* an admin's role would repeat on every card; it belongs in the account menu */}
				{project.role !== "admin" && (
					<p className="text-sm text-muted-foreground">
						{ROLE_LABELS[project.role]}
					</p>
				)}
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
			<CardContent className="min-h-13 pt-0.5">
				<Skeleton className="h-5" style={{ width }} />
			</CardContent>
		</Card>
	);
}
