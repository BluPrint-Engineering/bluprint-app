import type { StructureFloor, StructureTower } from "@bluprint/shared";
import { floorNumber } from "../floorLabel";
import { plural } from "../plural";

export interface TowerNow {
	floors: number;
	numbered: number[];
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
		lastFloor: top?.floor,
		lettered: tower.floors.some((floor) =>
			floor.units.some((unit) => /^\d+[A-Z]+$/i.test(unit.name)),
		),
	};
}

const labelOf = (tower: StructureTower, named: boolean) =>
	named ? `A ${tower.name}` : "A obra";

export function towerNowLine(tower: StructureTower, named: boolean): string {
	const now = describeTower(tower);
	const label = labelOf(tower, named);
	if (now.floors === 0) return `${label} ainda não tem andares.`;
	const first = now.numbered[0];
	const last = now.numbered.at(-1);
	const perFloor = now.lastFloor?.units.length ?? 0;
	const parts = [
		`${label} tem hoje ${plural(now.floors, "andar", "andares")}`,
		...(first !== undefined && last !== undefined
			? [`do ${first}º ao ${last}º`]
			: []),
		...(perFloor > 0
			? [`com ${plural(perFloor, "unidade", "unidades")} por andar`]
			: []),
	];
	return `${parts.join(", ")}.`;
}

export function newFloorsLead(tower: StructureTower, named: boolean): string {
	const where = named ? ` da ${tower.name}` : "";
	return describeTower(tower).numbered.length === 0
		? `Os andares entram ${named ? `na ${tower.name}` : "na obra"}, a partir do 1º.`
		: `Os andares entram acima do último andar${where}, com a mesma numeração.`;
}
