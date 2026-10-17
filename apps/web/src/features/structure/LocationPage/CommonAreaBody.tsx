import type { LocationDetail } from "@bluprint/shared";
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
		<div className="md:max-w-160">
			<RoomsCard projectId={projectId} location={area} editable={editable} />
		</div>
	);
}
