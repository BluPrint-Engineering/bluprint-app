import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { ProjectConfigurationPage } from "@/features/projects";

interface ConfigurationSearch {
	reserva?: "alterar";
}

export const Route = createFileRoute(
	"/_authenticated/projects/$projectId/configuration",
)({
	validateSearch: (search): ConfigurationSearch =>
		search.reserva === "alterar" ? { reserva: "alterar" } : {},
	component: RouteComponent,
});

function RouteComponent() {
	const { projectId } = Route.useParams();
	const { reserva } = Route.useSearch();
	const navigate = Route.useNavigate();
	const onReservationOpenChange = useCallback(
		(open: boolean) =>
			navigate({
				search: open ? { reserva: "alterar" } : {},
				resetScroll: false,
			}),
		[navigate],
	);

	return (
		<ProjectConfigurationPage
			projectId={projectId}
			reservationOpen={reserva === "alterar"}
			onReservationOpenChange={onReservationOpenChange}
		/>
	);
}
