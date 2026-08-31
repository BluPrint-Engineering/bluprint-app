const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {}

export async function apiFetch<T>(
	path: string,
	schema: { parse: (data: unknown) => T },
	init?: RequestInit,
): Promise<T> {
	const res = await fetch(`${API_URL}${path}`, init);

	if (!res.ok) {
		throw new ApiError(`Request to ${path} failed with status ${res.status}`);
	}

	return schema.parse(await res.json());
}
