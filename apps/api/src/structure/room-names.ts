import type { RoomNameUsageRow } from "./typologies.repository";

interface RoomNameGroup {
	name: string;
	nameUses: number;
	nameOldestId: string;
	uses: number;
	oldestId: string;
}

export function rankRoomNames(rows: readonly RoomNameUsageRow[]): string[] {
	const groups = new Map<string, RoomNameGroup>();

	for (const row of rows) {
		const group = groups.get(row.key);

		if (!group) {
			groups.set(row.key, {
				name: row.name,
				nameUses: row.uses,
				nameOldestId: row.oldest_id,
				uses: row.uses,
				oldestId: row.oldest_id,
			});
			continue;
		}

		group.uses += row.uses;
		if (row.oldest_id < group.oldestId) group.oldestId = row.oldest_id;
		if (
			row.uses > group.nameUses ||
			(row.uses === group.nameUses && row.oldest_id < group.nameOldestId)
		) {
			group.name = row.name;
			group.nameUses = row.uses;
			group.nameOldestId = row.oldest_id;
		}
	}

	return [...groups.values()]
		.sort((a, b) => b.uses - a.uses || compare(a.oldestId, b.oldestId))
		.map(({ name }) => name);
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
