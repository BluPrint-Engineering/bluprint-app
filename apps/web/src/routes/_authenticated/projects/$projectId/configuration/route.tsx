import { createFileRoute } from "@tanstack/react-router";
import { ProjectConfigurationPage } from "@/features/projects";

export const Route = createFileRoute(
	"/_authenticated/projects/$projectId/configuration",
)({
	component: RouteComponent,
});

function RouteComponent() {
	const { projectId } = Route.useParams();
	return <ProjectConfigurationPage projectId={projectId} />;
}
