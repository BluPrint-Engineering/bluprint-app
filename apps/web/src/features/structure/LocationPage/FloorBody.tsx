import type {
	ProjectSummary,
	StructureFloor,
	StructureTower,
} from "@bluprint/shared";
import { AddRow } from "../components/AddRow";
import { AddUnitRow } from "../components/AddUnitRow";
import { LocationList } from "../components/LocationList";
import { LocationMenu } from "../components/LocationMenu";
import type { Adding } from "../components/useAdding";
import { nextUnitName } from "../naming";
import { NO_CHILDREN } from "../removeText";
import { unitTypeLine } from "./unitTypeLine";

export function FloorBody({
	project,
	tower,
	floor,
	towerName,
	adding,
	canEdit,
}: {
	project: ProjectSummary;
	tower: StructureTower;
	floor: StructureFloor;
	towerName: string | undefined;
	adding: Adding;
	canEdit: boolean;
}) {
	const projectId = project.id;
	const units = floor.units.map((unit) => ({
		id: unit.id,
		name: unit.name,
		meta: unitTypeLine(unit),
		menu: canEdit && (
			<LocationMenu
				projectId={projectId}
				label={`Ações da unidade ${unit.name}`}
				duplicate={{ type: "unit", id: unit.id }}
				movable
				removal={{ counts: NO_CHILDREN }}
				target={{
					id: unit.id,
					type: "unit",
					name: unit.name,
					scope: "tower",
					towerName,
				}}
			/>
		),
	}));
	const areas = floor.commonAreas.map((area) => ({
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
					scope: "floor",
				}}
			/>
		),
	}));

	return (
		<div className="grid gap-(--space-6) md:grid-cols-2 md:items-start md:gap-(--space-8)">
			<LocationList
				projectId={projectId}
				title="Unidades"
				items={units}
				mono
				empty="Nenhuma unidade neste andar."
				footer={
					canEdit && (
						<AddUnitRow
							project={project}
							adding={adding}
							parentId={floor.id}
							towerName={towerName}
							suggestion={nextUnitName(
								floor.name,
								floor.units.map((unit) => unit.name),
								tower.floors.flatMap((each) =>
									each.units.map((unit) => unit.name),
								),
							)}
						/>
					)
				}
			/>
			{(canEdit || areas.length > 0) && (
				<LocationList
					projectId={projectId}
					title="Áreas comuns do andar"
					items={areas}
					footer={
						canEdit && (
							<AddRow
								projectId={projectId}
								adding={adding}
								kind="floor-area"
								type="common_area"
								parentId={floor.id}
								label="Adicionar área comum"
								suggestion=""
								scope="floor"
							/>
						)
					}
				/>
			)}
		</div>
	);
}
