import { locationParamsSchema } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MapPinOff } from "lucide-react";
import { LoadFailure } from "@/components/LoadFailure";
import { LockLine } from "@/components/LockLine";
import { NotFound } from "@/components/NotFound";
import { BackLink, PageBand, PageMain } from "@/components/PageBand";
import { StateBlock } from "@/components/StateBlock";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { firstLoadState } from "@/lib/firstLoadState";
import { cn } from "@/lib/utils";
import { isProjectId, projectQueryOptions } from "../../projects/api";
import {
	isNotFound,
	locationQueryOptions,
	structureQueryOptions,
} from "../api";
import { FacadeSkeleton } from "../components/Facade";
import { STRUCTURE_LOCKED } from "../lockedText";
import { CommonAreaBody } from "./CommonAreaBody";
import { FloorBody } from "./FloorBody";
import { describeLocation } from "./locationBand";
import { TowerBody } from "./TowerBody";
import { UnitBody } from "./UnitBody";

function isLocationId(id: string) {
	return locationParamsSchema.shape.locationId.safeParse(id).success;
}

function LocationNotFound({ projectId }: { projectId: string }) {
	return (
		<>
			<PageBand>
				<BackLink to="/projects" activeOptions={{ exact: true }}>
					Obras
				</BackLink>
			</PageBand>
			<PageMain>
				<StateBlock
					icon={MapPinOff}
					title="Local não encontrado"
					description="Ele foi excluído ou arquivado, ou você não tem acesso a esta obra."
				>
					<Button asChild size="lg" className="max-md:w-full">
						<Link to="/projects/$projectId" params={{ projectId }}>
							Voltar para a obra
						</Link>
					</Button>
				</StateBlock>
			</PageMain>
		</>
	);
}

export function LocationPage({
	projectId,
	locationId,
	from,
}: {
	projectId: string;
	locationId: string;
	from?: string | undefined;
}) {
	const validProject = isProjectId(projectId);
	const validLocation = isLocationId(locationId);
	const project = useQuery({
		...projectQueryOptions(projectId),
		enabled: validProject,
	});
	const location = useQuery({
		...locationQueryOptions(projectId, locationId),
		enabled: validProject && validLocation,
	});
	const structure = useQuery({
		...structureQueryOptions(projectId),
		enabled: validProject,
	});

	if (!validProject) return <NotFound variant="project" />;
	if (
		!validLocation ||
		[project, location, structure].some((query) => isNotFound(query.error))
	) {
		return <LocationNotFound projectId={projectId} />;
	}

	if (project.data && location.data && structure.data) {
		const band = describeLocation(location.data, structure.data, from);
		const tower =
			location.data.type === "tower"
				? structure.data.towers.find(
						(candidate) => candidate.id === location.data.id,
					)
				: undefined;

		const floor =
			location.data.type === "floor"
				? structure.data.towers
						.flatMap((candidate) => candidate.floors)
						.find((candidate) => candidate.id === location.data.id)
				: undefined;

		if (
			(location.data.type === "tower" && !tower) ||
			(location.data.type === "floor" && !floor)
		) {
			return <LocationNotFound projectId={projectId} />;
		}

		return (
			<>
				<PageBand>
					{band.parent.kind === "project" ? (
						<BackLink to="/projects/$projectId" params={{ projectId }}>
							{project.data.name}
						</BackLink>
					) : (
						<BackLink
							to="/projects/$projectId/locations/$locationId"
							params={{ projectId, locationId: band.parent.id }}
						>
							{band.parent.name}
						</BackLink>
					)}
					<div className="grid min-w-0 gap-(--space-2)">
						<h1
							className={cn(
								"text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-balance [overflow-wrap:anywhere] md:text-4xl",
								band.mono && "font-mono",
							)}
						>
							{band.title}
						</h1>
						<p className="text-sm text-muted-foreground">{band.meta}</p>
						{project.data.status === "delivered" && (
							<LockLine>{STRUCTURE_LOCKED}</LockLine>
						)}
					</div>
				</PageBand>
				<PageMain>
					{tower && <TowerBody projectId={projectId} tower={tower} />}
					{floor && <FloorBody projectId={projectId} floor={floor} />}
					{location.data.type === "unit" && (
						<UnitBody
							projectId={projectId}
							unit={location.data}
							editable={project.data.status !== "delivered"}
						/>
					)}
					{location.data.type === "common_area" && (
						<CommonAreaBody
							projectId={projectId}
							area={location.data}
							editable={project.data.status !== "delivered"}
						/>
					)}
				</PageMain>
			</>
		);
	}

	const waiting = [project, location, structure].filter((query) => !query.data);
	const failed = waiting.find((query) => firstLoadState(query) === "failed");
	const offline = waiting.some((query) => firstLoadState(query) === "offline");

	return (
		<>
			<PageBand>
				<BackLink to="/projects" activeOptions={{ exact: true }}>
					Obras
				</BackLink>
				{!failed && !offline && (
					<div
						role="status"
						aria-label="Carregando local"
						aria-busy="true"
						className="grid gap-(--space-3) py-1"
					>
						<Skeleton className="h-7 w-[60%] md:h-9 md:w-80" />
						<Skeleton className="h-5 w-45" />
					</div>
				)}
			</PageBand>
			<PageMain>
				{failed || offline ? (
					<LoadFailure
						state={failed ? "failed" : "offline"}
						title="Não foi possível carregar o local"
						onRetry={() => {
							for (const query of waiting) void query.refetch();
						}}
					/>
				) : (
					<FacadeSkeleton />
				)}
			</PageMain>
		</>
	);
}
