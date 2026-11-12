export interface TypeRoom {
	id: string;
	name: string;
}

export interface RoomPlan {
	removedIds: string[];
	addedIds: string[];
	renamedIds: string[];
	reordered: boolean;
}

export function planRoomChanges(
	current: TypeRoom[],
	requested: TypeRoom[],
): RoomPlan {
	const currentById = new Map(current.map((entry) => [entry.id, entry]));
	const requestedIds = new Set(requested.map(({ id }) => id));

	const survivorsBefore = current
		.filter(({ id }) => requestedIds.has(id))
		.map(({ id }) => id);
	const survivorsAfter = requested
		.filter(({ id }) => currentById.has(id))
		.map(({ id }) => id);

	return {
		removedIds: current
			.filter(({ id }) => !requestedIds.has(id))
			.map(({ id }) => id),
		addedIds: requested
			.filter(({ id }) => !currentById.has(id))
			.map(({ id }) => id),
		renamedIds: requested
			.filter(({ id, name }) => {
				const before = currentById.get(id);
				return before !== undefined && before.name !== name;
			})
			.map(({ id }) => id),
		reordered: survivorsBefore.some(
			(id, index) => id !== survivorsAfter[index],
		),
	};
}
