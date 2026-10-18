import {
	type LocationDetail,
	locationParamsSchema,
	type ProjectSummary,
	type Structure,
} from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { MapPinOff, Plus } from "lucide-react";
import { LoadFailure } from "@/components/LoadFailure";
import { LockLine } from "@/components/LockLine";
import { NotFound } from "@/components/NotFound";
import { BackLink, PageBand, PageMain } from "@/components/PageBand";
import { StateBlock } from "@/components/StateBlock";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { firstLoadState } from "@/lib/firstLoadState";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { cn } from "@/lib/utils";
import { isProjectId, projectQueryOptions } from "../../projects/api";
import {
	isNotFound,
	locationQueryOptions,
	structureQueryOptions,
} from "../api";
import { FacadeSkeleton } from "../components/Facade";
import { LocationMenu } from "../components/LocationMenu";
import { useAdding } from "../components/useAdding";
import { STRUCTURE_LOCKED } from "../lockedText";
import type { Scope } from "../naming";
import { floorChildCounts, NO_CHILDREN, towerChildCounts } from "../removeText";
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

const PAGE_MENU_LABELS = {
	tower: "Ações da torre",
	floor: "Ações do andar",
	unit: "Ações da unidade",
	common_area: "Ações da área comum",
} as const;

function scopeOfParent(location: LocationDetail): Scope {
	const parent = location.ancestors.at(-1);
	if (location.type === "tower" || !parent) return "project";
	if (location.type === "common_area" && parent.type === "floor") {
		return "floor";
	}
	return "tower";
}

function LocationView({
	project,
	location,
	structure,
	from,
}: {
	project: ProjectSummary;
	location: LocationDetail;
	structure: Structure;
	from?: string | undefined;
}) {
	const desktop = useIsDesktop();
	const adding = useAdding();
	const navigate = useNavigate();
	const projectId = project.id;
	const canEdit = project.status !== "delivered";
	const band = describeLocation(location, structure, from);

	const tower =
		location.type === "tower"
			? structure.towers.find((candidate) => candidate.id === location.id)
			: undefined;
	const floorTower =
		location.type === "floor"
			? structure.towers.find((candidate) =>
					candidate.floors.some((each) => each.id === location.id),
				)
			: undefined;
	const floor = floorTower?.floors.find((each) => each.id === location.id);

	if (
		(location.type === "tower" && !tower) ||
		(location.type === "floor" && (!floor || !floorTower))
	) {
		return <LocationNotFound projectId={projectId} />;
	}

	const towerName =
		structure.towers.length > 1
			? (tower?.name ??
				location.ancestors.find((ancestor) => ancestor.type === "tower")?.name)
			: undefined;

	const { parent } = band;
	const leaveRemoved = () =>
		navigate(
			parent.kind === "project"
				? { to: "/projects/$projectId", params: { projectId } }
				: {
						to: "/projects/$projectId/locations/$locationId",
						params: { projectId, locationId: parent.id },
					},
		);

	const menu = canEdit && (
		<LocationMenu
			projectId={projectId}
			variant="outline"
			label={PAGE_MENU_LABELS[location.type]}
			movable={location.type === "floor" || location.type === "unit"}
			removal={{
				counts: tower
					? towerChildCounts(tower)
					: floor
						? floorChildCounts(floor)
						: NO_CHILDREN,
				afterRemoval: leaveRemoved,
			}}
			onCloseAutoFocus={(event) => {
				if (adding.is("tower-area")) event.preventDefault();
			}}
			target={{
				id: location.id,
				type: location.type,
				name: location.name,
				scope: scopeOfParent(location),
				towerName,
			}}
		>
			{tower && (
				<DropdownMenuItem onSelect={() => adding.open("tower-area")}>
					<Plus className="size-4.5" aria-hidden="true" />
					Adicionar área comum
				</DropdownMenuItem>
			)}
		</LocationMenu>
	);

	return (
		<>
			<PageBand>
				<div className="flex items-center justify-between gap-(--space-3)">
					{band.parent.kind === "project" ? (
						<BackLink to="/projects/$projectId" params={{ projectId }}>
							{project.name}
						</BackLink>
					) : (
						<BackLink
							to="/projects/$projectId/locations/$locationId"
							params={{ projectId, locationId: band.parent.id }}
						>
							{band.parent.name}
						</BackLink>
					)}
					{!desktop && menu}
				</div>
				<div className="flex items-start justify-between gap-(--space-4)">
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
						{!canEdit && <LockLine>{STRUCTURE_LOCKED}</LockLine>}
					</div>
					{desktop && menu}
				</div>
			</PageBand>
			<PageMain>
				{tower && (
					<TowerBody
						projectId={projectId}
						tower={tower}
						towerName={towerName}
						adding={adding}
						canEdit={canEdit}
					/>
				)}
				{floor && floorTower && (
					<FloorBody
						project={project}
						tower={floorTower}
						floor={floor}
						towerName={towerName}
						adding={adding}
						canEdit={canEdit}
					/>
				)}
				{location.type === "unit" && (
					<UnitBody projectId={projectId} unit={location} editable={canEdit} />
				)}
				{location.type === "common_area" && (
					<CommonAreaBody
						projectId={projectId}
						area={location}
						editable={canEdit}
					/>
				)}
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
		return (
			<LocationView
				key={location.data.id}
				project={project.data}
				location={location.data}
				structure={structure.data}
				from={from}
			/>
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
