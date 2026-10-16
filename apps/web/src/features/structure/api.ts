import {
	LOCATION_NOT_FOUND,
	locationDetailSchema,
	PROJECT_NOT_FOUND,
	structureSchema,
} from "@bluprint/shared";
import { queryOptions } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";

function isNotFound(error: unknown) {
	return (
		error instanceof ApiError &&
		(error.problem?.code === PROJECT_NOT_FOUND ||
			error.problem?.code === LOCATION_NOT_FOUND)
	);
}

function retryUnlessNotFound(failures: number, error: unknown) {
	return !isNotFound(error) && failures < 3;
}

export function isLocationNotFound(error: unknown) {
	return isNotFound(error);
}

export function structureQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["structure", projectId],
		queryFn: () =>
			apiFetch(`/projects/${projectId}/structure`, structureSchema),
		retry: retryUnlessNotFound,
	});
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
