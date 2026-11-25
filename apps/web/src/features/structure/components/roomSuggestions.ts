import { comparableRoomName, tidyLocationName } from "@bluprint/shared";

export const SUGGESTED_ROOMS = [
	"Cozinha",
	"Sala",
	"Suíte",
	"Quarto",
	"Banheiro",
	"Lavabo",
	"Sacada",
	"Varanda",
] as const;

export const MAX_SUGGESTIONS_PER_GROUP = 6;

export type RoomSuggestionGroupId = "suggested" | "used" | "present";

export interface RoomSuggestionGroup {
	id: RoomSuggestionGroupId;
	names: string[];
}

export interface RoomSuggestions {
	groups: RoomSuggestionGroup[];
	add: string | undefined;
}

interface RoomSources {
	suggested: readonly string[];
	used: readonly string[];
	present: readonly string[];
}

function startsAWord(comparable: string, query: string) {
	return comparable.startsWith(query) || comparable.includes(` ${query}`);
}

function firstOfEach(names: readonly string[]) {
	const seen = new Set<string>();
	return names.filter((name) => {
		const key = comparableRoomName(name);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export function suggestRooms({
	typed,
	suggested,
	used,
	present,
}: RoomSources & { typed: string }): RoomSuggestions {
	const query = comparableRoomName(typed);
	if (query === "") return { groups: [], add: undefined };

	const presentKeys = new Set(present.map(comparableRoomName));
	const suggestedKeys = new Set(suggested.map(comparableRoomName));
	const matching = (names: readonly string[]) =>
		names.filter((name) => startsAWord(comparableRoomName(name), query));
	const notPresent = (name: string) =>
		!presentKeys.has(comparableRoomName(name));

	const candidates: RoomSuggestionGroup[] = [
		{ id: "suggested", names: matching(suggested).filter(notPresent) },
		{
			id: "used",
			names: matching(firstOfEach(used)).filter(
				(name) =>
					notPresent(name) && !suggestedKeys.has(comparableRoomName(name)),
			),
		},
		{ id: "present", names: matching(firstOfEach(present)) },
	];

	const known = new Set([
		...suggestedKeys,
		...used.map(comparableRoomName),
		...presentKeys,
	]);

	return {
		groups: candidates
			.filter(({ names }) => names.length > 0)
			.map(({ id, names }) => ({
				id,
				names: names.slice(0, MAX_SUGGESTIONS_PER_GROUP),
			})),
		add: known.has(query) ? undefined : tidyLocationName(typed),
	};
}

export function spellRoom({
	typed,
	suggested,
	used,
}: Omit<RoomSources, "present"> & { typed: string }): string {
	const key = comparableRoomName(typed);
	const known = [...suggested, ...used].find(
		(name) => comparableRoomName(name) === key,
	);
	return known ?? tidyLocationName(typed);
}
