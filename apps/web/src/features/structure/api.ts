import {
	type AddRoom,
	type CreateStructure,
	type CreateUnitType,
	createStructureResultSchema,
	LOCATION_NAME_TAKEN,
	LOCATION_NOT_FOUND,
	type LocationDetail,
	locationDetailSchema,
	PROJECT_NOT_FOUND,
	projectUnitsBalanceSchema,
	ROOM_NAME_TAKEN,
	ROOM_NOT_FOUND,
	type Structure,
	structureSchema,
	UNIT_TYPE_IN_USE,
	UNIT_TYPE_NAME_TAKEN,
	type UpdateUnitType,
	unitTypeListSchema,
	unitTypeSchema,
	updateUnitTypeResultSchema,
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

export function unitTypeNamesTakenOf(error: unknown): string[] | undefined {
	return error instanceof ApiError &&
		error.problem?.code === UNIT_TYPE_NAME_TAKEN
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

export function unitTypesQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["structure", projectId, "unit-types"],
		queryFn: () =>
			apiFetch(`/projects/${projectId}/unit-types`, unitTypeListSchema),
		retry: retryUnlessNotFound,
	});
}

export function isUnitTypeInUse(error: unknown) {
	return error instanceof ApiError && error.problem?.code === UNIT_TYPE_IN_USE;
}

export function roomNamesTakenOf(error: unknown): string[] | undefined {
	return error instanceof ApiError && error.problem?.code === ROOM_NAME_TAKEN
		? (error.problem.names ?? [])
		: undefined;
}

export function isRoomNameTaken(error: unknown) {
	return error instanceof ApiError && error.problem?.code === ROOM_NAME_TAKEN;
}

export function isRoomGone(error: unknown) {
	return (
		error instanceof ApiError &&
		(error.problem?.code === ROOM_NOT_FOUND ||
			error.problem?.code === LOCATION_NOT_FOUND)
	);
}

const JSON_HEADERS = { "content-type": "application/json" };

function useLocationMutation<Variables>(
	projectId: string,
	locationId: string,
	send: (variables: Variables) => Promise<LocationDetail>,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: send,
		onSuccess: (detail) => {
			queryClient.setQueryData(
				locationQueryOptions(projectId, locationId).queryKey,
				detail,
			);
			void queryClient.invalidateQueries({
				queryKey: structureQueryOptions(projectId).queryKey,
				exact: true,
			});
			void queryClient.invalidateQueries({
				queryKey: unitTypesQueryOptions(projectId).queryKey,
			});
			void queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
		onError: (error) => {
			if (isProjectDelivered(error)) {
				return queryClient.invalidateQueries({
					queryKey: projectQueryOptions(projectId).queryKey,
				});
			}
			if (isRoomGone(error)) {
				return queryClient.invalidateQueries({
					queryKey: locationQueryOptions(projectId, locationId).queryKey,
				});
			}
		},
	});
}

export function useAddRoomMutation(projectId: string, locationId: string) {
	return useLocationMutation(projectId, locationId, (body: AddRoom) =>
		apiFetch(
			`/projects/${projectId}/locations/${locationId}/rooms`,
			locationDetailSchema,
			{ method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) },
		),
	);
}

export function useRenameRoomMutation(projectId: string, locationId: string) {
	return useLocationMutation(
		projectId,
		locationId,
		({ roomId, name }: { roomId: string; name: string }) =>
			apiFetch(`/projects/${projectId}/rooms/${roomId}`, locationDetailSchema, {
				method: "PATCH",
				headers: JSON_HEADERS,
				body: JSON.stringify({ name }),
			}),
	);
}

export function useRemoveRoomMutation(projectId: string, locationId: string) {
	return useLocationMutation(projectId, locationId, (roomId: string) =>
		apiFetch(`/projects/${projectId}/rooms/${roomId}`, locationDetailSchema, {
			method: "DELETE",
		}),
	);
}

export function useGiveRoomBackMutation(projectId: string, unitId: string) {
	return useLocationMutation(projectId, unitId, (unitTypeRoomId: string) =>
		apiFetch(
			`/projects/${projectId}/locations/${unitId}/dropped-rooms/${unitTypeRoomId}`,
			locationDetailSchema,
			{ method: "DELETE" },
		),
	);
}

export function useChangeUnitTypeMutation(projectId: string, unitId: string) {
	return useLocationMutation(projectId, unitId, (unitTypeId: string | null) =>
		apiFetch(
			`/projects/${projectId}/locations/${unitId}/unit-type`,
			locationDetailSchema,
			{
				method: "PUT",
				headers: JSON_HEADERS,
				body: JSON.stringify({ unitTypeId }),
			},
		),
	);
}

export function useResetUnitTypeMutation(projectId: string, unitId: string) {
	return useLocationMutation(projectId, unitId, () =>
		apiFetch(
			`/projects/${projectId}/locations/${unitId}/unit-type/reset`,
			locationDetailSchema,
			{ method: "POST" },
		),
	);
}

function useUnitTypeMutation<Variables, Result>(
	projectId: string,
	send: (variables: Variables) => Promise<Result>,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: send,
		onSettled: () =>
			Promise.all([
				queryClient.invalidateQueries({
					queryKey: structureQueryOptions(projectId).queryKey,
				}),
				queryClient.invalidateQueries({ queryKey: ["projects"] }),
			]),
		onError: (error) => {
			if (isProjectDelivered(error)) {
				return queryClient.invalidateQueries({
					queryKey: projectQueryOptions(projectId).queryKey,
				});
			}
		},
	});
}

export function useCreateUnitTypeMutation(projectId: string) {
	return useUnitTypeMutation(projectId, (body: CreateUnitType) =>
		apiFetch(`/projects/${projectId}/unit-types`, unitTypeSchema, {
			method: "POST",
			headers: JSON_HEADERS,
			body: JSON.stringify(body),
		}),
	);
}

export function useUpdateUnitTypeMutation(projectId: string) {
	return useUnitTypeMutation(
		projectId,
		({ unitTypeId, ...body }: { unitTypeId: string } & UpdateUnitType) =>
			apiFetch(
				`/projects/${projectId}/unit-types/${unitTypeId}`,
				updateUnitTypeResultSchema,
				{
					method: "PATCH",
					headers: JSON_HEADERS,
					body: JSON.stringify(body),
				},
			),
	);
}

export function useDeleteUnitTypeMutation(projectId: string) {
	return useUnitTypeMutation(projectId, (unitTypeId: string) =>
		apiFetch(
			`/projects/${projectId}/unit-types/${unitTypeId}`,
			unitTypeListSchema,
			{ method: "DELETE" },
		),
	);
}
