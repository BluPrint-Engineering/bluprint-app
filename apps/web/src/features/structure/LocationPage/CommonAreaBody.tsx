import type { LocationDetail } from "@bluprint/shared";
import { RoomsCard } from "./RoomsCard";

export function CommonAreaBody({ area }: { area: LocationDetail }) {
	return (
		<div className="md:max-w-160">
			<RoomsCard rooms={area.rooms} />
		</div>
	);
}
