import type {
	ProjectSummary,
	Structure,
	StructureCommonArea,
	StructureTower,
} from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Layers, ListPlus } from "lucide-react";
import { LoadFailure } from "@/components/LoadFailure";
import { StateBlock } from "@/components/StateBlock";
import { Button } from "@/components/ui/button";
import { firstLoadState } from "@/lib/firstLoadState";
import { isBlankStructure, structureQueryOptions } from "../api";
import { Facade, FacadeCard, FacadeSkeleton } from "../components/Facade";
import { LocationList } from "../components/LocationList";
import { PROJECT_ORIGIN } from "../LocationPage/origin";
import { TowerCards } from "./TowerCards";

function SingleTower({
	projectId,
	tower,
	projectCommonAreas,
}: {
	projectId: string;
	tower: StructureTower;
	projectCommonAreas: StructureCommonArea[];
}) {
	const commonAreas = [...tower.commonAreas, ...projectCommonAreas];

	return (
		<div
			className={
				commonAreas.length > 0
					? "grid gap-(--space-6) md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-(--space-8)"
					: "grid gap-(--space-6)"
			}
		>
			<section className="grid min-w-0 content-start gap-(--space-3)">
				<h2 className="text-lg font-semibold tracking-tight">Fachada</h2>
				{tower.floors.length > 0 ? (
					<FacadeCard>
						<Facade
							projectId={projectId}
							tower={tower}
							label="Fachada"
							from={PROJECT_ORIGIN}
						/>
					</FacadeCard>
				) : (
					<StateBlock
						icon={Layers}
						title="A obra ainda não tem andares"
						description="Os andares aparecem aqui quando alguém da equipe adicionar."
					/>
				)}
			</section>
			{commonAreas.length > 0 && (
				<LocationList
					projectId={projectId}
					title="Áreas comuns"
					items={commonAreas}
				/>
			)}
		</div>
	);
}

function SeveralTowers({
	projectId,
	structure,
}: {
	projectId: string;
	structure: Structure;
}) {
	return (
		<div className="grid gap-(--space-6) md:gap-(--space-8)">
			{structure.towers.length > 0 && (
				<section className="grid gap-(--space-3)">
					<h2 className="text-lg font-semibold tracking-tight">Torres</h2>
					<TowerCards projectId={projectId} towers={structure.towers} />
				</section>
			)}
			{structure.commonAreas.length > 0 && (
				<LocationList
					projectId={projectId}
					title="Áreas comuns da obra"
					items={structure.commonAreas}
				/>
			)}
		</div>
	);
}

export function ProjectStructure({ project }: { project: ProjectSummary }) {
	const query = useQuery(structureQueryOptions(project.id));

	if (query.data) {
		const structure = query.data;
		if (isBlankStructure(structure)) {
			return project.status === "delivered" ? (
				<StateBlock
					icon={Layers}
					title="A obra ainda não tem estrutura"
					description="A estrutura aparece aqui quando alguém da equipe montar a obra."
				/>
			) : (
				<StateBlock
					icon={Layers}
					title="A obra ainda não tem estrutura"
					description="Monte torres, andares, unidades e áreas comuns de uma vez. Depois, tudo se ajusta na fachada."
				>
					<Button asChild size="lg" className="max-md:w-full">
						<Link
							to="/projects/$projectId/structure/new"
							params={{ projectId: project.id }}
						>
							<ListPlus className="size-5" aria-hidden="true" />
							Montar estrutura
						</Link>
					</Button>
				</StateBlock>
			);
		}

		const [onlyTower] = structure.towers;
		return structure.towers.length === 1 && onlyTower ? (
			<SingleTower
				projectId={project.id}
				tower={onlyTower}
				projectCommonAreas={structure.commonAreas}
			/>
		) : (
			<SeveralTowers projectId={project.id} structure={structure} />
		);
	}

	const state = firstLoadState(query);
	return state === "loading" ? (
		<FacadeSkeleton />
	) : (
		<LoadFailure
			state={state}
			title="Não foi possível carregar a obra"
			onRetry={() => query.refetch()}
		/>
	);
}
