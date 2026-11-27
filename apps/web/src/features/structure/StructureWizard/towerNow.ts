import type { StructureFloor, StructureTower } from "@bluprint/shared";
import { floorNumber } from "../floorLabel";
import type { StoredFloor } from "./floorPosition";
import type { Numbering } from "./floorRanges";

export interface TowerNow {
	floors: number;
	numbered: number[];
	stored: StoredFloor[];
	lastFloor: StructureFloor | undefined;
	lettered: boolean;
}

export function describeTower(tower: StructureTower): TowerNow {
	const numbered = tower.floors.flatMap((floor) => {
		const number = floorNumber(floor.name);
		return number === undefined ? [] : [{ floor, number }];
	});
	const top = numbered.reduce<(typeof numbered)[number] | undefined>(
		(highest, each) =>
			highest === undefined || each.number > highest.number ? each : highest,
		undefined,
	);
	return {
		floors: tower.floors.length,
		numbered: numbered.map(({ number }) => number).sort((a, b) => a - b),
		stored: tower.floors.map((floor) => ({
			number: floorNumber(floor.name),
			position: floor.position,
		})),
		lastFloor: top?.floor,
		lettered: tower.floors.some((floor) =>
			floor.units.some((unit) => /^\d+[A-Z]+$/i.test(unit.name)),
		),
	};
}

const labelOf = (tower: StructureTower, named: boolean) =>
	named ? `A ${tower.name}` : "A obra";

const whereOf = (tower: StructureTower, named: boolean) =>
	named ? `na ${tower.name}` : "na obra";

export function towerNowLine(tower: StructureTower, named: boolean): string {
	const now = describeTower(tower);
	const label = labelOf(tower, named);
	if (now.numbered.length === 0) {
		return now.floors === 0
			? `${label} ainda não tem andares.`
			: `${label} ainda não tem andares numerados.`;
	}
	return `${label} tem hoje ${floorRuns(now.numbered)} andar. Use andares que ela ainda não tem.`;
}

function floorRuns(sorted: readonly number[]): string {
	const runs: [number, number][] = [];
	for (const number of sorted) {
		const run = runs.at(-1);
		if (run && number === run[1] + 1) run[1] = number;
		else runs.push([number, number]);
	}
	const parts = runs.map(([first, last]) =>
		first === last ? `o ${first}º` : `do ${first}º ao ${last}º`,
	);
	const last = parts.at(-1) ?? "";
	return parts.length === 1
		? last
		: `${parts.slice(0, -1).join(", ")} e ${last}`;
}

export function newFloorsLead(tower: StructureTower, named: boolean): string {
	return `Os andares novos entram ${whereOf(tower, named)} pela ordem do número, com as suas faixas e finais.`;
}

export function hallRepeatLine(tower: StructureTower, named: boolean): string {
	const whose = named ? `da ${tower.name}` : "da obra";
	return `Repete a escolha ${whose}. Desmarque para não criar os halls só nesta adição.`;
}

export interface ExtendFacts {
	name: string;
	named: boolean;
	numbering: Numbering;
	takenFloors: number[];
	takenUnits: string[];
	storedFloors: StoredFloor[];
}

export function extendFacts(
	tower: StructureTower,
	named: boolean,
): ExtendFacts {
	const now = describeTower(tower);
	return {
		name: tower.name,
		named,
		numbering: now.lettered ? "letters" : "digits",
		takenFloors: now.numbered,
		takenUnits: tower.floors.flatMap((floor) =>
			floor.units.map((unit) => unit.name),
		),
		storedFloors: now.stored,
	};
}
