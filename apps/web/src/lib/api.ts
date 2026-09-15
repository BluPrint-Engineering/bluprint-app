import { type ProblemDetails, problemDetailsSchema } from "@bluprint/shared";

const API_PREFIX = "/api";

/** `problem` is undefined when something in front of the API (a proxy, a gateway) answered instead. */
export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly problem: ProblemDetails | undefined,
	) {
		super(
			problem?.detail ??
				problem?.title ??
				`Request failed with status ${status}`,
		);
	}
}

export async function apiFetch<T>(
	path: string,
	schema: { parse: (data: unknown) => T },
	init?: RequestInit,
): Promise<T> {
	const res = await fetch(`${API_PREFIX}${path}`, init);

	if (!res.ok) {
		const body: unknown = await res.json().catch(() => undefined);
		throw new ApiError(res.status, problemDetailsSchema.safeParse(body).data);
	}

	return schema.parse(await res.json());
}
