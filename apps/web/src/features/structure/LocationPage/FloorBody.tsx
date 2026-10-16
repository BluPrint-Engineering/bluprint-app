import type { LocationRef } from "@bluprint/shared";
import { LocationList } from "../components/LocationList";

export function FloorBody({
	projectId,
	items,
}: {
	projectId: string;
	items: LocationRef[];
}) {
	const units = items.filter((child) => child.type === "unit");
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
