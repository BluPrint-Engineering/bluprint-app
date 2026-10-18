import type { MoveDirection } from "@bluprint/shared";
import type { SiblingRow } from "./location-row";

export interface PositionChange {
	id: string;
	position: number;
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

	return reordered.flatMap(({ id: siblingId, position: stored }, position) =>
		stored === position ? [] : [{ id: siblingId, position }],
	);
}
