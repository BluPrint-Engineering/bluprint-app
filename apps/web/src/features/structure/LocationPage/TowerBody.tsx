import type { StructureTower } from "@bluprint/shared";
import { Layers } from "lucide-react";
import { StateBlock } from "@/components/StateBlock";
import { AddRow } from "../components/AddRow";
import { Facade, FacadeCard } from "../components/Facade";
import { LocationList } from "../components/LocationList";
import { LocationMenu } from "../components/LocationMenu";
import type { Adding } from "../components/useAdding";
import { NO_CHILDREN } from "../removeText";

export function TowerBody({
	projectId,
	tower,
	towerName,
	adding,
	canEdit,
}: {
	projectId: string;
	tower: StructureTower;
	towerName: string | undefined;
	adding: Adding;
	canEdit: boolean;
}) {
	const showAreas = canEdit || tower.commonAreas.length > 0;
	const areas = showAreas && (
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
					<AddRow
						projectId={projectId}
						adding={adding}
						kind="tower-area"
						type="common_area"
						parentId={tower.id}
						position={tower.floors.length + tower.commonAreas.length}
						label="Adicionar área comum"
						suggestion=""
						scope="tower"
						towerName={towerName}
					/>
				)
			}
		/>
	);

	if (tower.floors.length === 0) {
		return (
			<div className="grid gap-(--space-6)">
				<StateBlock
					icon={Layers}
					title={`A ${tower.name} ainda não tem andares`}
					description="Os andares aparecem aqui quando alguém da equipe adicionar."
				/>
				{areas}
			</div>
		);
	}

	return (
		<div
			className={
				showAreas
					? "grid gap-(--space-6) md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-(--space-8)"
					: "grid gap-(--space-6)"
			}
		>
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
			{areas}
		</div>
	);
}
