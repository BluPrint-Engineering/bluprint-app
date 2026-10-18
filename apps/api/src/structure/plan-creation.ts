import {
	comparableLocationName,
	LOCATION_ID_TAKEN,
	LOCATION_NAME_TAKEN,
	LOCATION_PARENT_INVALID,
	type NewLocation,
	type NewUnitType,
	ROOM_ID_TAKEN,
	type StructureCounts,
	UNIT_TYPE_ID_TAKEN,
	UNIT_TYPE_NAME_TAKEN,
	UNIT_TYPE_NOT_FOUND,
	UNIT_TYPE_ROOM_INVALID,
} from "@bluprint/shared";
import { ProblemException } from "../common/problems/problem.exception";
import { nameKey } from "./location-names";
import { canHoldChild } from "./location-pairs";
import type { LocationRow } from "./location-row";

export interface StoredUnitType {
	id: string;
	name: string;
}

export interface UnitTypeIdsInUse {
	typesElsewhere: ReadonlySet<string>;
	storedRooms: ReadonlySet<string>;
}

export interface CreationPlan {
	freshUnitTypes: NewUnitType[];
	fresh: NewLocation[];
	newUnits: number;
	counts: StructureCounts;
}

const idTakenProblem = () =>
	new ProblemException({
		status: 409,
		code: UNIT_TYPE_ID_TAKEN,
		detail: "A unit type or room id of the request is already taken.",
	});

function planUnitTypes(
	requested: NewUnitType[],
	stored: StoredUnitType[],
	inUse: UnitTypeIdsInUse,
): NewUnitType[] {
	const storedIds = new Set(stored.map(({ id }) => id));
	const fresh = requested.filter(({ id }) => !storedIds.has(id));

	const idTaken = ({ id, rooms }: NewUnitType) =>
		inUse.typesElsewhere.has(id) ||
		rooms.some((room) => inUse.storedRooms.has(room.id));
	if (fresh.some(idTaken)) throw idTakenProblem();

	const claimed = new Set(
		stored.map(({ name }) => comparableLocationName(name)),
	);
	const clashes = new Set<string>();
	for (const { name } of fresh) {
		const key = comparableLocationName(name);
		if (claimed.has(key)) clashes.add(name);
		claimed.add(key);
	}
	if (clashes.size > 0) {
		throw new ProblemException({
			status: 409,
			code: UNIT_TYPE_NAME_TAKEN,
			detail: "A unit type name of the request is already in use.",
			names: [...clashes],
		});
	}

	return fresh;
}

export interface CreationRequest {
	unitTypes: NewUnitType[];
	locations: NewLocation[];
}

export interface StoredTypeRoom {
	id: string;
	unitTypeId: string;
	name: string;
}

export interface CreationContext {
	locations: LocationRow[];
	unitTypes: StoredUnitType[];
	locationIdsElsewhere: ReadonlySet<string>;
	unitTypeIdsInUse: UnitTypeIdsInUse;
	typeRooms: StoredTypeRoom[];
	roomIdsInUse: ReadonlySet<string>;
}

const noTypeRooms: ReadonlyMap<string, string> = new Map();

function assertRoomsFit(
	entry: NewLocation,
	typeRoomNames: ReadonlyMap<string, ReadonlyMap<string, string>>,
	roomIdsInUse: ReadonlySet<string>,
): void {
	if ((entry.rooms ?? []).some(({ id }) => roomIdsInUse.has(id))) {
		throw new ProblemException({
			status: 409,
			code: ROOM_ID_TAKEN,
			detail: "A room id of the request is already taken.",
		});
	}

	if (entry.rooms === undefined) return;
	const expected =
		(entry.unitTypeId === undefined
			? undefined
			: typeRoomNames.get(entry.unitTypeId)) ?? noTypeRooms;
	const covered = new Set([
		...entry.rooms.flatMap(({ unitTypeRoomId }) =>
			unitTypeRoomId === undefined ? [] : [unitTypeRoomId],
		),
		...(entry.droppedRooms ?? []),
	]);
	const fits =
		covered.size === expected.size &&
		[...covered].every((id) => expected.has(id)) &&
		entry.rooms.every(
			({ unitTypeRoomId, renamed, name }) =>
				unitTypeRoomId === undefined ||
				renamed === true ||
				expected.get(unitTypeRoomId) === name,
		);
	if (!fits) {
		throw new ProblemException({
			status: 400,
			code: UNIT_TYPE_ROOM_INVALID,
			detail:
				"The rooms of a unit do not account for every room of its unit type, once, under the unit type's name unless renamed.",
		});
	}
}

export function planCreation(
	{ unitTypes: requestedUnitTypes, locations: requested }: CreationRequest,
	{
		locations: inProject,
		unitTypes: storedUnitTypes,
		locationIdsElsewhere: takenElsewhere,
		unitTypeIdsInUse,
		typeRooms: storedTypeRooms,
		roomIdsInUse,
	}: CreationContext,
): CreationPlan {
	const stored = new Map(inProject.map((row) => [row.id, row]));
	const freshUnitTypes = planUnitTypes(
		requestedUnitTypes,
		storedUnitTypes,
		unitTypeIdsInUse,
	);
	const typeRoomNames = new Map<string, Map<string, string>>();
	const typeRooms = [
		...storedTypeRooms,
		...freshUnitTypes.flatMap(({ id: unitTypeId, rooms }) =>
			rooms.map(({ id, name }) => ({ id, unitTypeId, name })),
		),
	];
	for (const { id, unitTypeId, name } of typeRooms) {
		const names = typeRoomNames.get(unitTypeId) ?? new Map<string, string>();
		names.set(id, name);
		typeRoomNames.set(unitTypeId, names);
	}
	const knownUnitTypes = new Set([
		...storedUnitTypes.map(({ id }) => id),
		...requestedUnitTypes.map(({ id }) => id),
	]);

	for (const entry of requested) {
		const existing = stored.get(entry.id);
		if (
			takenElsewhere.has(entry.id) ||
			(existing &&
				(existing.type !== entry.type || existing.parentId !== entry.parentId))
		) {
			throw new ProblemException({
				status: 409,
				code: LOCATION_ID_TAKEN,
				detail: "A location id of the request is already taken.",
			});
		}
	}

	const known = new Map<string, Pick<LocationRow, "type" | "parentId">>(stored);
	for (const entry of requested) {
		if (
			entry.unitTypeId !== undefined &&
			!knownUnitTypes.has(entry.unitTypeId)
		) {
			throw new ProblemException({
				status: 400,
				code: UNIT_TYPE_NOT_FOUND,
				detail:
					"A unit follows a unit type that does not exist in the project.",
			});
		}

		const parent = entry.parentId === null ? null : known.get(entry.parentId);
		if (
			parent === undefined ||
			!canHoldChild(parent?.type ?? null, entry.type)
		) {
			throw new ProblemException({
				status: 400,
				code: LOCATION_PARENT_INVALID,
				detail:
					"A location hangs under a parent that does not exist yet or cannot hold its kind.",
			});
		}
		known.set(entry.id, entry);
	}

	const fresh = requested.filter((entry) => !stored.has(entry.id));
	for (const entry of fresh) assertRoomsFit(entry, typeRoomNames, roomIdsInUse);

	const claimed = new Set(
		inProject.map((row) => nameKey(row, row.name, known)),
	);
	const clashes = new Set<string>();
	for (const entry of fresh) {
		const key = nameKey(entry, entry.name, known);
		if (claimed.has(key)) clashes.add(entry.name);
		claimed.add(key);
	}
	if (clashes.size > 0) {
		throw new ProblemException({
			status: 409,
			code: LOCATION_NAME_TAKEN,
			detail: "A name of the request is already in use where it would go.",
			names: [...clashes],
		});
	}

	const count = (type: NewLocation["type"]) =>
		requested.filter((entry) => entry.type === type).length;

	return {
		freshUnitTypes,
		fresh,
		newUnits: fresh.filter((entry) => entry.type === "unit").length,
		counts: {
			towers: count("tower"),
			floors: count("floor"),
			units: count("unit"),
			commonAreas: count("common_area"),
		},
	};
}
