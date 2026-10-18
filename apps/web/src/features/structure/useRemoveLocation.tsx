import {
	type CreateStructure,
	LOCATION_NAME_TAKEN,
	type LocationDetail,
	type LocationType,
} from "@bluprint/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { organizationUnitsQueryOptions } from "../account/api";
import {
	availableUnitsOf,
	isProjectDelivered,
	projectQueryOptions,
} from "../projects/api";
import {
	deleteLocation,
	isNotFound,
	locationQueryOptions,
	structureQueryOptions,
	useCreateStructureMutation,
} from "./api";
import {
	removedText,
	removeFailedText,
	type UndoFailure,
	undoFailedText,
} from "./removeText";

export interface RemoveRequest {
	id: string;
	type: LocationType;
	name: string;
	undoable: boolean;
	afterRemoval?: (() => void | Promise<void>) | undefined;
}

function recreation(removed: LocationDetail): CreateStructure {
	const parentId = removed.ancestors.at(-1)?.id ?? null;
	const holdsRooms = removed.type === "unit" || removed.type === "common_area";
	const followsUnitType = removed.type === "unit" && removed.unitType !== null;

	return {
		unitTypes: [],
		locations: [
			{
				id: removed.id,
				parentId,
				type: removed.type,
				name: removed.name,
				position: removed.position,
				...(followsUnitType &&
					removed.unitType && { unitTypeId: removed.unitType.id }),
				...(holdsRooms && {
					rooms: removed.rooms.map(({ id, name, unitTypeRoomId, renamed }) => ({
						id,
						name,
						...(unitTypeRoomId !== null && { unitTypeRoomId }),
						...(renamed && { renamed }),
					})),
				}),
				...(followsUnitType && {
					droppedRooms: removed.droppedRooms.map(
						({ unitTypeRoomId }) => unitTypeRoomId,
					),
				}),
			},
		],
	};
}

function undoFailure(error: unknown): UndoFailure {
	if (availableUnitsOf(error) !== undefined) return "reserve";
	if (
		error instanceof ApiError &&
		error.problem?.code === LOCATION_NAME_TAKEN
	) {
		return "name";
	}
	return "other";
}

export function useRemoveLocation(projectId: string) {
	const queryClient = useQueryClient();
	const create = useCreateStructureMutation(projectId);

	async function undo({ type, name }: LocationDetail, body: CreateStructure) {
		try {
			await create.mutateAsync(body);
		} catch (error) {
			if (isProjectDelivered(error)) return;
			toast.error(undoFailedText(type, name, undoFailure(error)));
		}
	}

	return async function remove(request: RemoveRequest): Promise<void> {
		const { id, type, name } = request;
		try {
			const removed = request.undoable
				? await queryClient.fetchQuery({
						...locationQueryOptions(projectId, id),
						staleTime: 0,
					})
				: undefined;
			await deleteLocation(projectId, id);
			await request.afterRemoval?.();

			queryClient.removeQueries({
				queryKey: locationQueryOptions(projectId, id).queryKey,
			});
			void queryClient.invalidateQueries({ queryKey: ["projects"] });
			void queryClient.invalidateQueries(organizationUnitsQueryOptions);
			void queryClient.invalidateQueries({
				queryKey: structureQueryOptions(projectId).queryKey,
			});

			toast(
				removedText(type, name),
				removed && {
					action: {
						label: (
							<>
								<Undo2 className="size-4" aria-hidden="true" />
								Desfazer
							</>
						),
						onClick: () => void undo(removed, recreation(removed)),
					},
				},
			);
		} catch (error) {
			if (isProjectDelivered(error)) {
				void queryClient.invalidateQueries({
					queryKey: projectQueryOptions(projectId).queryKey,
				});
				return;
			}
			if (isNotFound(error)) {
				void queryClient.invalidateQueries({
					queryKey: structureQueryOptions(projectId).queryKey,
				});
				return;
			}
			toast.error(removeFailedText(type, name));
		}
	};
}
