import {
	type CreateStructure,
	comparableLocationName,
	LOCATION_NAME_MAX_LENGTH,
	type NewLocation,
	type Structure,
	type StructureFloor,
	type StructureTower,
	type StructureUnit,
	type SubtreeRooms,
} from "@bluprint/shared";
import { floorNumber, highestFloorNumber } from "./floorLabel";
import { nextTowerName, nextUnitName } from "./naming";

export type DuplicateSource =
	| { type: "tower"; tower: StructureTower }
	| { type: "floor"; tower: StructureTower; floor: StructureFloor }
	| {
			type: "unit";
			tower: StructureTower;
			floor: StructureFloor;
			unit: StructureUnit;
	  };

export type DuplicateKind = DuplicateSource["type"];

export function findDuplicateSource(
	structure: Structure,
	type: DuplicateKind,
	id: string,
): DuplicateSource | undefined {
	for (const tower of structure.towers) {
		if (type === "tower" && tower.id === id) return { type, tower };
		for (const floor of tower.floors) {
			if (type === "floor" && floor.id === id) return { type, tower, floor };
			const unit = floor.units.find((each) => each.id === id);
			if (type === "unit" && unit) return { type, tower, floor, unit };
		}
	}
	return undefined;
}

export function sourceName(source: DuplicateSource): string {
	switch (source.type) {
		case "tower":
			return source.tower.name;
		case "floor":
			return source.floor.name;
		case "unit":
			return source.unit.name;
	}
}

export function unitsCopied(source: DuplicateSource): number {
	switch (source.type) {
		case "tower":
			return source.tower.floors.reduce(
				(sum, floor) => sum + floor.units.length,
				0,
			);
		case "floor":
			return source.floor.units.length;
		case "unit":
			return 1;
	}
}

export function locationsCopied(source: DuplicateSource): number {
	const ofFloor = (floor: StructureFloor) =>
		1 + floor.units.length + floor.commonAreas.length;
	switch (source.type) {
		case "tower":
			return source.tower.floors.reduce(
				(sum, floor) => sum + ofFloor(floor),
				1 + source.tower.commonAreas.length,
			);
		case "floor":
			return ofFloor(source.floor);
		case "unit":
			return 1;
	}
}

export function suggestedCopyName(
	source: DuplicateSource,
	structure: Structure,
): string {
	switch (source.type) {
		case "tower":
			return nextTowerName(structure.towers.map(({ name }) => name));
		case "floor": {
			const top = highestFloorNumber(
				source.tower.floors.map(({ name }) => name),
			);
			return top === undefined ? "" : `${top + 1}º andar`;
		}
		case "unit":
			return nextUnitName(
				source.floor.name,
				source.floor.units.map(({ name }) => name),
				source.tower.floors.flatMap((floor) =>
					floor.units.map(({ name }) => name),
				),
			);
	}
}

function renumbered(
	name: string,
	from: number | undefined,
	to: number | undefined,
): string | undefined {
	if (from === undefined || to === undefined) return undefined;
	const prefix = String(from);
	if (!name.startsWith(prefix) || name.length === prefix.length) {
		return undefined;
	}
	const result = `${to}${name.slice(prefix.length)}`;
	return result.length <= LOCATION_NAME_MAX_LENGTH ? result : undefined;
}

function floorNumbers(
	tower: StructureTower,
	floor: StructureFloor,
	name: string,
): { from: number | undefined; to: number } {
	return {
		from: floorNumber(floor.name),
		to:
			floorNumber(name) ??
			(highestFloorNumber(tower.floors.map((each) => each.name)) ?? 0) + 1,
	};
}

export function renumberedUnitNames(
	source: DuplicateSource,
	name: string,
): Set<string> {
	if (source.type !== "floor") return new Set();
	const { from, to } = floorNumbers(source.tower, source.floor, name);
	return new Set(
		source.floor.units.flatMap((unit) => {
			const result = renumbered(unit.name, from, to);
			return result === undefined ? [] : [result];
		}),
	);
}

export function copiedUnitName(
	name: string,
	from: number | undefined,
	to: number | undefined,
	taken: ReadonlySet<string>,
): string {
	const byFloor = renumbered(name, from, to);
	if (byFloor !== undefined) return byFloor;
	for (let copy = 1; ; copy++) {
		const suffix = ` cópia ${copy}`;
		const base = name
			.slice(0, LOCATION_NAME_MAX_LENGTH - suffix.length)
			.trimEnd();
		const candidate = `${base}${suffix}`;
		if (!taken.has(comparableLocationName(candidate))) return candidate;
	}
}

export function buildDuplicate(
	source: DuplicateSource,
	name: string,
	below: SubtreeRooms,
	idFor: (key: string) => string,
): CreateStructure {
	const roomsOf = new Map(below.locations.map((entry) => [entry.id, entry]));
	const locations: NewLocation[] = [];

	const rooms = (sourceId: string) => {
		const found = roomsOf.get(sourceId);
		if (!found) return {};
		return {
			rooms: found.rooms.map((room) => ({
				id: idFor(`room:${room.id}`),
				name: room.name,
				...(room.unitTypeRoomId !== null && {
					unitTypeRoomId: room.unitTypeRoomId,
				}),
				...(room.renamed && { renamed: true }),
			})),
			...(found.droppedRooms.length > 0 && {
				droppedRooms: found.droppedRooms.map((room) => room.unitTypeRoomId),
			}),
		};
	};

	const addUnit = (
		unit: StructureUnit,
		parentId: string,
		unitName: string,
		position?: number,
	) => {
		locations.push({
			id: idFor(`location:${unit.id}`),
			parentId,
			type: "unit",
			name: unitName,
			...(position !== undefined && { position }),
			...(unit.unitType && { unitTypeId: unit.unitType.id }),
			...rooms(unit.id),
		});
	};

	const addArea = (
		area: { id: string; name: string },
		parentId: string,
		position: number,
	) => {
		locations.push({
			id: idFor(`location:${area.id}`),
			parentId,
			type: "common_area",
			name: area.name,
			position,
			...rooms(area.id),
		});
	};

	const addFloor = (
		floor: StructureFloor,
		parentId: string,
		floorName: string,
		position: number | undefined,
		unitName: (name: string) => string,
	) => {
		const id = idFor(`location:${floor.id}`);
		locations.push({
			id,
			parentId,
			type: "floor",
			name: floorName,
			...(position !== undefined && { position }),
		});
		floor.units.forEach((unit, at) => {
			addUnit(unit, id, unitName(unit.name), at);
		});
		floor.commonAreas.forEach((area, at) => {
			addArea(area, id, floor.units.length + at);
		});
	};

	switch (source.type) {
		case "unit": {
			const { floor, unit } = source;
			addUnit(unit, floor.id, name);
			break;
		}
		case "floor": {
			const { tower, floor } = source;
			const { from, to } = floorNumbers(tower, floor, name);
			const taken = new Set(
				tower.floors.flatMap((each) =>
					each.units.map((unit) => comparableLocationName(unit.name)),
				),
			);
			addFloor(floor, tower.id, name, undefined, (unitName) => {
				const copy = copiedUnitName(unitName, from, to, taken);
				taken.add(comparableLocationName(copy));
				return copy;
			});
			break;
		}
		case "tower": {
			const { tower } = source;
			const id = idFor(`location:${tower.id}`);
			locations.push({ id, parentId: null, type: "tower", name });
			tower.floors.forEach((floor, at) => {
				addFloor(floor, id, floor.name, at, (unitName) => unitName);
			});
			tower.commonAreas.forEach((area, at) => {
				addArea(area, id, tower.floors.length + at);
			});
			break;
		}
	}

	return { unitTypes: [], locations, copy: true };
}
