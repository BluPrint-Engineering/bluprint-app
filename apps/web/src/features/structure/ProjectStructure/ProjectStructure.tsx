import type {
	ProjectSummary,
	Structure,
	StructureCommonArea,
	StructureTower,
} from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Building2, Layers, ListPlus, Plus } from "lucide-react";
import type { Ref } from "react";
import { LoadFailure } from "@/components/LoadFailure";
import { StateBlock } from "@/components/StateBlock";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { firstLoadState } from "@/lib/firstLoadState";
import { isBlankStructure, structureQueryOptions } from "../api";
import { AddRow } from "../components/AddRow";
import { Facade, FacadeCard, FacadeSkeleton } from "../components/Facade";
import { ListCard, ListRow, LocationList } from "../components/LocationList";
import { LocationMenu } from "../components/LocationMenu";
import {
	type Adding,
	useAdding,
	useFocusOnClose,
} from "../components/useAdding";
import { PROJECT_ORIGIN } from "../LocationPage/origin";
import { nextTowerName } from "../naming";
import { NO_CHILDREN } from "../removeText";
import { TowerCards } from "./TowerCards";

function AddMenu({
	adding,
	towerOpener,
}: {
	adding: Adding;
	towerOpener: Ref<HTMLButtonElement>;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button ref={towerOpener} variant="outline">
					<Plus className="size-4.5" aria-hidden="true" />
					Adicionar
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-60"
				onCloseAutoFocus={(event) => {
					if (adding.is("tower") || adding.is("project-area")) {
						event.preventDefault();
					}
				}}
			>
				<DropdownMenuItem onSelect={() => adding.open("tower")}>
					<Building2 className="size-4.5" aria-hidden="true" />
					Torre
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => adding.open("project-area")}>
					<Plus className="size-4.5" aria-hidden="true" />
					Área comum da obra
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function TowerForm({
	projectId,
	structure,
	adding,
}: {
	projectId: string;
	structure: Structure;
	adding: Adding;
}) {
	return (
		<ListCard>
			<ListRow>
				<AddRow
					projectId={projectId}
					adding={adding}
					kind="tower"
					type="tower"
					parentId={null}
					position={structure.towers.length + structure.commonAreas.length}
					label="Adicionar torre"
					fieldLabel="Nome da torre"
					suggestion={nextTowerName(structure.towers.map(({ name }) => name))}
					scope="project"
				/>
			</ListRow>
		</ListCard>
	);
}

function areaItems(
	projectId: string,
	areas: StructureCommonArea[],
	scope: "project" | "tower",
	canEdit: boolean,
) {
	return areas.map((area) => ({
		id: area.id,
		name: area.name,
		menu: canEdit && (
			<LocationMenu
				projectId={projectId}
				label={`Ações da área comum ${area.name}`}
				removal={{ counts: NO_CHILDREN }}
				target={{
					id: area.id,
					type: "common_area",
					name: area.name,
					scope,
				}}
			/>
		),
	}));
}

function ProjectAreas({
	projectId,
	structure,
	title,
	items,
	adding,
	canEdit,
}: {
	projectId: string;
	structure: Structure;
	title: string;
	items: ReturnType<typeof areaItems>;
	adding: Adding;
	canEdit: boolean;
}) {
	if (!canEdit && items.length === 0) return null;
	return (
		<LocationList
			projectId={projectId}
			title={title}
			items={items}
			footer={
				canEdit && (
					<AddRow
						projectId={projectId}
						adding={adding}
						kind="project-area"
						type="common_area"
						parentId={null}
						position={structure.towers.length + structure.commonAreas.length}
						label="Adicionar área comum"
						suggestion=""
						scope="project"
					/>
				)
			}
		/>
	);
}

function SingleTower({
	projectId,
	structure,
	tower,
	adding,
	towerOpener,
	canEdit,
}: {
	projectId: string;
	structure: Structure;
	tower: StructureTower;
	adding: Adding;
	towerOpener: Ref<HTMLButtonElement>;
	canEdit: boolean;
}) {
	const items = [
		...areaItems(projectId, tower.commonAreas, "tower", canEdit),
		...areaItems(projectId, structure.commonAreas, "project", canEdit),
	];
	const showAreas = canEdit || items.length > 0;

	return (
		<div
			className={
				showAreas
					? "grid gap-(--space-6) md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-(--space-8)"
					: "grid gap-(--space-6)"
			}
		>
			<section className="grid min-w-0 content-start gap-(--space-3)">
				<div className="flex items-center justify-between gap-(--space-3)">
					<h2 className="text-lg font-semibold tracking-tight">Fachada</h2>
					{canEdit && <AddMenu adding={adding} towerOpener={towerOpener} />}
				</div>
				{canEdit && adding.is("tower") && (
					<TowerForm
						projectId={projectId}
						structure={structure}
						adding={adding}
					/>
				)}
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
			<ProjectAreas
				projectId={projectId}
				structure={structure}
				title="Áreas comuns"
				items={items}
				adding={adding}
				canEdit={canEdit}
			/>
		</div>
	);
}

function SeveralTowers({
	projectId,
	structure,
	adding,
	towerOpener,
	canEdit,
}: {
	projectId: string;
	structure: Structure;
	adding: Adding;
	towerOpener: Ref<HTMLButtonElement>;
	canEdit: boolean;
}) {
	return (
		<div className="grid gap-(--space-6) md:gap-(--space-8)">
			{(canEdit || structure.towers.length > 0) && (
				<section className="grid gap-(--space-3)">
					<div className="flex items-center justify-between gap-(--space-3)">
						<h2 className="text-lg font-semibold tracking-tight">Torres</h2>
						{canEdit && <AddMenu adding={adding} towerOpener={towerOpener} />}
					</div>
					{structure.towers.length > 0 && (
						<TowerCards projectId={projectId} towers={structure.towers} />
					)}
					{canEdit && adding.is("tower") && (
						<TowerForm
							projectId={projectId}
							structure={structure}
							adding={adding}
						/>
					)}
				</section>
			)}
			<ProjectAreas
				projectId={projectId}
				structure={structure}
				title="Áreas comuns da obra"
				items={areaItems(projectId, structure.commonAreas, "project", canEdit)}
				adding={adding}
				canEdit={canEdit}
			/>
		</div>
	);
}

export function ProjectStructure({ project }: { project: ProjectSummary }) {
	const query = useQuery(structureQueryOptions(project.id));
	const adding = useAdding();
	const towerOpener = useFocusOnClose<HTMLButtonElement>(adding.is("tower"));
	const canEdit = project.status !== "delivered";

	if (query.data) {
		const structure = query.data;
		if (isBlankStructure(structure)) {
			return canEdit ? (
				<div className="grid gap-(--space-6)">
					<StateBlock
						icon={Layers}
						title="A obra ainda não tem estrutura"
						description="Monte torres, andares, unidades e áreas comuns de uma vez. Depois, tudo se ajusta na fachada."
					>
						<div className="grid w-full justify-items-center gap-(--space-2) md:w-auto">
							<Button asChild size="lg" className="max-md:w-full">
								<Link
									to="/projects/$projectId/structure/new"
									params={{ projectId: project.id }}
								>
									<ListPlus className="size-5" aria-hidden="true" />
									Montar estrutura
								</Link>
							</Button>
							{!adding.is("tower") && (
								<Button
									ref={towerOpener}
									variant="ghost"
									className="max-md:w-full"
									onClick={() => adding.open("tower")}
								>
									Adicionar uma torre por vez
								</Button>
							)}
						</div>
					</StateBlock>
					{adding.is("tower") && (
						<div className="mx-auto w-full max-w-(--content-max)">
							<TowerForm
								projectId={project.id}
								structure={structure}
								adding={adding}
							/>
						</div>
					)}
				</div>
			) : (
				<StateBlock
					icon={Layers}
					title="A obra ainda não tem estrutura"
					description="A estrutura aparece aqui quando alguém da equipe montar a obra."
				/>
			);
		}

		const [onlyTower] = structure.towers;
		return structure.towers.length === 1 && onlyTower ? (
			<SingleTower
				projectId={project.id}
				structure={structure}
				tower={onlyTower}
				adding={adding}
				towerOpener={towerOpener}
				canEdit={canEdit}
			/>
		) : (
			<SeveralTowers
				projectId={project.id}
				structure={structure}
				adding={adding}
				towerOpener={towerOpener}
				canEdit={canEdit}
			/>
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
