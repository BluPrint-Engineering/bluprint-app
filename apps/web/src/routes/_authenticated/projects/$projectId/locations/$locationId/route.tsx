import { createFileRoute } from "@tanstack/react-router";
import { LocationPage } from "@/features/structure";

export const Route = createFileRoute(
	"/_authenticated/projects/$projectId/locations/$locationId",
)({
	component: RouteComponent,
});

function RouteComponent() {
	const { projectId, locationId } = Route.useParams();
	return <LocationPage projectId={projectId} locationId={locationId} />;
}
