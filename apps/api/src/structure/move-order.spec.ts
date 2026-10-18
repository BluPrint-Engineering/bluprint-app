import type { SiblingRow } from "./location-row";
import { planMove } from "./move-order";

const sibling = (
	id: string,
	type: SiblingRow["type"],
	position: number,
): SiblingRow => ({ id, type, position });

const units = [
	sibling("a", "unit", 0),
	sibling("b", "unit", 1),
	sibling("c", "unit", 2),
];

const applied = (rows: SiblingRow[], changes: ReturnType<typeof planMove>) =>
	rows
		.map((row) => ({
			...row,
			position:
				changes.find(({ id }) => id === row.id)?.position ?? row.position,
		}))
		.sort((left, right) => left.position - right.position);

const apply = (rows: SiblingRow[], changes: ReturnType<typeof planMove>) =>
	applied(rows, changes).map(({ id }) => id);

describe("planMove", () => {
	it("moves a unit up by one place earlier in the list", () => {
		expect(apply(units, planMove(units, "b", "up"))).toEqual(["b", "a", "c"]);
	});

	it("moves a unit down by one place later in the list", () => {
		expect(apply(units, planMove(units, "b", "down"))).toEqual(["a", "c", "b"]);
	});

	it("moves a floor up towards the higher floors", () => {
		const floors = [
			sibling("1", "floor", 0),
			sibling("2", "floor", 1),
			sibling("3", "floor", 2),
		];

		expect(apply(floors, planMove(floors, "2", "up"))).toEqual(["1", "3", "2"]);
		expect(apply(floors, planMove(floors, "2", "down"))).toEqual([
			"2",
			"1",
			"3",
		]);
	});

	it("does nothing at the top and at the end", () => {
		expect(planMove(units, "a", "up")).toEqual([]);
		expect(planMove(units, "c", "down")).toEqual([]);
	});

	it("does nothing for a location that is not among the siblings", () => {
		expect(planMove(units, "z", "up")).toEqual([]);
	});

	it("swaps with the neighbour of its own kind, passing over other kinds", () => {
		const mixed = [
			sibling("a", "unit", 0),
			sibling("hall", "common_area", 1),
			sibling("b", "unit", 2),
		];

		expect(apply(mixed, planMove(mixed, "b", "up"))).toEqual([
			"b",
			"hall",
			"a",
		]);
	});

	it("writes distinct positions when removals left a tie or a gap", () => {
		const tied = [
			sibling("a", "unit", 1),
			sibling("b", "unit", 2),
			sibling("c", "unit", 2),
		];
		const moved = applied(tied, planMove(tied, "c", "up"));

		expect(moved.map(({ id }) => id)).toEqual(["a", "c", "b"]);
		expect(moved.map(({ position }) => position)).toEqual([0, 1, 2]);
	});
});
