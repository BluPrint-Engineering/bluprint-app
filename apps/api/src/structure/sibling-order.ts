import type { MoveDirection } from "@bluprint/shared";
import type { SiblingRow } from "./location-row";

export interface PositionChange {
	id: string;
	position: number;
}

export interface Insertion {
	id: string;
	position?: number | undefined;
}

export function planMove(
	siblings: readonly SiblingRow[],
	id: string,
	direction: MoveDirection,
): PositionChange[] {
	const index = siblings.findIndex((sibling) => sibling.id === id);
	const moved = siblings[index];
	if (!moved) return [];

	const towardsEarlier = (direction === "up") !== (moved.type === "floor");
	const step = towardsEarlier ? -1 : 1;
	let neighbour = index + step;
	while (siblings[neighbour] && siblings[neighbour]?.type !== moved.type) {
		neighbour += step;
	}
	const other = siblings[neighbour];
	if (!other) return [];

	return [
		{ id: moved.id, position: other.position },
		{ id: other.id, position: moved.position },
	];
}

export function planInsertion<T extends Insertion>(
	siblings: readonly PositionChange[],
	inserted: readonly T[],
): { shifted: PositionChange[]; placed: (T & { position: number })[] } {
	const taken = siblings.map((sibling) => ({ ...sibling }));
	const shifted = new Map<string, number>();
	const placed: (T & { position: number })[] = [];
	const place = (entry: T, position: number) => {
		if (taken.some((each) => each.position === position)) {
			for (const each of taken) {
				if (each.position < position) continue;
				each.position += 1;
				shifted.set(each.id, each.position);
			}
		}
		const at = { ...entry, position };
		taken.push(at);
		placed.push(at);
	};

	const explicit = inserted
		.flatMap((entry) =>
			entry.position === undefined ? [] : [{ entry, position: entry.position }],
		)
		.sort((left, right) => left.position - right.position);
	let earliest = 0;
	for (const { entry, position } of explicit) {
		const at = Math.max(position, earliest);
		place(entry, at);
		earliest = at + 1;
	}
	for (const entry of inserted) {
		if (entry.position !== undefined) continue;
		place(
			entry,
			taken.reduce((end, each) => Math.max(end, each.position + 1), 0),
		);
	}

	const insertedIds = new Set(inserted.map(({ id }) => id));
	return {
		shifted: [...shifted]
			.filter(([id]) => !insertedIds.has(id))
			.map(([id, position]) => ({ id, position })),
		placed,
	};
}
