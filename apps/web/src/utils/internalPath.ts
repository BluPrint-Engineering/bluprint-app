/**
 * Returns `value` only when it is a path on this origin. `//host` and `/\host` are read by browsers
 * as another origin, so they and anything not starting with `/` are refused (open redirect).
 */
export function internalPath(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	if (!value.startsWith("/")) return undefined;
	if (value.startsWith("//") || value.startsWith("/\\")) return undefined;
	return value;
}
