import type { LocationDetail } from "@bluprint/shared";
import { DisciplinesCard } from "./DisciplinesCard";
import { RoomsCard } from "./RoomsCard";

export function CommonAreaBody({
	projectId,
	area,
	editable,
}: {
	projectId: string;
	area: LocationDetail;
	editable: boolean;
}) {
	return (
		<div className="grid gap-(--space-6) md:grid-cols-[320px_minmax(0,1fr)] md:items-start md:gap-(--space-8)">
			<DisciplinesCard
				projectId={projectId}
				location={area}
				editable={editable}
			/>
			<RoomsCard projectId={projectId} location={area} editable={editable} />
		</div>
	);
}
