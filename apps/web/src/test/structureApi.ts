import {
	LOCATION_NOT_FOUND,
	type LocationDetail,
	type LocationRef,
	type Structure,
	type StructureFloor,
	type StructureTower,
} from "@bluprint/shared";
import { type ApiHandler, json } from "@/test/renderApp";

let sequence = 0;
const nextId = () =>
	`0190b000-0000-7000-8000-${String(++sequence).padStart(12, "0")}`;

const named = (name: string) => ({ id: nextId(), name });

export function floor(
	name: string,
	units: string[] = [],
	commonAreas: string[] = [],
): StructureFloor {
	return {
		id: nextId(),
		name,
		units: units.map(named),
		commonAreas: commonAreas.map(named),
	};
}

export function numberedFloors(
	from: number,
	to: number,
	unitsPerFloor: number,
): StructureFloor[] {
	return Array.from({ length: to - from + 1 }, (_, i) => {
		const number = from + i;
		return floor(
			`${number}º andar`,
			Array.from(
				{ length: unitsPerFloor },
				(_, unit) => `${number}${String(unit + 1).padStart(2, "0")}`,
			),
		);
	});
}

export function tower(
	name: string,
	floors: StructureFloor[] = [],
	commonAreas: string[] = [],
): StructureTower {
	return { id: nextId(), name, floors, commonAreas: commonAreas.map(named) };
}

export function structureOf(
	towers: StructureTower[],
	commonAreas: string[] = [],
): Structure {
	const floors = towers.flatMap((t) => t.floors);
	return {
		towers,
		commonAreas: commonAreas.map(named),
		counts: {
			towers: towers.length,
			floors: floors.length,
			units: floors.reduce((sum, f) => sum + f.units.length, 0),
			commonAreas:
				commonAreas.length +
				towers.reduce(
					(sum, t) =>
						sum +
						t.commonAreas.length +
						t.floors.reduce((n, f) => n + f.commonAreas.length, 0),
					0,
				),
		},
	};
}

export const emptyStructure = structureOf([]);

const ref = (
	type: LocationRef["type"],
	{ id, name }: { id: string; name: string },
): LocationRef => ({
	id,
	type,
	name,
});

export function locationIn(
	structure: Structure,
	locationId: string,
): LocationDetail | undefined {
	const at = (
		type: LocationRef["type"],
		node: { id: string; name: string },
		ancestors: LocationRef[],
		children: LocationRef[],
	): LocationDetail => ({ ...ref(type, node), ancestors, children });

	for (const area of structure.commonAreas) {
		if (area.id === locationId) return at("common_area", area, [], []);
	}
	for (const t of structure.towers) {
		const towerRef = ref("tower", t);
		if (t.id === locationId) {
			return at(
				"tower",
				t,
				[],
				[
					...t.floors.map((f) => ref("floor", f)),
					...t.commonAreas.map((a) => ref("common_area", a)),
				],
			);
		}
		for (const a of t.commonAreas) {
			if (a.id === locationId) return at("common_area", a, [towerRef], []);
		}
		for (const f of t.floors) {
			const floorRef = ref("floor", f);
			if (f.id === locationId) {
				return at(
					"floor",
					f,
					[towerRef],
					[
						...f.units.map((u) => ref("unit", u)),
						...f.commonAreas.map((a) => ref("common_area", a)),
					],
				);
			}
			for (const u of f.units) {
				if (u.id === locationId) return at("unit", u, [towerRef, floorRef], []);
			}
			for (const a of f.commonAreas) {
				if (a.id === locationId) {
					return at("common_area", a, [towerRef, floorRef], []);
				}
			}
		}
	}
	return undefined;
}

export function structureApi(
	projectId: string,
	structure: Structure,
): ApiHandler {
	return (url) => {
		const base = `/api/projects/${projectId}`;
		if (url.pathname === `${base}/structure`) return json(structure);
		const match = new RegExp(`^${base}/locations/([^/]+)$`).exec(url.pathname);
		if (!match) return undefined;
		const found = locationIn(structure, match[1] ?? "");
		return found
			? json(found)
			: json(
					{
						type: "about:blank",
						title: "Not Found",
						status: 404,
						code: LOCATION_NOT_FOUND,
					},
					404,
				);
	};
}

export function combine(...handlers: ApiHandler[]): ApiHandler {
	return (url) => {
		for (const handler of handlers) {
			const answered = handler(url);
			if (answered) return answered;
		}
		return undefined;
	};
}
