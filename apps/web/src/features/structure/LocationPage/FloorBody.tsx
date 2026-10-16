import type { LocationRef, StructureFloor } from "@bluprint/shared";
import {
	LocationList,
	type LocationListItem,
} from "../components/LocationList";
import { unitTypeLine } from "./unitTypeLine";

export function FloorBody({
	projectId,
	items,
	floor,
}: {
	projectId: string;
	items: LocationRef[];
	floor: StructureFloor | undefined;
}) {
	const units: LocationListItem[] = floor
		? floor.units.map((unit) => ({
				id: unit.id,
				name: unit.name,
				meta: unitTypeLine(unit),
			}))
		: items.filter((child) => child.type === "unit");
	const commonAreas = items.filter((child) => child.type === "common_area");

	return (
		<div className="grid gap-(--space-6) md:grid-cols-2 md:items-start md:gap-(--space-8)">
			<LocationList
				projectId={projectId}
				title="Unidades"
				items={units}
				mono
				empty="Nenhuma unidade neste andar."
			/>
			{commonAreas.length > 0 && (
				<LocationList
					projectId={projectId}
					title="Áreas comuns do andar"
					items={commonAreas}
				/>
			)}
		</div>
	);
}
