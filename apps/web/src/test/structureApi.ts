import {
	type CreateStructure,
	type DroppedRoom,
	LOCATION_NOT_FOUND,
	type LocationDetail,
	type LocationRef,
	type MoveDirection,
	type OrganizationUnits,
	type ProjectSummary,
	type RemovedCounts,
	type Room,
	type Structure,
	type StructureFloor,
	type StructureTower,
	type StructureUnit,
	type SubtreeRooms,
	type UnitType,
	type UnitTypeList,
} from "@bluprint/shared";
import { type ApiHandler, json } from "@/test/renderApp";

let sequence = 0;
const nextId = () =>
	`0190b000-0000-7000-8000-${String(++sequence).padStart(12, "0")}`;

const named = (name: string) => ({ id: nextId(), name });

const unitTypeIds = new Map<string, string>();

function unitTypeId(name: string): string {
	let id = unitTypeIds.get(name);
	if (!id) {
		id = nextId();
		unitTypeIds.set(name, id);
	}
	return id;
}

export interface UnitSpec {
	name: string;
	unitType?: string;
	changes?: number;
}

function unitOf(spec: string | UnitSpec): StructureUnit {
	const {
		name,
		unitType,
		changes = 0,
	} = typeof spec === "string" ? { name: spec } : spec;
	return {
		id: nextId(),
		name,
		unitType: unitType ? { id: unitTypeId(unitType), name: unitType } : null,
		changes,
	};
}

export function room(
	name: string,
	options: { fromType?: boolean; renamed?: boolean } = {},
): Room {
	return {
		id: nextId(),
		name,
		unitTypeRoomId: options.fromType ? nextId() : null,
		renamed: options.renamed ?? false,
	};
}

export function droppedRoom(name: string): DroppedRoom {
	return { unitTypeRoomId: nextId(), name };
}

export function floor(
	name: string,
	units: (string | UnitSpec)[] = [],
	commonAreas: string[] = [],
): StructureFloor {
	return {
		id: nextId(),
		name,
		units: units.map(unitOf),
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
	details: Record<string, Partial<LocationDetail>> = {},
): LocationDetail | undefined {
	const at = (
		type: LocationRef["type"],
		node: { id: string; name: string },
		ancestors: LocationRef[],
		children: LocationRef[],
		own: Partial<LocationDetail> = {},
	): LocationDetail => ({
		...ref(type, node),
		position: 0,
		ancestors,
		children,
		unitType: null,
		changes: 0,
		rooms: [],
		droppedRooms: [],
		...own,
		...details[node.id],
	});

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
				if (u.id === locationId) {
					return at("unit", u, [towerRef, floorRef], [], {
						unitType: u.unitType,
						changes: u.changes,
					});
				}
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
	details: Record<string, Partial<LocationDetail>> = {},
): ApiHandler {
	return (url) => {
		const base = `/api/projects/${projectId}`;
		if (url.pathname === `${base}/structure`) return json(structure);
		const match = new RegExp(`^${base}/locations/([^/]+)$`).exec(url.pathname);
		if (!match) return undefined;
		const found = locationIn(structure, match[1] ?? "", details);
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
	return (url, init) => {
		for (const handler of handlers) {
			const answered = handler(url, init);
			if (answered) return answered;
		}
		return undefined;
	};
}

type Reply = Promise<Response> | Response;

type Named = { id: string; name: string };

function everyNode(
	structure: Structure,
): (Named & { type: LocationRef["type"] })[] {
	return [
		...structure.commonAreas.map((a) => ({
			...a,
			type: "common_area" as const,
		})),
		...structure.towers.flatMap((t) => [
			{ ...t, type: "tower" as const },
			...t.commonAreas.map((a) => ({ ...a, type: "common_area" as const })),
			...t.floors.flatMap((f) => [
				{ ...f, type: "floor" as const },
				...f.commonAreas.map((a) => ({ ...a, type: "common_area" as const })),
				...f.units.map((u) => ({ ...u, type: "unit" as const })),
			]),
		]),
	];
}

function recount(structure: Structure) {
	const floors = structure.towers.flatMap((t) => t.floors);
	structure.counts = {
		towers: structure.towers.length,
		floors: floors.length,
		units: floors.reduce((sum, f) => sum + f.units.length, 0),
		commonAreas: everyNode(structure).filter((n) => n.type === "common_area")
			.length,
	};
}

function applyCreation(structure: Structure, body: CreateStructure) {
	for (const entry of body.locations) {
		const { id, name, parentId } = entry;
		if (entry.type === "tower") {
			structure.towers.push({ id, name, floors: [], commonAreas: [] });
		} else if (entry.type === "floor") {
			structure.towers
				.find((t) => t.id === parentId)
				?.floors.push({ id, name, units: [], commonAreas: [] });
		} else if (entry.type === "unit") {
			structure.towers
				.flatMap((t) => t.floors)
				.find((f) => f.id === parentId)
				?.units.push({ id, name, unitType: null, changes: 0 });
		} else if (parentId === null) {
			structure.commonAreas.push({ id, name });
		} else {
			const parent =
				structure.towers.find((t) => t.id === parentId) ??
				structure.towers
					.flatMap((t) => t.floors)
					.find((f) => f.id === parentId);
			parent?.commonAreas.push({ id, name });
		}
	}
	recount(structure);
}

function removeNode(
	structure: Structure,
	id: string,
): RemovedCounts | undefined {
	const counts = { floors: 0, units: 0, commonAreas: 0 };
	const area = () => {
		counts.commonAreas += 1;
	};
	const unit = () => {
		counts.units += 1;
	};
	const floorOf = (node: { id: string }) => {
		const f = node as StructureFloor;
		counts.floors += 1;
		counts.units += f.units.length;
		counts.commonAreas += f.commonAreas.length;
	};
	const towerOf = (node: { id: string }) => {
		const t = node as StructureTower;
		t.floors.forEach(floorOf);
		counts.commonAreas += t.commonAreas.length;
	};
	const holders: { list: { id: string }[]; tally: (node: never) => void }[] = [
		{ list: structure.towers, tally: towerOf },
		{ list: structure.commonAreas, tally: area },
		...structure.towers.flatMap((t) => [
			{ list: t.floors, tally: floorOf },
			{ list: t.commonAreas, tally: area },
			...t.floors.flatMap((f) => [
				{ list: f.units, tally: unit },
				{ list: f.commonAreas, tally: area },
			]),
		]),
	];

	for (const { list, tally } of holders) {
		const at = list.findIndex((node) => node.id === id);
		if (at < 0) continue;
		(tally as (node: { id: string }) => void)(list[at] as { id: string });
		list.splice(at, 1);
		recount(structure);
		return counts;
	}
	return undefined;
}

function moveNode(structure: Structure, id: string, direction: MoveDirection) {
	const lists: { id: string }[][] = [
		structure.towers,
		structure.commonAreas,
		...structure.towers.flatMap((t) => [
			t.floors,
			t.commonAreas,
			...t.floors.flatMap((f) => [f.units, f.commonAreas]),
		]),
	];
	const list = lists.find((candidate) => candidate.some((n) => n.id === id));
	if (!list) return;
	const at = list.findIndex((n) => n.id === id);
	const isFloor = structure.towers.some((t) => t.floors === list);
	const to = at + ((direction === "up") === isFloor ? 1 : -1);
	const other = list[to];
	const node = list[at];
	if (!other || !node) return;
	list[to] = node;
	list[at] = other;
}

export interface WritableApiOptions {
	remaining?: number;
	subtreeRooms?: SubtreeRooms["locations"];
	organization?: OrganizationUnits;
	details?: Record<string, Partial<LocationDetail>>;
	remove?: (locationId: string, attempt: number) => Reply | undefined;
	move?: (
		locationId: string,
		direction: MoveDirection,
		attempt: number,
	) => Reply | undefined;
	create?: (body: CreateStructure, attempt: number) => Reply | undefined;
	rename?: (
		locationId: string,
		name: string,
		attempt: number,
	) => Reply | undefined;
}

export function writableApi(
	initial: ProjectSummary,
	structure: Structure,
	options: WritableApiOptions = {},
) {
	const state = {
		summary: initial,
		units: {
			reserved: initial.units.reserved,
			remaining: options.remaining ?? 100,
		},
	};
	const created: CreateStructure[] = [];
	const renamed: { locationId: string; name: string }[] = [];
	const roomsRead: string[] = [];
	const removed: string[] = [];
	const moved: { locationId: string; direction: MoveDirection }[] = [];
	const base = `/api/projects/${initial.id}`;
	const balance = () => ({
		reserved: state.units.reserved,
		used: state.units.reserved - state.units.remaining,
		remaining: state.units.remaining,
	});

	const handler: ApiHandler = combine(
		(url, init) => {
			if (url.pathname === "/api/organization/units") {
				return json(
					options.organization ?? {
						contracted: 500,
						reserved: 300,
						free: 200,
						reclaimable: 0,
					},
				);
			}
			if (url.pathname === base) return json(state.summary);
			if (url.pathname === `${base}/units`) {
				if (init?.method !== "PATCH") return json(balance());
				const { reserved } = JSON.parse(String(init.body)) as {
					reserved: number;
				};
				state.units = {
					reserved,
					remaining: state.units.remaining + reserved - state.units.reserved,
				};
				state.summary = {
					...state.summary,
					units: { reserved, used: reserved - state.units.remaining },
				};
				return json(state.summary);
			}
			if (url.pathname === `${base}/structure` && init?.method === "POST") {
				const body = JSON.parse(String(init.body)) as CreateStructure;
				created.push(body);
				const answered = options.create?.(body, created.length);
				if (answered) return answered;
				applyCreation(structure, body);
				state.units.remaining -= body.locations.filter(
					(entry) => entry.type === "unit",
				).length;
				const requested = (type: string) =>
					body.locations.filter((entry) => entry.type === type).length;
				return json(
					{
						counts: {
							towers: requested("tower"),
							floors: requested("floor"),
							units: requested("unit"),
							commonAreas: requested("common_area"),
						},
					},
					201,
				);
			}
			const below = new RegExp(
				`^${base}/locations/([^/]+)/subtree-rooms$`,
			).exec(url.pathname);
			if (below) {
				roomsRead.push(below[1] ?? "");
				return json({ locations: options.subtreeRooms ?? [] });
			}
			const moveTarget = new RegExp(`^${base}/locations/([^/]+)/move$`).exec(
				url.pathname,
			);
			if (moveTarget && init?.method === "POST") {
				const locationId = moveTarget[1] ?? "";
				const { direction } = JSON.parse(String(init.body)) as {
					direction: MoveDirection;
				};
				moved.push({ locationId, direction });
				const answered = options.move?.(locationId, direction, moved.length);
				if (answered) return answered;
				moveNode(structure, locationId, direction);
				const node = everyNode(structure).find((n) => n.id === locationId);
				return (
					node && json({ id: locationId, type: node.type, name: node.name })
				);
			}
			const target = new RegExp(`^${base}/locations/([^/]+)$`).exec(
				url.pathname,
			);
			if (target && init?.method === "DELETE") {
				const locationId = target[1] ?? "";
				removed.push(locationId);
				const answered = options.remove?.(locationId, removed.length);
				if (answered) return answered;
				const counts = removeNode(structure, locationId);
				if (!counts) {
					return json(
						{
							type: "about:blank",
							title: "Not Found",
							status: 404,
							code: LOCATION_NOT_FOUND,
						},
						404,
					);
				}
				state.units.remaining += counts.units;
				return json({ outcome: "deleted", removed: counts });
			}
			if (target && init?.method === "PATCH") {
				const locationId = target[1] ?? "";
				const { name } = JSON.parse(String(init.body)) as { name: string };
				renamed.push({ locationId, name });
				const answered = options.rename?.(locationId, name, renamed.length);
				if (answered) return answered;
				const node = everyNode(structure).find((n) => n.id === locationId);
				if (!node) return undefined;
				const live = [
					...structure.commonAreas,
					...structure.towers,
					...structure.towers.flatMap((t) => [...t.commonAreas, ...t.floors]),
					...structure.towers.flatMap((t) =>
						t.floors.flatMap((f) => [...f.commonAreas, ...f.units]),
					),
				].find((n) => n.id === locationId);
				if (live) live.name = name;
				return json({ id: locationId, type: node.type, name });
			}
			return undefined;
		},
		structureApi(initial.id, structure, options.details),
	);

	return { handler, state, created, renamed, removed, moved, roomsRead };
}

export function unitTypeOf(
	name: string,
	rooms: string[],
	usage: { units?: number; changed?: number } = {},
): UnitType {
	return {
		id: unitTypeId(name),
		name,
		rooms: rooms.map(named),
		unitCount: usage.units ?? 0,
		changedUnitCount: usage.changed ?? 0,
	};
}

export function unitTypesApi(
	projectId: string,
	list: UnitTypeList = { unitTypes: [] },
): ApiHandler {
	return (url, init) =>
		url.pathname === `/api/projects/${projectId}/unit-types` &&
		(init?.method ?? "GET") === "GET"
			? json(list)
			: undefined;
}

export function configurationSectionsApi(
	projectId: string,
	structure: Structure = emptyStructure,
	unitTypes: UnitTypeList = { unitTypes: [] },
): ApiHandler {
	return combine(
		structureApi(projectId, structure),
		unitTypesApi(projectId, unitTypes),
	);
}
