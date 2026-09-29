/** Browsers read `//host` and `/\host` as another origin (open redirect). */
export function internalPath(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	if (!value.startsWith("/")) return undefined;
	if (value.startsWith("//") || value.startsWith("/\\")) return undefined;
	return value;
}
