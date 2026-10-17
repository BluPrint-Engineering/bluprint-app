import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import { ProjectConfigurationPage } from "@/features/projects";

declare module "@tanstack/react-router" {
	interface HistoryState {
		reservationOpenedHere?: true;
	}
}

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
	const router = useRouter();
	const onReservationOpenChange = useCallback(
		(open: boolean) => {
			if (open) {
				void navigate({
					search: { reserva: "alterar" },
					state: { reservationOpenedHere: true },
					resetScroll: false,
				});
			} else if (router.state.location.state.reservationOpenedHere) {
				router.history.back();
			} else {
				void navigate({ search: {}, replace: true, resetScroll: false });
			}
		},
		[navigate, router],
	);

	return (
		<ProjectConfigurationPage
			projectId={projectId}
			reservationOpen={reserva === "alterar"}
			onReservationOpenChange={onReservationOpenChange}
		/>
	);
}
