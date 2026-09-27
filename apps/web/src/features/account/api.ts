import { organizationSchema } from "@bluprint/shared";
import { queryOptions } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";

/**
 * The caller's organization and default role, only to switch interface on and off; the API still
 * authorizes. `null` for a person in no organization, such as a platform admin.
 */
export const organizationQueryOptions = queryOptions({
	queryKey: ["organization"],
	queryFn: async () => {
		try {
			return await apiFetch("/organization", organizationSchema);
		} catch (error) {
			if (
				error instanceof ApiError &&
				error.problem?.code === "ORGANIZATION_NOT_FOUND"
			)
				return null;
			throw error;
		}
	},
	staleTime: 5 * 60 * 1000,
});
