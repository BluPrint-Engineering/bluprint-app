import { createFileRoute } from "@tanstack/react-router";
import { ProjectPage } from "@/features/projects";

export const Route = createFileRoute("/_authenticated/projects/$projectId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { projectId } = Route.useParams();
	return <ProjectPage projectId={projectId} />;
}
