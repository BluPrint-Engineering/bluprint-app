import type { MoveDirection } from "@bluprint/shared";
import type { SiblingRow } from "./location-row";

export interface PositionChange {
	id: string;
	position: number;
}

export function planCompaction(
	ordered: readonly PositionChange[],
): PositionChange[] {
	return ordered.flatMap(({ id, position: stored }, position) =>
		stored === position ? [] : [{ id, position }],
	);
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
	if (!siblings[neighbour]) return [];

	const reordered = [...siblings];
	[reordered[index], reordered[neighbour]] = [
		reordered[neighbour]!,
		reordered[index]!,
	];

	return planCompaction(reordered);
}

export function planInsertion(
	siblings: readonly PositionChange[],
	inserted: readonly PositionChange[],
): PositionChange[] {
	const ordered = [...siblings];
	const byPosition = [...inserted].sort(
		(left, right) => left.position - right.position,
	);
	let earliest = 0;
	for (const entry of byPosition) {
		const index = Math.max(Math.min(entry.position, ordered.length), earliest);
		ordered.splice(index, 0, entry);
		earliest = index + 1;
	}

	return planCompaction(ordered);
}
