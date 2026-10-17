import { createFileRoute } from "@tanstack/react-router";
import { StructureWizardPage } from "@/features/structure";

export const Route = createFileRoute(
	"/_authenticated/projects/$projectId/structure/new",
)({
	component: RouteComponent,
});

function RouteComponent() {
	const { projectId } = Route.useParams();
	return <StructureWizardPage projectId={projectId} />;
}
