import type { ProjectSummary, Structure, TypologyList } from "@bluprint/shared";
import {
	type UseQueryResult,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	Link,
	Navigate,
	useRouteContext,
	useRouter,
} from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoadFailure } from "@/components/LoadFailure";
import { LockLine } from "@/components/LockLine";
import { NotFound } from "@/components/NotFound";
import { BackLink, PageBand, PageMain } from "@/components/PageBand";
import { StateBlock } from "@/components/StateBlock";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { firstLoadState } from "@/lib/firstLoadState";
import {
	isProjectId,
	isProjectNotFound,
	projectQueryOptions,
} from "../../projects/api";
import { structureQueryOptions, typologiesQueryOptions } from "../api";
import { STRUCTURE_LOCKED } from "../lockedText";
import { readStructureDraft, structureDraftKey } from "../structureDraftStore";
import { StructureWizard } from "./StructureWizard";
import { towerNowLine } from "./towerNow";
import { UnusableAttemptGate } from "./UnusableAttemptGate";
import { extendedDraft } from "./wizardDraft";

const H1 =
	"text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-balance md:text-4xl";

function DeliveredBlock({ projectId }: { projectId: string }) {
	return (
		<StateBlock
			icon={Lock}
			title="A obra foi entregue"
			description="A estrutura não pode mais ser alterada. Dá para conferir tudo na fachada e na configuração."
		>
			<Button asChild size="lg">
				<Link to="/projects/$projectId" params={{ projectId }}>
					Voltar para a obra
				</Link>
			</Button>
		</StateBlock>
	);
}

interface WizardPageProps {
	projectId: string;
	towerId?: string | undefined;
}

export function StructureWizardPage({ projectId, towerId }: WizardPageProps) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [generation, setGeneration] = useState(0);
	async function reopen() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: projectQueryOptions(projectId).queryKey,
			}),
			queryClient.invalidateQueries({ queryKey: ["structure", projectId] }),
		]);
		await router.invalidate();
		setGeneration((current) => current + 1);
	}
	return (
		<WizardPage
			key={generation}
			projectId={projectId}
			towerId={towerId}
			onReopen={() => void reopen()}
		/>
	);
}

function WizardPage({
	projectId,
	towerId,
	onReopen,
}: WizardPageProps & { onReopen: () => void }) {
	const { session } = useRouteContext({ from: "/_authenticated" });
	const storageKey = structureDraftKey(session.user.id, projectId, towerId);
	const [stored] = useState(() => readStructureDraft(storageKey));
	const [attemptMissing, setAttemptMissing] = useState(false);
	const valid = isProjectId(projectId);
	const query = useQuery({ ...projectQueryOptions(projectId), enabled: valid });
	const extending = valid && towerId !== undefined;
	const structure = useQuery({
		...structureQueryOptions(projectId),
		enabled: extending,
	});
	const typologies = useQuery({
		...typologiesQueryOptions(projectId),
		enabled: extending,
	});
	useEffect(() => {
		if (
			query.data?.status === "delivered" &&
			(!stored?.attempt || attemptMissing)
		) {
			localStorage.removeItem(storageKey);
		}
	}, [query.data?.status, stored, attemptMissing, storageKey]);

	if (!valid || isProjectNotFound(query.error)) {
		return <NotFound variant="project" />;
	}

	const missingTower =
		towerId !== undefined &&
		structure.data !== undefined &&
		!structure.data.towers.some((tower) => tower.id === towerId);
	if (
		stored?.attempt &&
		!attemptMissing &&
		(towerId === undefined || structure.data !== undefined) &&
		(query.data?.status === "delivered" || missingTower)
	) {
		return (
			<PageMain>
				<UnusableAttemptGate
					projectId={projectId}
					towerId={towerId}
					towerName={
						(structure.data?.towers.length ?? 0) > 1
							? structure.data?.towers.find((tower) => tower.id === towerId)
									?.name
							: undefined
					}
					storageKey={storageKey}
					stored={stored}
					onReopen={onReopen}
					onMissing={() => {
						if (missingTower && query.data?.status !== "delivered")
							toast.info("A torre não existe mais. O rascunho foi descartado.");
						setAttemptMissing(true);
					}}
				/>
			</PageMain>
		);
	}

	if (missingTower && query.data?.status === "delivered")
		return (
			<PageMain>
				<DeliveredBlock projectId={projectId} />
			</PageMain>
		);

	if (missingTower && query.data?.status !== "delivered") {
		return (
			<Navigate to="/projects/$projectId" params={{ projectId }} replace />
		);
	}

	if (query.data && towerId !== undefined) {
		return (
			<AddFloorsPage
				project={query.data}
				towerId={towerId}
				queries={[structure, typologies]}
				onReopen={onReopen}
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
				<PageMain>
					{delivered ? (
						<DeliveredBlock projectId={project.id} />
					) : (
						<StructureWizard project={project} onReopen={onReopen} />
					)}
				</PageMain>
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
	queries: [structure, typologies],
	onReopen,
}: {
	project: ProjectSummary;
	towerId: string;
	onReopen: () => void;
	queries: [
		UseQueryResult<Structure, unknown>,
		UseQueryResult<TypologyList, unknown>,
	];
}) {
	const delivered = project.status === "delivered";
	const tower = structure.data?.towers.find(({ id }) => id === towerId);
	const named = (structure.data?.towers.length ?? 0) > 1;

	if (structure.data && typologies.data && tower) {
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
				<PageMain>
					{delivered ? (
						<DeliveredBlock projectId={project.id} />
					) : (
						<StructureWizard
							project={project}
							start={extendedDraft(tower, typologies.data.typologies, named)}
							onReopen={onReopen}
						/>
					)}
				</PageMain>
			</>
		);
	}

	const waiting = [structure, typologies].filter(({ data }) => !data);
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
