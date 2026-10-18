import type { LocationDetail, LocationRef, Structure } from "@bluprint/shared";
import { describeLocation } from "./locationBand";
import { PROJECT_ORIGIN } from "./origin";

const tower = (
	id: string,
	name: string,
	units = 0,
): Structure["towers"][number] => ({
	id,
	name,
	floors: units
		? [
				{
					id: `${id}-floor`,
					name: "1º andar",
					units: Array.from({ length: units }, (_, i) => ({
						id: `${id}-u${i}`,
						name: `10${i + 1}`,
						unitType: null,
						changes: 0,
					})),
					commonAreas: [],
				},
			]
		: [],
	commonAreas: [],
});

const structureOf = (...towers: Structure["towers"]): Structure => ({
	towers,
	commonAreas: [],
	counts: { towers: towers.length, floors: 0, units: 0, commonAreas: 0 },
});

const several = structureOf(tower("ta", "Torre A", 4), tower("tb", "Torre B"));
const single = structureOf(tower("ta", "Torre A", 4));

const ref = (
	id: string,
	type: LocationRef["type"],
	name: string,
): LocationRef => ({
	id,
	type,
	name,
});
const towerA = ref("ta", "tower", "Torre A");
const ninth = ref("f9", "floor", "9º andar");

const detail = (
	type: LocationDetail["type"],
	name: string,
	ancestors: LocationRef[],
	children: LocationRef[] = [],
	id = "x",
): LocationDetail => ({
	id,
	type,
	name,
	position: 0,
	ancestors,
	children,
	unitType: null,
	changes: 0,
	rooms: [],
	droppedRooms: [],
});

describe("describeLocation", () => {
	test("a tower goes back to the project and counts its floors and units", () => {
		const band = describeLocation(
			detail(
				"tower",
				"Torre A",
				[],
				[ref("f1", "floor", "1º andar"), ref("f2", "floor", "2º andar")],
				"ta",
			),
			several,
		);

		expect(band).toEqual({
			parent: { kind: "project" },
			title: "Torre A",
			mono: false,
			meta: "Torre · 2 andares · 4 unidades",
		});
	});

	test("a floor goes back to its tower and says where it is and how many units it has", () => {
		const band = describeLocation(
			detail(
				"floor",
				"9º andar",
				[towerA],
				[ref("u1", "unit", "901"), ref("a1", "common_area", "Hall")],
			),
			several,
		);

		expect(band.parent).toEqual({
			kind: "location",
			id: "ta",
			name: "Torre A",
		});
		expect(band.meta).toBe("Andar · Torre A · 1 unidade");
	});

	test("a unit goes back to its floor, in mono, and names its tower and floor", () => {
		const band = describeLocation(
			detail("unit", "903", [towerA, ninth]),
			several,
		);

		expect(band).toEqual({
			parent: { kind: "location", id: "f9", name: "9º andar" },
			title: "903",
			mono: true,
			meta: "Unidade · Torre A · 9º andar",
		});
	});

	test("a common area of a floor names its tower and floor", () => {
		const band = describeLocation(
			detail("common_area", "Hall", [towerA, ref("f0", "floor", "Térreo")]),
			several,
		);

		expect(band.meta).toBe("Área comum · Torre A · Térreo");
	});

	test("a common area of the project says it belongs to the project and goes back to it", () => {
		const band = describeLocation(
			detail("common_area", "Guarita", []),
			several,
		);

		expect(band.parent).toEqual({ kind: "project" });
		expect(band.meta).toBe("Área comum · da obra");
	});

	test("a single tower drops out of the back link and the context line", () => {
		const floor = describeLocation(
			detail(
				"floor",
				"9º andar",
				[towerA],
				[ref("u1", "unit", "901"), ref("u2", "unit", "902")],
			),
			single,
		);
		const unit = describeLocation(
			detail("unit", "903", [towerA, ninth]),
			single,
		);
		const area = describeLocation(
			detail("common_area", "Salão", [towerA]),
			single,
		);

		expect(floor.parent).toEqual({ kind: "project" });
		expect(floor.meta).toBe("Andar · 2 unidades");
		expect(unit.parent).toEqual({
			kind: "location",
			id: "f9",
			name: "9º andar",
		});
		expect(unit.meta).toBe("Unidade · 9º andar");
		expect(area.parent).toEqual({ kind: "project" });
		expect(area.meta).toBe("Área comum · da obra");
	});

	test("a unit opened from its tower goes back to the tower, naming it", () => {
		const unit = detail("unit", "903", [towerA, ninth]);

		expect(describeLocation(unit, several, "ta")).toMatchObject({
			parent: { kind: "location", id: "ta", name: "Torre A" },
			meta: "Unidade · Torre A · 9º andar",
		});
	});

	test("a unit opened from its floor goes back to the floor", () => {
		const unit = detail("unit", "903", [towerA, ninth]);

		expect(describeLocation(unit, several, "f9").parent).toEqual({
			kind: "location",
			id: "f9",
			name: "9º andar",
		});
	});

	test("a unit opened from the project goes back to the project", () => {
		const unit = detail("unit", "903", [towerA, ninth]);

		expect(describeLocation(unit, single, PROJECT_ORIGIN).parent).toEqual({
			kind: "project",
		});
	});

	test.each([
		["a place that is not an ancestor", "tb"],
		["the location itself", "x"],
		["an unknown id", "nowhere"],
	])("an origin that is %s falls back to the structural parent", (_, from) => {
		const unit = detail("unit", "903", [towerA, ninth]);

		expect(describeLocation(unit, several, from).parent).toEqual({
			kind: "location",
			id: "f9",
			name: "9º andar",
		});
	});

	test("the tower of a single-tower project is not an origin to go back to", () => {
		const unit = detail("unit", "903", [towerA, ninth]);

		expect(describeLocation(unit, single, "ta").parent).toEqual({
			kind: "location",
			id: "f9",
			name: "9º andar",
		});
	});
});
