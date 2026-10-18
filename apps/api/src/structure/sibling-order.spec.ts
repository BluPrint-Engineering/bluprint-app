import type { SiblingRow } from "./location-row";
import { planInsertion, planMove } from "./sibling-order";

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

	it("swaps the stored positions, leaving the gaps of a removal where they are", () => {
		const gapped = [
			sibling("a", "unit", 0),
			sibling("b", "unit", 2),
			sibling("c", "unit", 5),
		];

		expect(planMove(gapped, "c", "up")).toEqual([
			{ id: "c", position: 2 },
			{ id: "b", position: 5 },
		]);
	});
});

describe("planInsertion", () => {
	const placed = (
		siblings: SiblingRow[],
		inserted: { id: string; position?: number }[],
	) => {
		const plan = planInsertion(siblings, inserted);
		return applied(
			[
				...siblings,
				...plan.placed.map(({ id, position }) => sibling(id, "unit", position)),
			],
			plan.shifted,
		).map(({ id, position }) => `${position}:${id}`);
	};

	it("puts a location at a free position without moving anyone", () => {
		const gapped = [sibling("a", "unit", 0), sibling("c", "unit", 2)];

		expect(planInsertion(gapped, [{ id: "b", position: 1 }])).toEqual({
			shifted: [],
			placed: [{ id: "b", position: 1 }],
		});
	});

	it("moves the siblings from a taken position on one place later", () => {
		expect(placed(units, [{ id: "x", position: 1 }])).toEqual([
			"0:a",
			"1:x",
			"2:b",
			"3:c",
		]);
	});

	it("puts a location without a position after the last one, past any gap", () => {
		const gapped = [sibling("a", "unit", 0), sibling("c", "unit", 4)];

		expect(placed(gapped, [{ id: "x" }, { id: "y" }])).toEqual([
			"0:a",
			"4:c",
			"5:x",
			"6:y",
		]);
	});

	it("starts at 0 when there is nothing under the parent", () => {
		expect(placed([], [{ id: "x" }])).toEqual(["0:x"]);
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
