import { createFileRoute, redirect } from "@tanstack/react-router";
import { isProjectId } from "@/features/projects/api";
import { StructureWizardPage } from "@/features/structure";
import {
	isBlankStructure,
	structureQueryOptions,
} from "@/features/structure/api";

export const Route = createFileRoute(
	"/_authenticated/projects/$projectId/structure/new",
)({
	beforeLoad: async ({ context, params }) => {
		if (!isProjectId(params.projectId)) return;
		const structure = await context.queryClient
			.query(structureQueryOptions(params.projectId))
			.catch(() => null);
		if (structure && !isBlankStructure(structure)) {
			throw redirect({ to: "/projects/$projectId", params, replace: true });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { projectId } = Route.useParams();
	return <StructureWizardPage projectId={projectId} />;
}
