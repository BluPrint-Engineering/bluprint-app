import { location } from "../../structure/location.entity";
import { droppedRoom, room } from "../../structure/room.entity";
import { unitType, unitTypeRoom } from "../../structure/unit-type.entity";
import type { Database } from "../database.module";

export interface SeedUnitType {
	name: string;
	rooms: string[];
}

export interface SeedUnitRef {
	tower: string;
	floor: string;
	name: string;
	stack: number;
}

export interface SeedUnitChange {
	tower: string;
	unit: string;
	addedRooms?: string[];
	droppedRooms?: string[];
	renamedRooms?: Record<string, string>;
}

export interface SeedFloor {
	name: string;
	units: string[];
	commonAreas?: string[];
}

export interface SeedTower {
	name: string;
	floors: SeedFloor[];
	commonAreas?: string[];
}

export interface SeedStructure {
	towers: SeedTower[];
	commonAreas?: string[];
	unitTypes?: SeedUnitType[];
	unitTypeOf?: (unit: SeedUnitRef) => string | undefined;
	unitChanges?: SeedUnitChange[];
	commonAreaRooms?: Record<string, string[]>;
}

export function sameUnitType(
	name: string,
	rooms: string[],
): Pick<SeedStructure, "unitTypes" | "unitTypeOf"> {
	return { unitTypes: [{ name, rooms }], unitTypeOf: () => name };
}

export function countUnits(structure: SeedStructure | undefined): number {
	return (
		structure?.towers.reduce(
			(sum, tower) =>
				sum + tower.floors.reduce((n, floor) => n + floor.units.length, 0),
			0,
		) ?? 0
	);
}

export function floorName(number: number): string {
	return `${number}º andar`;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function unitNames(
	floor: number,
	count: number,
	numbering: "digits" | "letters",
): string[] {
	return Array.from({ length: count }, (_, i) =>
		numbering === "letters"
			? `${floor}${LETTERS[i]}`
			: `${floor}${String(i + 1).padStart(2, "0")}`,
	);
}

export function numberedFloors(options: {
	from: number;
	to: number;
	unitsPerFloor: number;
	numbering?: "digits" | "letters";
	hall?: boolean;
}): SeedFloor[] {
	const {
		from,
		to,
		unitsPerFloor,
		numbering = "digits",
		hall = false,
	} = options;

	return Array.from({ length: to - from + 1 }, (_, i) => {
		const number = from + i;
		return {
			name: floorName(number),
			units: unitNames(number, unitsPerFloor, numbering),
			...(hall ? { commonAreas: ["Hall"] } : {}),
		};
	});
}

type Insertable = typeof location.$inferInsert;

export async function insertStructure(
	db: Pick<Database, "insert">,
	projectId: string,
	structure: SeedStructure,
): Promise<void> {
	const insertLevel = async (rows: Insertable[]): Promise<string[]> => {
		if (rows.length === 0) return [];
		const inserted = await db
			.insert(location)
			.values(rows)
			.returning({ id: location.id });
		return inserted.map((row) => row.id);
	};

	const area = (parentId: string | null, name: string, position: number) =>
		({
			projectId,
			parentId,
			type: "common_area",
			name,
			position,
		}) satisfies Insertable;

	const roots = [
		...structure.towers.map(
			(tower, position) =>
				({
					projectId,
					parentId: null,
					type: "tower",
					name: tower.name,
					position,
				}) satisfies Insertable,
		),
		...(structure.commonAreas ?? []).map((name, i) => area(null, name, i)),
	];
	const rootIds = await insertLevel(roots);
	const towerIds = rootIds.slice(0, structure.towers.length);

	const floorRows = structure.towers.flatMap((tower, towerIndex) =>
		tower.floors.map(
			(floor, position) =>
				({
					projectId,
					parentId: towerIds[towerIndex]!,
					type: "floor",
					name: floor.name,
					position,
				}) satisfies Insertable,
		),
	);
	const towerAreaRows = structure.towers.flatMap((tower, towerIndex) =>
		(tower.commonAreas ?? []).map((name, i) =>
			area(towerIds[towerIndex]!, name, tower.floors.length + i),
		),
	);
	const floorIds = await insertLevel(floorRows);
	const towerAreaIds = await insertLevel(towerAreaRows);

	const unitTypeIds = await insertUnitTypes(db, projectId, structure);

	const placed = structure.towers.flatMap((tower) =>
		tower.floors.map((floor) => ({ tower: tower.name, floor })),
	);

	const unitAndAreaRows: Insertable[] = [];
	const rowOwners: (
		{ kind: "unit"; ref: SeedUnitRef } | { kind: "area"; name: string }
	)[] = [];
	for (const [index, { tower, floor }] of placed.entries()) {
		const parentId = floorIds[index]!;
		floor.units.forEach((name, stack) => {
			const ref = { tower, floor: floor.name, name, stack };
			const typeName = structure.unitTypeOf?.(ref);
			unitAndAreaRows.push({
				projectId,
				parentId,
				type: "unit",
				name,
				position: stack,
				unitTypeId: typeName ? unitTypeIds.get(typeName)!.id : null,
			} satisfies Insertable);
			rowOwners.push({ kind: "unit", ref });
		});
		(floor.commonAreas ?? []).forEach((name, i) => {
			unitAndAreaRows.push(area(parentId, name, floor.units.length + i));
			rowOwners.push({ kind: "area", name });
		});
	}
	const unitAndAreaIds = await insertLevel(unitAndAreaRows);

	const roomRows: (typeof room.$inferInsert)[] = [];
	const droppedRows: (typeof droppedRoom.$inferInsert)[] = [];
	const addAreaRooms = (locationId: string, areaName: string) => {
		(structure.commonAreaRooms?.[areaName] ?? []).forEach((name, position) =>
			roomRows.push({ locationId, name, position }),
		);
	};
	(structure.commonAreas ?? []).forEach((name, i) =>
		addAreaRooms(rootIds[structure.towers.length + i]!, name),
	);
	structure.towers
		.flatMap((tower) => tower.commonAreas ?? [])
		.forEach((name, i) => addAreaRooms(towerAreaIds[i]!, name));
	rowOwners.forEach((owner, index) => {
		const locationId = unitAndAreaIds[index]!;
		if (owner.kind === "area") {
			addAreaRooms(locationId, owner.name);
			return;
		}
		const typeName = structure.unitTypeOf?.(owner.ref);
		const change = structure.unitChanges?.find(
			(candidate) =>
				candidate.tower === owner.ref.tower &&
				candidate.unit === owner.ref.name,
		);
		const typed = typeName ? unitTypeIds.get(typeName) : undefined;
		let position = 0;
		for (const [typeRoomName, unitTypeRoomId] of typed?.rooms ?? []) {
			if (change?.droppedRooms?.includes(typeRoomName)) {
				droppedRows.push({ locationId, unitTypeRoomId });
				continue;
			}
			const renamedTo = change?.renamedRooms?.[typeRoomName];
			roomRows.push({
				locationId,
				name: renamedTo ?? typeRoomName,
				position: position++,
				unitTypeRoomId,
				renamed: renamedTo !== undefined,
			});
		}
		for (const name of change?.addedRooms ?? []) {
			roomRows.push({ locationId, name, position: position++ });
		}
	});
	for (const chunk of inChunks(roomRows)) await db.insert(room).values(chunk);
	for (const chunk of inChunks(droppedRows)) {
		await db.insert(droppedRoom).values(chunk);
	}
}

async function insertUnitTypes(
	db: Pick<Database, "insert">,
	projectId: string,
	structure: SeedStructure,
): Promise<Map<string, { id: string; rooms: Map<string, string> }>> {
	const created = new Map<string, { id: string; rooms: Map<string, string> }>();
	for (const seed of structure.unitTypes ?? []) {
		const [inserted] = await db
			.insert(unitType)
			.values({ projectId, name: seed.name })
			.returning({ id: unitType.id });
		const insertedRooms =
			seed.rooms.length === 0
				? []
				: await db
						.insert(unitTypeRoom)
						.values(
							seed.rooms.map((name, position) => ({
								unitTypeId: inserted!.id,
								name,
								position,
							})),
						)
						.returning({ id: unitTypeRoom.id });
		created.set(seed.name, {
			id: inserted!.id,
			rooms: new Map(
				seed.rooms.map((name, i) => [name, insertedRooms[i]!.id] as const),
			),
		});
	}
	return created;
}

const CHUNK = 2000;

function* inChunks<T>(rows: T[]): Generator<T[]> {
	for (let start = 0; start < rows.length; start += CHUNK) {
		yield rows.slice(start, start + CHUNK);
	}
}
