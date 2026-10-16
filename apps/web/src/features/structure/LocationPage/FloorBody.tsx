import type { StructureFloor } from "@bluprint/shared";
import { LocationList } from "../components/LocationList";
import { unitTypeLine } from "./unitTypeLine";

export function FloorBody({
	projectId,
	floor,
}: {
	projectId: string;
	floor: StructureFloor;
}) {
	const units = floor.units.map((unit) => ({
		id: unit.id,
		name: unit.name,
		meta: unitTypeLine(unit),
	}));

	return (
		<div className="grid gap-(--space-6) md:grid-cols-2 md:items-start md:gap-(--space-8)">
			<LocationList
				projectId={projectId}
				title="Unidades"
				items={units}
				mono
				empty="Nenhuma unidade neste andar."
			/>
			{floor.commonAreas.length > 0 && (
				<LocationList
					projectId={projectId}
					title="Áreas comuns do andar"
					items={floor.commonAreas}
				/>
			)}
		</div>
	);
}
