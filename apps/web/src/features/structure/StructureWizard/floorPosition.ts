export interface StoredFloor {
	number: number | undefined;
	position: number;
}

export function positionsForNewFloors(
	stored: readonly StoredFloor[],
	newNumbers: readonly number[],
): Map<number, number> {
	const numbered = stored.filter(
		(floor): floor is { number: number; position: number } =>
			floor.number !== undefined,
	);
	const first = numbered[0];
	if (!first) return new Map();

	const lowest = numbered.reduce(
		(min, floor) => Math.min(min, floor.position),
		first.position,
	);
	const sorted = [...new Set(newNumbers)].sort((left, right) => left - right);
	const positions = new Map<number, number>();
	for (const [before, number] of sorted.entries()) {
		const reference = numbered.reduce<
			{ number: number; position: number } | undefined
		>(
			(highest, floor) =>
				floor.number < number &&
				(highest === undefined || floor.number > highest.number)
					? floor
					: highest,
			undefined,
		);
		const base =
			reference === undefined
				? lowest
				: (stored.reduce<number | undefined>(
						(next, floor) =>
							floor.position > reference.position &&
							(next === undefined || floor.position < next)
								? floor.position
								: next,
						undefined,
					) ?? reference.position + 1);
		positions.set(number, base + before);
	}
	return positions;
}
