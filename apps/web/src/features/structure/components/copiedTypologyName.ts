import { sameRoomName, TYPOLOGY_NAME_MAX_LENGTH } from "@bluprint/shared";

function candidate(original: string, attempt: number): string {
	const suffix = attempt === 1 ? " (cópia)" : ` (cópia ${attempt})`;
	const room = TYPOLOGY_NAME_MAX_LENGTH - suffix.length;
	return `${original.slice(0, room).trimEnd()}${suffix}`;
}

export function copiedTypologyName(
	original: string,
	taken: readonly string[],
): string {
	for (let attempt = 1; ; attempt++) {
		const name = candidate(original, attempt);
		if (!taken.some((each) => sameRoomName(each, name))) return name;
	}
}
