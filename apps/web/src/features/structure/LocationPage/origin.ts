import { locationParamsSchema } from "@bluprint/shared";

export const PROJECT_ORIGIN = "project";

export interface LocationSearch {
	from?: string;
}

export function readLocationSearch(
	search: Record<string, unknown>,
): LocationSearch {
	const { from } = search;
	const valid =
		typeof from === "string" &&
		(from === PROJECT_ORIGIN ||
			locationParamsSchema.shape.locationId.safeParse(from).success);
	return valid ? { from } : {};
}
