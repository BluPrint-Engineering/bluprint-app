import type { ProjectSummary } from "@bluprint/shared";
import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { LockLine } from "@/components/LockLine";
import { BackLink, PageBand } from "@/components/PageBand";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { ROLE_LABELS } from "./roleLabels";

export type ProjectSection = "home" | "configuration";

interface Scope {
	projectId: string;
	section: ProjectSection;
}

function ProjectBackLink({ projectId, section }: Scope) {
	return section === "home" ? (
		<BackLink to="/projects" activeOptions={{ exact: true }}>
			Obras
		</BackLink>
	) : (
		<BackLink
			to="/projects/$projectId"
			params={{ projectId }}
			activeOptions={{ exact: true }}
		>
			Início da obra
		</BackLink>
	);
}

function ConfigurationEntry({
	projectId,
	compact,
}: {
	projectId: string;
	compact: boolean;
}) {
	return (
		<Button
			asChild
			variant="outline"
			size={compact ? "icon" : "default"}
			aria-label="Configuração da obra"
		>
			<Link to="/projects/$projectId/configuration" params={{ projectId }}>
				<Settings className={compact ? undefined : "size-5"} aria-hidden />
				{!compact && "Configuração da obra"}
			</Link>
		</Button>
	);
}

function Band({
	scope,
	topRight,
	children,
}: {
	scope: Scope;
	topRight?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<PageBand>
			<div className="flex items-center justify-between gap-(--space-3)">
				<ProjectBackLink {...scope} />
				{topRight}
			</div>
			{children}
		</PageBand>
	);
}

export function ProjectHeader({
	project,
	section,
	lockLine,
}: {
	project: ProjectSummary;
	section: ProjectSection;
	lockLine?: string | undefined;
}) {
	const desktop = useIsDesktop();
	const entry =
		section === "home" ? (
			<ConfigurationEntry projectId={project.id} compact={!desktop} />
		) : null;
	return (
		<Band
			scope={{ projectId: project.id, section }}
			topRight={desktop ? null : entry}
		>
			<div className="flex flex-wrap items-end justify-between gap-(--space-3)">
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
					{lockLine && <LockLine>{lockLine}</LockLine>}
				</div>
				{desktop ? entry : null}
			</div>
		</Band>
	);
}

export function ProjectHeaderSkeleton(scope: Scope) {
	return (
		<Band scope={scope}>
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

export function ProjectHeaderBackOnly(scope: Scope) {
	return <Band scope={scope}>{null}</Band>;
}
