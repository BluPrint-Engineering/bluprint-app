import {
	type AddRoom,
	type CreateStructure,
	type CreateStructureResult,
	type CreateTypology,
	createStructureResultSchema,
	LOCATION_NAME_TAKEN,
	LOCATION_NOT_FOUND,
	type LocationDetail,
	locationDetailSchema,
	locationRefSchema,
	type MoveDirection,
	PROJECT_NOT_FOUND,
	projectUnitsBalanceSchema,
	ROOM_NAME_TAKEN,
	ROOM_NOT_FOUND,
	removeLocationResultSchema,
	type Structure,
	type SubtreeRooms,
	structureSchema,
	subtreeRoomsSchema,
	TYPOLOGY_IN_USE,
	TYPOLOGY_NAME_TAKEN,
	typologyListSchema,
	typologySchema,
	type UpdateTypology,
	updateTypologyResultSchema,
} from "@bluprint/shared";
import {
	partialMatchKey,
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api";
import { organizationUnitsQueryOptions } from "../account/api";
import {
	availableUnitsOf,
	isProjectDelivered,
	projectQueryOptions,
} from "../projects/api";
import { moveFailedText } from "./removeText";

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

export function typologyNamesTakenOf(error: unknown): string[] | undefined {
	return error instanceof ApiError &&
		error.problem?.code === TYPOLOGY_NAME_TAKEN
		? (error.problem.names ?? [])
		: undefined;
}

function postStructure(projectId: string, body: CreateStructure) {
	return apiFetch(
		`/projects/${projectId}/structure`,
		createStructureResultSchema,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		},
	);
}

function useStructureCreation<Variables>(
	projectId: string,
	send: (variables: Variables) => Promise<CreateStructureResult>,
	kind?: "create-structure" | "duplicate-location",
) {
	const queryClient = useQueryClient();
	return useMutation({
		...(kind && { meta: { sessionDraft: kind } }),
		mutationFn: send,
		onSuccess: () => {
			const unitsKey = projectUnitsQueryOptions(projectId).queryKey;
			void queryClient.invalidateQueries({ queryKey: ["projects"] });
			void queryClient.invalidateQueries(organizationUnitsQueryOptions);
			void queryClient.invalidateQueries({ queryKey: unitsKey });
			return queryClient.invalidateQueries({
				queryKey: ["structure", projectId],
				predicate: ({ queryKey }) => !partialMatchKey(queryKey, unitsKey),
			});
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
			if (namesTakenOf(error) !== undefined) {
				return queryClient.invalidateQueries({
					queryKey: ["structure", projectId],
				});
			}
		},
	});
}

export function useCreateStructureMutation(projectId: string) {
	return useStructureCreation(
		projectId,
		(body: CreateStructure & { draft?: unknown }) => {
			const { draft: _draft, ...plan } = body;
			return postStructure(projectId, plan);
		},
		"create-structure",
	);
}

export function useRecreateStructureMutation(projectId: string) {
	return useStructureCreation(projectId, (body: CreateStructure) =>
		postStructure(projectId, body),
	);
}

export function subtreeRoomsQueryOptions(
	projectId: string,
	locationId: string,
) {
	return queryOptions({
		queryKey: ["structure", projectId, "location", locationId, "subtree-rooms"],
		queryFn: () =>
			apiFetch(
				`/projects/${projectId}/locations/${locationId}/subtree-rooms`,
				subtreeRoomsSchema,
			),
		staleTime: 0,
		retry: retryUnlessNotFound,
	});
}

export function useDuplicateLocationMutation(projectId: string) {
	const queryClient = useQueryClient();
	return useStructureCreation(
		projectId,
		async ({
			locationId,
			build,
		}: {
			locationId: string;
			name: string;
			build: (below: SubtreeRooms) => CreateStructure;
		}) => {
			const below = await queryClient.fetchQuery(
				subtreeRoomsQueryOptions(projectId, locationId),
			);
			return postStructure(projectId, build(below));
		},
		"duplicate-location",
	);
}

export function useRenameLocationMutation(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		meta: { sessionDraft: "rename-location" },
		mutationFn: ({ locationId, name }: { locationId: string; name: string }) =>
			apiFetch(
				`/projects/${projectId}/locations/${locationId}`,
				locationRefSchema,
				{
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name }),
				},
			),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["projects"] });
			return queryClient.invalidateQueries({
				queryKey: ["structure", projectId],
			});
		},
		onError: (error) => {
			if (isProjectDelivered(error)) {
				return queryClient.invalidateQueries({
					queryKey: projectQueryOptions(projectId).queryKey,
				});
			}
		},
	});
}

export function useMoveLocationMutation(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			locationId,
			direction,
		}: {
			locationId: string;
			direction: MoveDirection;
		}) =>
			apiFetch(
				`/projects/${projectId}/locations/${locationId}/move`,
				locationRefSchema,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ direction }),
				},
			),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["projects"] });
			return queryClient.invalidateQueries({
				queryKey: ["structure", projectId],
			});
		},
		onError: (error) => {
			if (isProjectDelivered(error)) {
				return queryClient.invalidateQueries({
					queryKey: projectQueryOptions(projectId).queryKey,
				});
			}
			toast.error(moveFailedText);
		},
	});
}

export function deleteLocation(projectId: string, locationId: string) {
	return apiFetch(
		`/projects/${projectId}/locations/${locationId}`,
		removeLocationResultSchema,
		{ method: "DELETE" },
	);
}

export function typologiesQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["structure", projectId, "typologies"],
		queryFn: () =>
			apiFetch(`/projects/${projectId}/typologies`, typologyListSchema),
		retry: retryUnlessNotFound,
	});
}

export function isTypologyInUse(error: unknown) {
	return error instanceof ApiError && error.problem?.code === TYPOLOGY_IN_USE;
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
	kind?: "add-room" | "rename-room" | "change-typology",
) {
	const queryClient = useQueryClient();
	return useMutation({
		...(kind && { meta: { sessionDraft: kind } }),
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
				queryKey: typologiesQueryOptions(projectId).queryKey,
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
	return useLocationMutation(
		projectId,
		locationId,
		(body: AddRoom) =>
			apiFetch(
				`/projects/${projectId}/locations/${locationId}/rooms`,
				locationDetailSchema,
				{
					method: "POST",
					headers: JSON_HEADERS,
					body: JSON.stringify(body),
				},
			),
		"add-room",
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
		"rename-room",
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
	return useLocationMutation(projectId, unitId, (typologyRoomId: string) =>
		apiFetch(
			`/projects/${projectId}/locations/${unitId}/dropped-rooms/${typologyRoomId}`,
			locationDetailSchema,
			{ method: "DELETE" },
		),
	);
}

export function useChangeTypologyMutation(projectId: string, unitId: string) {
	return useLocationMutation(
		projectId,
		unitId,
		(typologyId: string | null) =>
			apiFetch(
				`/projects/${projectId}/locations/${unitId}/typology`,
				locationDetailSchema,
				{
					method: "PUT",
					headers: JSON_HEADERS,
					body: JSON.stringify({ typologyId }),
				},
			),
		"change-typology",
	);
}

export function useResetTypologyMutation(projectId: string, unitId: string) {
	return useLocationMutation(projectId, unitId, () =>
		apiFetch(
			`/projects/${projectId}/locations/${unitId}/typology/reset`,
			locationDetailSchema,
			{ method: "POST" },
		),
	);
}

function useTypologyMutation<Variables, Result>(
	projectId: string,
	send: (variables: Variables) => Promise<Result>,
	kind?: "create-typology" | "update-typology",
) {
	const queryClient = useQueryClient();
	return useMutation({
		...(kind && { meta: { sessionDraft: kind } }),
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

export function useCreateTypologyMutation(projectId: string) {
	return useTypologyMutation(
		projectId,
		(body: CreateTypology) =>
			apiFetch(`/projects/${projectId}/typologies`, typologySchema, {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify(body),
			}),
		"create-typology",
	);
}

export function useUpdateTypologyMutation(projectId: string) {
	return useTypologyMutation(
		projectId,
		({ typologyId, ...body }: { typologyId: string } & UpdateTypology) =>
			apiFetch(
				`/projects/${projectId}/typologies/${typologyId}`,
				updateTypologyResultSchema,
				{
					method: "PATCH",
					headers: JSON_HEADERS,
					body: JSON.stringify(body),
				},
			),
		"update-typology",
	);
}

export function useDeleteTypologyMutation(projectId: string) {
	return useTypologyMutation(projectId, (typologyId: string) =>
		apiFetch(
			`/projects/${projectId}/typologies/${typologyId}`,
			typologyListSchema,
			{ method: "DELETE" },
		),
	);
}
