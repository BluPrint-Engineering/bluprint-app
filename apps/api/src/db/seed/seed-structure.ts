import type { Database } from "../database.module";
import { location } from "../../structure/location.entity";

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
	await insertLevel(towerAreaRows);

	const floors = structure.towers.flatMap((tower) => tower.floors);
	const unitAndAreaRows = floors.flatMap((floor, index) => [
		...floor.units.map(
			(name, position) =>
				({
					projectId,
					parentId: floorIds[index]!,
					type: "unit",
					name,
					position,
				}) satisfies Insertable,
		),
		...(floor.commonAreas ?? []).map((name, i) =>
			area(floorIds[index]!, name, floor.units.length + i),
		),
	]);
	await insertLevel(unitAndAreaRows);
}
