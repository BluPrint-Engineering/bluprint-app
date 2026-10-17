import {
	type CreateProject,
	NO_UNITS_LEFT,
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	PROJECT_PAGE_SIZE,
	projectListSchema,
	projectManagersSchema,
	projectParamsSchema,
	projectSummarySchema,
	RESERVATION_BELOW_USED,
} from "@bluprint/shared";
import {
	infiniteQueryOptions,
	type Query,
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import { organizationUnitsQueryOptions } from "../account/api";
import type { ProjectsFilters } from "./filters";

function fetchProjectsPage(
	page: number,
	{ q, status, sort, manager }: ProjectsFilters,
	pageSize = PROJECT_PAGE_SIZE,
) {
	const params = new URLSearchParams({
		page: String(page),
		pageSize: String(pageSize),
		status,
		sort,
	});
	if (q) params.set("q", q);
	if (manager) params.set("manager", manager);
	return apiFetch(`/projects?${params}`, projectListSchema);
}

export function projectsQueryOptions(page: number, filters: ProjectsFilters) {
	return queryOptions({
		queryKey: ["projects", { page, pageSize: PROJECT_PAGE_SIZE, ...filters }],
		queryFn: async () => {
			const list = await fetchProjectsPage(page, filters);
			// tagged with its page: while the next page loads, the data on screen is still the previous one's
			return { ...list, page };
		},
	});
}

export function projectsInfiniteQueryOptions(filters: ProjectsFilters) {
	return infiniteQueryOptions({
		queryKey: [
			"projects",
			"infinite",
			{ pageSize: PROJECT_PAGE_SIZE, ...filters },
		],
		queryFn: ({ pageParam }) => fetchProjectsPage(pageParam, filters),
		initialPageParam: 1,
		getNextPageParam: (lastPage, pages, lastPageParam) => {
			const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
			// an empty page means the list shrank under us; asking for more would never end
			return lastPage.items.length > 0 && loaded < lastPage.total
				? lastPageParam + 1
				: undefined;
		},
	});
}

export function projectsTotalQueryOptions(filters: ProjectsFilters) {
	return queryOptions({
		queryKey: ["projects", "total", filters],
		queryFn: async () => (await fetchProjectsPage(1, filters, 1)).total,
	});
}

/** Only the admin may ask. */
export function projectManagersQueryOptions(enabled: boolean) {
	return queryOptions({
		queryKey: ["projects", "managers"],
		queryFn: () => apiFetch("/projects/managers", projectManagersSchema),
		enabled,
		staleTime: 60 * 1000,
	});
}

export function isProjectId(id: string) {
	return projectParamsSchema.safeParse({ id }).success;
}

export function isProjectNotFound(error: unknown) {
	return error instanceof ApiError && error.problem?.code === PROJECT_NOT_FOUND;
}

function retryUnlessNotFound(failures: number, error: unknown) {
	return !isProjectNotFound(error) && failures < 3;
}

export function projectQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["projects", "detail", id],
		queryFn: () => apiFetch(`/projects/${id}`, projectSummarySchema),
		retry: retryUnlessNotFound,
	});
}

export function isProjectDelivered(error: unknown) {
	return error instanceof ApiError && error.problem?.code === PROJECT_DELIVERED;
}

const isListQuery = (query: Query) => query.queryKey[1] !== "detail";

export function useRenameProjectMutation(projectId: string) {
	const queryClient = useQueryClient();
	const { queryKey } = projectQueryOptions(projectId);
	return useMutation({
		mutationFn: (name: string) =>
			apiFetch(`/projects/${projectId}`, projectSummarySchema, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name }),
			}),
		onSuccess: (renamed) => {
			queryClient.setQueryData(queryKey, renamed);
			return queryClient.invalidateQueries({
				queryKey: ["projects"],
				predicate: isListQuery,
			});
		},
		onError: (error) => {
			if (isProjectDelivered(error)) {
				return queryClient.invalidateQueries({ queryKey });
			}
		},
	});
}

export function availableUnitsOf(error: unknown) {
	return error instanceof ApiError && error.problem?.code === NO_UNITS_LEFT
		? error.problem.available
		: undefined;
}

export function usedUnitsOf(error: unknown) {
	return error instanceof ApiError &&
		error.problem?.code === RESERVATION_BELOW_USED
		? error.problem.used
		: undefined;
}

export function isReservationRefusal(error: unknown) {
	return (
		isProjectDelivered(error) ||
		usedUnitsOf(error) !== undefined ||
		availableUnitsOf(error) !== undefined
	);
}

export function useChangeReservationMutation(projectId: string) {
	const queryClient = useQueryClient();
	const { queryKey } = projectQueryOptions(projectId);
	return useMutation({
		mutationFn: (reserved: number) =>
			apiFetch(`/projects/${projectId}/units`, projectSummarySchema, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ reserved }),
			}),
		onSuccess: (changed) => {
			queryClient.setQueryData(queryKey, changed);
			void queryClient.invalidateQueries(organizationUnitsQueryOptions);
			return queryClient.invalidateQueries({
				queryKey: ["projects"],
				predicate: isListQuery,
			});
		},
		onError: (error) => {
			if (isReservationRefusal(error)) {
				void queryClient.invalidateQueries(organizationUnitsQueryOptions);
				return queryClient.invalidateQueries({ queryKey });
			}
		},
	});
}

export function useCreateProjectMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (project: CreateProject) =>
			apiFetch("/projects", projectSummarySchema, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(project),
			}),
		onSuccess: (created) => {
			queryClient.setQueryData(
				projectQueryOptions(created.id).queryKey,
				created,
			);
			void queryClient.invalidateQueries({
				queryKey: ["projects"],
				predicate: isListQuery,
				refetchType: "none",
			});
			const { reserved } = created.units;
			queryClient.setQueryData(
				organizationUnitsQueryOptions.queryKey,
				(units) =>
					units && {
						...units,
						reserved: units.reserved + reserved,
						free: units.free - reserved,
						reclaimable: units.reclaimable + reserved,
					},
			);
			void queryClient.invalidateQueries({
				...organizationUnitsQueryOptions,
				refetchType: "none",
			});
		},
	});
}
