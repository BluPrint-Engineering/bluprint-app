import {
	locationParamsSchema,
	type ProjectSummary,
	type Structure,
	type UnitTypeList,
} from "@bluprint/shared";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
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
import { structureQueryOptions, unitTypesQueryOptions } from "../api";
import { STRUCTURE_LOCKED } from "../lockedText";
import { StructureWizard } from "./StructureWizard";
import { towerNowLine } from "./towerNow";
import { extendedDraft } from "./wizardDraft";

const H1 =
	"text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-balance md:text-4xl";

export function StructureWizardPage({
	projectId,
	towerId,
}: {
	projectId: string;
	towerId?: string | undefined;
}) {
	const valid = isProjectId(projectId);
	const query = useQuery({ ...projectQueryOptions(projectId), enabled: valid });
	const extending = valid && towerId !== undefined;
	const structure = useQuery({
		...structureQueryOptions(projectId),
		enabled: extending,
	});
	const unitTypes = useQuery({
		...unitTypesQueryOptions(projectId),
		enabled: extending,
	});

	if (!valid || isProjectNotFound(query.error)) {
		return <NotFound variant="project" />;
	}

	if (
		towerId !== undefined &&
		(!locationParamsSchema.shape.locationId.safeParse(towerId).success ||
			(structure.data &&
				!structure.data.towers.some((tower) => tower.id === towerId)))
	) {
		return (
			<Navigate to="/projects/$projectId" params={{ projectId }} replace />
		);
	}

	if (query.data && towerId !== undefined) {
		return (
			<AddFloorsPage
				project={query.data}
				towerId={towerId}
				queries={[structure, unitTypes]}
			/>
		);
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

function AddFloorsPage({
	project,
	towerId,
	queries: [structure, unitTypes],
}: {
	project: ProjectSummary;
	towerId: string;
	queries: [
		UseQueryResult<Structure, unknown>,
		UseQueryResult<UnitTypeList, unknown>,
	];
}) {
	const delivered = project.status === "delivered";
	const tower = structure.data?.towers.find(({ id }) => id === towerId);
	const named = (structure.data?.towers.length ?? 0) > 1;

	if (structure.data && unitTypes.data && tower) {
		return (
			<>
				<PageBand>
					{named ? (
						<BackLink
							to="/projects/$projectId/locations/$locationId"
							params={{ projectId: project.id, locationId: tower.id }}
						>
							{tower.name}
						</BackLink>
					) : (
						<BackLink
							to="/projects/$projectId"
							params={{ projectId: project.id }}
							activeOptions={{ exact: true }}
						>
							{project.name}
						</BackLink>
					)}
					<h1 className={H1}>
						{named ? `Adicionar andares à ${tower.name}` : "Adicionar andares"}
					</h1>
					{delivered ? (
						<LockLine>{STRUCTURE_LOCKED}</LockLine>
					) : (
						<p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
							{towerNowLine(tower, named)}
						</p>
					)}
				</PageBand>
				{!delivered && (
					<PageMain>
						<StructureWizard
							project={project}
							start={extendedDraft(tower, unitTypes.data.unitTypes, named)}
						/>
					</PageMain>
				)}
			</>
		);
	}

	const waiting = [structure, unitTypes].filter(({ data }) => !data);
	const failed = waiting.find((query) => firstLoadState(query) === "failed");
	const offline = waiting.some((query) => firstLoadState(query) === "offline");
	return (
		<>
			<PageBand>
				<BackLink
					to="/projects/$projectId"
					params={{ projectId: project.id }}
					activeOptions={{ exact: true }}
				>
					{project.name}
				</BackLink>
				{!failed && !offline && (
					<div
						role="status"
						aria-label="Carregando torre"
						aria-busy="true"
						className="grid gap-(--space-2)"
					>
						<Skeleton className="h-7 w-[70%] md:h-9 md:w-90" />
					</div>
				)}
			</PageBand>
			<PageMain>
				{failed || offline ? (
					<LoadFailure
						state={failed ? "failed" : "offline"}
						title="Não foi possível carregar a torre"
						onRetry={() => {
							for (const query of waiting) void query.refetch();
						}}
					/>
				) : (
					<Skeleton className="h-64 w-full rounded-xl" />
				)}
			</PageMain>
		</>
	);
}
