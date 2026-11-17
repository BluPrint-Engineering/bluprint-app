import type { LocationDetail } from "@bluprint/shared";
import { DisciplinesCard } from "./DisciplinesCard";
import { RoomsCard } from "./RoomsCard";
import { TypologyCard } from "./TypologyCard";

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
			<div className="grid content-start gap-(--space-6)">
				<TypologyCard
					projectId={projectId}
					location={area}
					holder="common_area"
					editable={editable}
				/>
				<DisciplinesCard
					projectId={projectId}
					location={area}
					editable={editable}
				/>
			</div>
			<RoomsCard projectId={projectId} location={area} editable={editable} />
		</div>
	);
}
