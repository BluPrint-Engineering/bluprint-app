import type { SiblingRow } from "./location-row";
import { planCompaction, planInsertion, planMove } from "./sibling-order";

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

	it("writes distinct positions over a tie or a gap", () => {
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

describe("planCompaction", () => {
	it("closes the gaps and keeps the order", () => {
		const gapped = [
			sibling("c", "unit", 2),
			sibling("hall", "common_area", 3),
			sibling("d", "unit", 5),
		];
		const compacted = applied(gapped, planCompaction(gapped));

		expect(compacted.map(({ id }) => id)).toEqual(["c", "hall", "d"]);
		expect(compacted.map(({ position }) => position)).toEqual([0, 1, 2]);
	});

	it("changes nothing in a list without gaps", () => {
		expect(planCompaction(units)).toEqual([]);
	});
});

describe("planInsertion", () => {
	const placed = (
		siblings: SiblingRow[],
		inserted: { id: string; position: number }[],
	) => {
		const rows = [
			...siblings,
			...inserted.map(({ id, position }) => sibling(id, "unit", position)),
		];
		return applied(rows, planInsertion(siblings, inserted)).map(
			({ id, position }) => `${position}:${id}`,
		);
	};

	it("appends at the end without moving anyone", () => {
		expect(planInsertion(units, [{ id: "d", position: 3 }])).toEqual([]);
	});

	it("moves the siblings from a taken place on one place later", () => {
		expect(placed(units, [{ id: "x", position: 1 }])).toEqual([
			"0:a",
			"1:x",
			"2:b",
			"3:c",
		]);
	});

	it("puts a position past the end last", () => {
		expect(placed(units, [{ id: "x", position: 9 }])).toEqual([
			"0:a",
			"1:b",
			"2:c",
			"3:x",
		]);
	});

	it("gives each of several inserted the place it asked for", () => {
		expect(
			placed(units, [
				{ id: "y", position: 2 },
				{ id: "x", position: 0 },
			]),
		).toEqual(["0:x", "1:a", "2:y", "3:b", "4:c"]);
	});

	it("never ties two inserted at the same place, keeping the request order", () => {
		expect(
			placed(
				[],
				[
					{ id: "x", position: 0 },
					{ id: "y", position: 0 },
				],
			),
		).toEqual(["0:x", "1:y"]);
	});
});
