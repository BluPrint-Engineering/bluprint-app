import { locationParamsSchema } from "@bluprint/shared";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { isProjectId } from "@/features/projects/api";
import { StructureWizardPage } from "@/features/structure";
import {
	isBlankStructure,
	structureQueryOptions,
} from "@/features/structure/api";
import {
	readStructureDraft,
	structureDraftKey,
} from "@/features/structure/StructureWizard/structureDraftStore";

interface WizardSearch {
	tower?: string;
}

export const Route = createFileRoute(
	"/_authenticated/projects/$projectId/structure/new",
)({
	validateSearch: ({ tower }: Record<string, unknown>): WizardSearch =>
		typeof tower === "string" &&
		locationParamsSchema.shape.locationId.safeParse(tower).success
			? { tower }
			: {},
	beforeLoad: async ({ context, params, search }) => {
		if (!isProjectId(params.projectId)) return;
		const structure = await context.queryClient
			.query({
				...structureQueryOptions(params.projectId),
				staleTime: 0,
				retry: false,
			})
			.catch(() => null);
		if (!structure) return;
		const adding = search.tower !== undefined;
		const ok = adding
			? structure.towers.some(({ id }) => id === search.tower)
			: isBlankStructure(structure);
		if (!ok) {
			const key = structureDraftKey(
				context.session.user.id,
				params.projectId,
				search.tower,
			);
			const draft = readStructureDraft(key);
			if (draft?.attempt) return;
			if (draft) {
				localStorage.removeItem(key);
				toast.info(
					adding
						? "A torre não existe mais. O rascunho foi descartado."
						: "Esta obra já tem estrutura. O rascunho foi descartado.",
				);
			}
			throw redirect({ to: "/projects/$projectId", params, replace: true });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { projectId } = Route.useParams();
	const { tower } = Route.useSearch();
	return <StructureWizardPage projectId={projectId} towerId={tower} />;
}
