import {
	type CreateStructure,
	createStructureResultSchema,
	LOCATION_NAME_TAKEN,
	LOCATION_NOT_FOUND,
	locationDetailSchema,
	PROJECT_NOT_FOUND,
	projectUnitsBalanceSchema,
	type Structure,
	structureSchema,
} from "@bluprint/shared";
import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import { organizationUnitsQueryOptions } from "../account/api";
import {
	availableUnitsOf,
	isProjectDelivered,
	projectQueryOptions,
} from "../projects/api";

export function isNotFound(error: unknown) {
	return (
		error instanceof ApiError &&
		(error.problem?.code === PROJECT_NOT_FOUND ||
			error.problem?.code === LOCATION_NOT_FOUND)
	);
}

function retryUnlessNotFound(failures: number, error: unknown) {
	return !isNotFound(error) && failures < 3;
}

export function structureQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["structure", projectId],
		queryFn: () =>
			apiFetch(`/projects/${projectId}/structure`, structureSchema),
		retry: retryUnlessNotFound,
	});
}

export function isBlankStructure({ towers, commonAreas }: Structure) {
	return towers.length === 0 && commonAreas.length === 0;
}

export function locationQueryOptions(projectId: string, locationId: string) {
	return queryOptions({
		queryKey: ["structure", projectId, "location", locationId],
		queryFn: () =>
			apiFetch(
				`/projects/${projectId}/locations/${locationId}`,
				locationDetailSchema,
			),
		retry: retryUnlessNotFound,
	});
}

export function projectUnitsQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["structure", projectId, "units"],
		queryFn: () =>
			apiFetch(`/projects/${projectId}/units`, projectUnitsBalanceSchema),
		retry: retryUnlessNotFound,
	});
}

export function namesTakenOf(error: unknown): string[] | undefined {
	return error instanceof ApiError &&
		error.problem?.code === LOCATION_NAME_TAKEN
		? (error.problem.names ?? [])
		: undefined;
}

export function useCreateStructureMutation(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: CreateStructure) =>
			apiFetch(
				`/projects/${projectId}/structure`,
				createStructureResultSchema,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body),
				},
			),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["structure", projectId],
			});
			void queryClient.invalidateQueries({ queryKey: ["projects"] });
			void queryClient.invalidateQueries(organizationUnitsQueryOptions);
		},
		onError: (error) => {
			const available = availableUnitsOf(error);
			if (available !== undefined) {
				const { queryKey } = projectUnitsQueryOptions(projectId);
				queryClient.setQueryData(
					queryKey,
					(balance) =>
						balance && {
							...balance,
							used: balance.reserved - available,
							remaining: available,
						},
				);
				return queryClient.invalidateQueries({ queryKey });
			}
			if (isProjectDelivered(error)) {
				return queryClient.invalidateQueries({
					queryKey: projectQueryOptions(projectId).queryKey,
				});
			}
		},
	});
}
