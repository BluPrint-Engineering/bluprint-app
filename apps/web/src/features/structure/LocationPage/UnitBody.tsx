import type { LocationDetail } from "@bluprint/shared";
import { DisciplinesCard } from "./DisciplinesCard";
import { RoomsCard } from "./RoomsCard";
import { TypologyCard } from "./TypologyCard";

export function UnitBody({
	projectId,
	unit,
	editable,
}: {
	projectId: string;
	unit: LocationDetail;
	editable: boolean;
}) {
	return (
		<div className="grid gap-(--space-6) md:grid-cols-[320px_minmax(0,1fr)] md:items-start md:gap-(--space-8)">
			<div className="grid content-start gap-(--space-6)">
				<TypologyCard
					projectId={projectId}
					location={unit}
					holder="unit"
					editable={editable}
				/>
				<DisciplinesCard
					projectId={projectId}
					location={unit}
					editable={editable}
				/>
			</div>
			<RoomsCard projectId={projectId} location={unit} editable={editable} />
		</div>
	);
}
