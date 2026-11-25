import {
	type CreateDiscipline,
	type CreateStructureRequest,
	DISCIPLINE_LIMIT_REACHED,
	DISCIPLINE_NAME_TAKEN,
	type Discipline,
	type DroppedRoom,
	EXTRA_DISCIPLINE_COLORS,
	LOCATION_NOT_FOUND,
	type LocationDetail,
	type LocationDiscipline,
	type LocationRef,
	type MoveDirection,
	type OrganizationUnits,
	type ProjectSummary,
	type RemovedCounts,
	type Room,
	type Structure,
	type StructureCommonArea,
	type StructureFloor,
	type StructureTower,
	type StructureUnit,
	type SubtreeRooms,
	sameRoomName,
	type Typology,
	type TypologyList,
} from "@bluprint/shared";
import { type ApiHandler, json } from "@/test/renderApp";

let sequence = 0;
const nextId = () =>
	`0190b000-0000-7000-8000-${String(++sequence).padStart(12, "0")}`;

const named = (name: string) => ({ id: nextId(), name });

export interface AreaSpec {
	name: string;
	typology?: string;
}

function areaOf(spec: string | AreaSpec): StructureCommonArea {
	const { name, typology } = typeof spec === "string" ? { name: spec } : spec;
	return {
		id: nextId(),
		name,
		typology: typology ? { id: typologyId(typology), name: typology } : null,
	};
}

const typologyIds = new Map<string, string>();

function typologyId(name: string): string {
	let id = typologyIds.get(name);
	if (!id) {
		id = nextId();
		typologyIds.set(name, id);
	}
	return id;
}

export interface UnitSpec {
	name: string;
	typology?: string;
	changes?: number;
}

function unitOf(spec: string | UnitSpec): StructureUnit {
	const {
		name,
		typology,
		changes = 0,
	} = typeof spec === "string" ? { name: spec } : spec;
	return {
		id: nextId(),
		name,
		typology: typology ? { id: typologyId(typology), name: typology } : null,
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
		typologyRoomId: options.fromType ? nextId() : null,
		renamed: options.renamed ?? false,
	};
}

export function droppedRoom(name: string): DroppedRoom {
	return { typologyRoomId: nextId(), name };
}

export function disciplineOf(name: string, applies = true): LocationDiscipline {
	return { id: nextId(), name, applies };
}

export function floor(
	name: string,
	units: (string | UnitSpec)[] = [],
	commonAreas: (string | AreaSpec)[] = [],
): StructureFloor {
	return {
		id: nextId(),
		name,
		units: units.map(unitOf),
		commonAreas: commonAreas.map(areaOf),
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
	commonAreas: (string | AreaSpec)[] = [],
): StructureTower {
	return { id: nextId(), name, floors, commonAreas: commonAreas.map(areaOf) };
}

export function structureOf(
	towers: StructureTower[],
	commonAreas: (string | AreaSpec)[] = [],
): Structure {
	const floors = towers.flatMap((t) => t.floors);
	return {
		towers,
		commonAreas: commonAreas.map(areaOf),
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
		typology: null,
		changes: 0,
		rooms: [],
		droppedRooms: [],
		disciplines: [],
		...own,
		...details[node.id],
	});

	const areaAt = (area: StructureCommonArea, ancestors: LocationRef[]) =>
		at("common_area", area, ancestors, [], { typology: area.typology });

	for (const area of structure.commonAreas) {
		if (area.id === locationId) return areaAt(area, []);
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
			if (a.id === locationId) return areaAt(a, [towerRef]);
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
						typology: u.typology,
						changes: u.changes,
					});
				}
			}
			for (const a of f.commonAreas) {
				if (a.id === locationId) return areaAt(a, [towerRef, floorRef]);
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
		if (url.pathname === `${base}/disciplines`) {
			return json({ items: baseCatalog() });
		}
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

function applyCreation(structure: Structure, body: CreateStructureRequest) {
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
				?.units.push({ id, name, typology: null, changes: 0 });
		} else if (parentId === null) {
			structure.commonAreas.push({ id, name, typology: null });
		} else {
			const parent =
				structure.towers.find((t) => t.id === parentId) ??
				structure.towers
					.flatMap((t) => t.floors)
					.find((f) => f.id === parentId);
			parent?.commonAreas.push({ id, name, typology: null });
		}
	}
	recount(structure);
}

function locationsUnder(structure: Structure, id: string): string[] {
	const ids = (nodes: { id: string }[]) => nodes.map((node) => node.id);
	const ofFloor = (floor: StructureFloor) => [
		floor.id,
		...ids(floor.units),
		...ids(floor.commonAreas),
	];
	for (const tower of structure.towers) {
		if (tower.id === id) {
			return [
				tower.id,
				...tower.floors.flatMap(ofFloor),
				...ids(tower.commonAreas),
			];
		}
		for (const floor of tower.floors) {
			if (floor.id === id) return ofFloor(floor);
		}
	}
	const leaves = [
		...ids(structure.commonAreas),
		...structure.towers.flatMap((tower) => [
			...ids(tower.commonAreas),
			...tower.floors.flatMap((floor) => [
				...ids(floor.units),
				...ids(floor.commonAreas),
			]),
		]),
	];
	return leaves.includes(id) ? [id] : [];
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
	create?: (body: CreateStructureRequest, attempt: number) => Reply | undefined;
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
	const created: CreateStructureRequest[] = [];
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
				const body = JSON.parse(String(init.body)) as CreateStructureRequest;
				created.push(body);
				const answered = options.create?.(body, created.length);
				if (answered) return answered;
				applyCreation(structure, body);
				state.units.remaining -= body.locations.filter(
					(entry) => entry.type === "unit" || entry.type === "common_area",
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
				const given = new Map(
					(options.subtreeRooms ?? []).map((entry) => [entry.id, entry]),
				);
				return json({
					locations: locationsUnder(structure, below[1] ?? "").map(
						(id) =>
							given.get(id) ?? {
								id,
								rooms: [],
								droppedRooms: [],
								disciplines: [],
							},
					),
				});
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
				state.units.remaining += counts.units + counts.commonAreas;
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

export function typologyOf(
	name: string,
	rooms: string[],
	usage: {
		locations?: number;
		changed?: number;
		locationType?: Typology["locationType"];
	} = {},
): Typology {
	return {
		id: typologyId(name),
		name,
		locationType: usage.locationType ?? "unit",
		rooms: rooms.map(named),
		locationCount: usage.locations ?? 0,
		changedLocationCount: usage.changed ?? 0,
	};
}

export function typologiesApi(
	projectId: string,
	list: TypologyList = { typologies: [] },
): ApiHandler {
	return (url, init) =>
		url.pathname === `/api/projects/${projectId}/typologies` &&
		(init?.method ?? "GET") === "GET"
			? json(list)
			: undefined;
}

export interface TypologyWrite {
	method: string;
	path: string;
	body: unknown;
}

export function typologyServer(
	projectId: string,
	initial: Typology[],
	answer?: (write: TypologyWrite, attempt: number) => Reply | undefined,
) {
	const base = `/api/projects/${projectId}`;
	const writes: TypologyWrite[] = [];
	let typologies = initial;
	const handler: ApiHandler = (url, init) => {
		const list = `${base}/typologies`;
		if (url.pathname !== list && !url.pathname.startsWith(`${list}/`)) {
			return undefined;
		}
		const method = init?.method ?? "GET";
		if (method === "GET") {
			return url.pathname === list ? json({ typologies }) : undefined;
		}
		const body = init?.body
			? (JSON.parse(String(init.body)) as Record<string, unknown>)
			: null;
		const write = { method, path: url.pathname.slice(base.length), body };
		writes.push(write);
		const answered = answer?.(write, writes.length);
		if (answered) return answered;

		if (method === "POST" && url.pathname === list && body) {
			const created: Typology = {
				id: String(body.id),
				name: String(body.name),
				locationType:
					body.locationType === "common_area" ? "common_area" : "unit",
				rooms: (body.rooms as Typology["rooms"] | undefined) ?? [],
				locationCount: 0,
				changedLocationCount: 0,
			};
			typologies = [...typologies, created];
			return json(created, 201);
		}
		const id = url.pathname.slice(list.length + 1);
		const found = typologies.find((each) => each.id === id);
		if (!found) return undefined;
		if (method === "PATCH" && body) {
			const typology: Typology = {
				...found,
				...(typeof body.name === "string" && { name: body.name }),
				...(Array.isArray(body.rooms) && {
					rooms: body.rooms as Typology["rooms"],
				}),
			};
			typologies = typologies.map((each) => (each.id === id ? typology : each));
			return json({
				typology,
				updatedLocationCount: Array.isArray(body.rooms)
					? typology.locationCount
					: 0,
			});
		}
		if (method === "DELETE") {
			typologies = typologies.filter((each) => each.id !== id);
			return json({ typologies });
		}
		return undefined;
	};
	return {
		handler,
		writes,
		typologies: () => typologies,
	};
}

export function configurationSectionsApi(
	projectId: string,
	structure: Structure = emptyStructure,
	typologies: TypologyList = { typologies: [] },
): ApiHandler {
	return combine(
		structureApi(projectId, structure),
		typologiesApi(projectId, typologies),
	);
}

export interface DisciplineWrite {
	locationId: string;
	disciplineId: string;
	applies: boolean;
}

export function disciplinesApi(
	projectId: string,
	details: Record<string, Partial<LocationDetail>>,
	answer?: (write: DisciplineWrite, attempt: number) => Reply | undefined,
) {
	const writes: DisciplineWrite[] = [];
	const pattern = new RegExp(
		`^/api/projects/${projectId}/locations/([^/]+)/disciplines/([^/]+)$`,
	);
	const handler: ApiHandler = (url, init) => {
		const match = pattern.exec(url.pathname);
		if (!match || init?.method !== "PUT") return undefined;
		const { applies } = JSON.parse(String(init.body)) as { applies: boolean };
		const write = {
			locationId: match[1] ?? "",
			disciplineId: match[2] ?? "",
			applies,
		};
		writes.push(write);
		const answered = answer?.(write, writes.length);
		if (answered) return answered;
		const disciplines = (details[write.locationId]?.disciplines ?? []).map(
			(each) => (each.id === write.disciplineId ? { ...each, applies } : each),
		);
		details[write.locationId] = { ...details[write.locationId], disciplines };
		return json({ disciplines });
	};
	return { handler, writes };
}

export function catalogDiscipline(
	name: string,
	options: Partial<Pick<Discipline, "id" | "type" | "appliesEverywhere">> = {},
): Discipline {
	const type = options.type ?? "extra";
	return {
		id: options.id ?? nextId(),
		name,
		color: type === "general" ? null : "#0D9488",
		type,
		hasOwnPlan: type !== "extra",
		appliesEverywhere: options.appliesEverywhere ?? type !== "general",
	};
}

export const baseCatalog = () => [
	catalogDiscipline("Geral", { type: "general" }),
	catalogDiscipline("Hidráulica", { type: "base" }),
	catalogDiscipline("Elétrica", { type: "base" }),
];

export function catalogApi(
	projectId: string,
	structure: Structure,
	details: Record<string, Partial<LocationDetail>>,
	{
		catalog = baseCatalog(),
		answer,
	}: {
		catalog?: Discipline[];
		answer?: (body: CreateDiscipline, attempt: number) => Reply | undefined;
	} = {},
) {
	const created: CreateDiscipline[] = [];
	const path = `/api/projects/${projectId}/disciplines`;
	const handler: ApiHandler = (url, init) => {
		if (url.pathname !== path) return undefined;
		if ((init?.method ?? "GET") === "GET") return json({ items: catalog });
		if (init?.method !== "POST") return undefined;
		const body = JSON.parse(String(init.body)) as CreateDiscipline;
		created.push(body);
		const answered = answer?.(body, created.length);
		if (answered) return answered;
		const again = catalog.find(({ id }) => id === body.id);
		if (again) return json(again, 201);
		const taken = catalog.find(({ name }) => sameRoomName(name, body.name));
		if (taken) {
			return json(
				{
					type: "about:blank",
					title: "Conflict",
					status: 409,
					code: DISCIPLINE_NAME_TAKEN,
					name: taken.name,
				},
				409,
			);
		}
		const extras = catalog.filter(({ type }) => type === "extra").length;
		if (extras >= EXTRA_DISCIPLINE_COLORS.length) {
			return json(
				{
					type: "about:blank",
					title: "Conflict",
					status: 409,
					code: DISCIPLINE_LIMIT_REACHED,
				},
				409,
			);
		}
		const discipline: Discipline = {
			...catalogDiscipline(body.name, {
				id: body.id,
				appliesEverywhere: body.appliesEverywhere,
			}),
			color: EXTRA_DISCIPLINE_COLORS[extras] ?? null,
		};
		catalog.push(discipline);
		for (const node of everyNode(structure)) {
			const applies =
				body.appliesEverywhere &&
				(node.type === "unit" || node.type === "common_area");
			details[node.id] = {
				...details[node.id],
				disciplines: [
					...(details[node.id]?.disciplines ?? []),
					{ id: discipline.id, name: discipline.name, applies },
				],
			};
		}
		return json(discipline, 201);
	};
	return { handler, created, catalog };
}
