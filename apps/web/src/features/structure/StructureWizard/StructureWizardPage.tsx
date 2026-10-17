import { useQuery } from "@tanstack/react-query";
import { LoadFailure } from "@/components/LoadFailure";
import { LockLine } from "@/components/LockLine";
import { NotFound } from "@/components/NotFound";
import { BackLink, PageBand, PageMain } from "@/components/PageBand";
import { Skeleton } from "@/components/ui/skeleton";
import { firstLoadState } from "@/lib/firstLoadState";
import {
	isProjectId,
	isProjectNotFound,
	projectQueryOptions,
} from "../../projects/api";
import { STRUCTURE_LOCKED } from "../lockedText";
import { StructureWizard } from "./StructureWizard";

const H1 =
	"text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-balance md:text-4xl";

export function StructureWizardPage({ projectId }: { projectId: string }) {
	const valid = isProjectId(projectId);
	const query = useQuery({ ...projectQueryOptions(projectId), enabled: valid });

	if (!valid || isProjectNotFound(query.error)) {
		return <NotFound variant="project" />;
	}

	if (query.data) {
		const project = query.data;
		const delivered = project.status === "delivered";
		return (
			<>
				<PageBand>
					<BackLink
						to="/projects/$projectId"
						params={{ projectId }}
						activeOptions={{ exact: true }}
					>
						{project.name}
					</BackLink>
					<h1 className={H1}>Montar estrutura</h1>
					{delivered ? (
						<LockLine>{STRUCTURE_LOCKED}</LockLine>
					) : (
						<p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
							{project.name} · nada é salvo antes de criar
						</p>
					)}
				</PageBand>
				{!delivered && (
					<PageMain>
						<StructureWizard project={project} />
					</PageMain>
				)}
			</>
		);
	}

	const state = firstLoadState(query);
	return (
		<>
			<PageBand>
				<BackLink to="/projects" activeOptions={{ exact: true }}>
					Obras
				</BackLink>
				{state === "loading" && (
					<div
						role="status"
						aria-label="Carregando obra"
						aria-busy="true"
						className="grid gap-(--space-2)"
					>
						<Skeleton className="h-7 w-[70%] md:h-9 md:w-90" />
					</div>
				)}
			</PageBand>
			<PageMain>
				{state === "loading" ? (
					<Skeleton className="h-64 w-full rounded-xl" />
				) : (
					<LoadFailure
						state={state}
						title="Não foi possível carregar a obra"
						onRetry={() => query.refetch()}
					/>
				)}
			</PageMain>
		</>
	);
}
