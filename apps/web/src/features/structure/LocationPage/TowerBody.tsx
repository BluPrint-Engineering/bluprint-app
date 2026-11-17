import type {
	LocationDetail,
	ProjectSummary,
	StructureTower,
} from "@bluprint/shared";
import { Layers, ListPlus } from "lucide-react";
import { StateBlock } from "@/components/StateBlock";
import { Button } from "@/components/ui/button";
import {
	AddFloorsLink,
	NO_FLOORS_DESCRIPTION,
} from "../components/AddFloorsLink";
import { AddReservedRow } from "../components/AddReservedRow";
import { Facade, FacadeCard } from "../components/Facade";
import { LocationList } from "../components/LocationList";
import { LocationMenu } from "../components/LocationMenu";
import type { Adding } from "../components/useAdding";
import { NO_CHILDREN } from "../removeText";
import { DisciplinesCard } from "./DisciplinesCard";

export function TowerBody({
	project,
	location,
	tower,
	towerName,
	adding,
	canEdit,
}: {
	project: ProjectSummary;
	location: LocationDetail;
	tower: StructureTower;
	towerName: string | undefined;
	adding: Adding;
	canEdit: boolean;
}) {
	const projectId = project.id;
	const showAreas = canEdit || tower.commonAreas.length > 0;
	const areasList = showAreas && (
		<LocationList
			projectId={projectId}
			title="Áreas comuns da torre"
			items={tower.commonAreas.map((area) => ({
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
							scope: "tower",
							towerName,
						}}
					/>
				),
			}))}
			footer={
				canEdit && (
					<AddReservedRow
						project={project}
						adding={adding}
						kind="tower-area"
						type="common_area"
						parentId={tower.id}
						label="Adicionar área comum"
						suggestion=""
						scope="tower"
						towerName={towerName}
					/>
				)
			}
		/>
	);

	const side = (
		<div className="grid content-start gap-(--space-6)">
			<DisciplinesCard
				projectId={projectId}
				location={location}
				editable={canEdit}
			/>
			{areasList}
		</div>
	);

	if (tower.floors.length === 0) {
		return (
			<div className="grid gap-(--space-6)">
				<StateBlock
					icon={Layers}
					title={`A ${tower.name} ainda não tem andares`}
					description={
						canEdit
							? NO_FLOORS_DESCRIPTION
							: "Os andares aparecem aqui quando alguém da equipe adicionar."
					}
				>
					{canEdit && (
						<Button asChild size="lg" className="max-md:w-full">
							<AddFloorsLink projectId={projectId} towerId={tower.id}>
								<ListPlus className="size-5" aria-hidden="true" />
								Adicionar andares
							</AddFloorsLink>
						</Button>
					)}
				</StateBlock>
				{side}
			</div>
		);
	}

	return (
		<div className="grid gap-(--space-6) md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-(--space-8)">
			<section aria-label="Fachada" className="min-w-0">
				<FacadeCard>
					<Facade
						projectId={projectId}
						tower={tower}
						label={`Fachada da ${tower.name}`}
						from={tower.id}
					/>
				</FacadeCard>
			</section>
			{side}
		</div>
	);
}
