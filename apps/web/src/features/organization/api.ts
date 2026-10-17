import {
	NO_UNITS_LEFT,
	organizationReservationsSchema,
	PROJECT_DELIVERED,
	RESERVATION_BELOW_USED,
	type UpdateReservations,
} from "@bluprint/shared";
import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import { organizationUnitsQueryOptions } from "../account/api";

export const organizationReservationsQueryOptions = queryOptions({
	queryKey: ["organization", "reservations"],
	queryFn: () =>
		apiFetch(
			"/organization/units/reservations",
			organizationReservationsSchema,
		),
	staleTime: 0,
});

export function belowUsedOf(error: unknown) {
	return error instanceof ApiError &&
		error.problem?.code === RESERVATION_BELOW_USED
		? error.problem.items
		: undefined;
}

export function overContractedBy(error: unknown) {
	if (!(error instanceof ApiError) || error.problem?.code !== NO_UNITS_LEFT) {
		return undefined;
	}
	const { requested, available } = error.problem;
	return requested === undefined || available === undefined
		? undefined
		: requested - available;
}

export function deliveredMeanwhile(error: unknown) {
	return error instanceof ApiError && error.problem?.code === PROJECT_DELIVERED
		? { projectId: error.problem.projectId }
		: undefined;
}

export function useUpdateReservationsMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: UpdateReservations) =>
			apiFetch(
				"/organization/units/reservations",
				organizationReservationsSchema,
				{
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body),
				},
			),
		onSuccess: (saved) => {
			queryClient.setQueryData(
				organizationReservationsQueryOptions.queryKey,
				saved,
			);
			void queryClient.invalidateQueries({ queryKey: ["projects"] });
			return queryClient.invalidateQueries(organizationUnitsQueryOptions);
		},
		onError: (error) => {
			const below = belowUsedOf(error);
			if (below) {
				queryClient.setQueryData(
					organizationReservationsQueryOptions.queryKey,
					(old) =>
						old && {
							...old,
							items: old.items.map((row) => {
								const refused = below.find(
									({ projectId }) => projectId === row.projectId,
								);
								return refused ? { ...row, used: refused.used } : row;
							}),
						},
				);
			}
			if (deliveredMeanwhile(error) || below) {
				return queryClient.invalidateQueries(
					organizationReservationsQueryOptions,
				);
			}
			if (overContractedBy(error) !== undefined) {
				return queryClient.invalidateQueries(organizationUnitsQueryOptions);
			}
		},
	});
}
