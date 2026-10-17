import { planRoomChanges } from "./unit-type-room-plan";

const room = (id: string, name = id) => ({ id, name });

describe("planRoomChanges", () => {
	test("finds nothing to do for the same list", () => {
		expect(
			planRoomChanges([room("a"), room("b")], [room("a"), room("b")]),
		).toEqual({
			removedIds: [],
			addedIds: [],
			renamedIds: [],
			reordered: false,
		});
	});

	test("tells added, removed and renamed rooms apart", () => {
		const plan = planRoomChanges(
			[room("a", "Sala"), room("b", "Cozinha"), room("c", "Sacada")],
			[room("a", "Estar"), room("c", "Sacada"), room("d", "Lavanderia")],
		);

		expect(plan).toEqual({
			removedIds: ["b"],
			addedIds: ["d"],
			renamedIds: ["a"],
			reordered: false,
		});
	});

	test("sees a new order of the rooms that stay", () => {
		expect(
			planRoomChanges([room("a"), room("b")], [room("b"), room("a")]).reordered,
		).toBe(true);
	});

	test("does not count a room added in the middle as a new order", () => {
		expect(
			planRoomChanges([room("a"), room("b")], [room("a"), room("c"), room("b")])
				.reordered,
		).toBe(false);
	});

	test("does not count a removed room as a new order", () => {
		expect(
			planRoomChanges([room("a"), room("b"), room("c")], [room("a"), room("c")])
				.reordered,
		).toBe(false);
	});
});
