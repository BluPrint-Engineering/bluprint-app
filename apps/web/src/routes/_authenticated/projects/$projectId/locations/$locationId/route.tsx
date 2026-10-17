import { createFileRoute } from "@tanstack/react-router";
import {
	LocationPage,
	type LocationSearch,
	readLocationSearch,
} from "@/features/structure";

export const Route = createFileRoute(
	"/_authenticated/projects/$projectId/locations/$locationId",
)({
	validateSearch: (search): LocationSearch => readLocationSearch(search),
	component: RouteComponent,
});

function RouteComponent() {
	const { projectId, locationId } = Route.useParams();
	const { from } = Route.useSearch();
	return (
		<LocationPage projectId={projectId} locationId={locationId} from={from} />
	);
}
