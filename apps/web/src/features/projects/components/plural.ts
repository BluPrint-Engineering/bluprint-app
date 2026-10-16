export function plural(count: number, one: string, many: string) {
	return count === 1 ? one : many;
}
