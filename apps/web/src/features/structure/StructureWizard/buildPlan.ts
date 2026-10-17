import type { NewLocation, StructureCounts } from "@bluprint/shared";
import {
	type ParsedTower,
	parseTower,
	SINGLE_TOWER_NAME,
	type WizardDraft,
} from "./wizardDraft";

export interface PlanArea {
	key: string;
	name: string;
}

export interface PlanFloor {
	label: string;
	units: string[];
	areas: PlanArea[];
}

export interface PlanTower {
	key: string;
	name: string;
	floors: PlanFloor[];
	valid: boolean;
}

export interface Plan {
	locations: NewLocation[];
	counts: StructureCounts;
	towers: PlanTower[];
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function letters(index: number): string {
	const head =
		index >= LETTERS.length
			? letters(Math.floor(index / LETTERS.length) - 1)
			: "";
	return `${head}${LETTERS[index % LETTERS.length]}`;
}

export function unitName(
	floor: number,
	index: number,
	numbering: WizardDraft["numbering"],
): string {
	return numbering === "letters"
		? `${floor}${letters(index)}`
		: `${floor}${String(index + 1).padStart(2, "0")}`;
}

export const floorName = (floor: number) => `${floor}º andar`;

export const GROUND_FLOOR = "Térreo";
export const GROUND_HALL = "Hall de entrada";
export const FLOOR_HALL = "Hall";

export function buildPlan(
	draft: WizardDraft,
	idFor: (key: string) => string,
): Plan {
	const locations: NewLocation[] = [];
	const add = (
		key: string,
		parentId: string | null,
		type: NewLocation["type"],
		name: string,
		position: number,
	) => {
		const id = idFor(key);
		locations.push({ id, parentId, type, name, position });
		return id;
	};

	const several = draft.towers.length > 1;
	const towers: PlanTower[] = [];

	draft.towers.forEach((tower, towerIndex) => {
		const name = several ? tower.name.trim() : SINGLE_TOWER_NAME;
		const parsed: ParsedTower | undefined = parseTower(tower);
		if (!parsed) {
			towers.push({ key: tower.key, name, floors: [], valid: false });
			return;
		}

		const towerId = add(`tower:${towerIndex}`, null, "tower", name, towerIndex);
		const floors: PlanFloor[] = [];
		let position = 0;

		if (tower.ground) {
			const groundId = add(
				`tower:${towerIndex}:ground`,
				towerId,
				"floor",
				GROUND_FLOOR,
				position++,
			);
			const hallKey = `tower:${towerIndex}:ground:hall`;
			add(hallKey, groundId, "common_area", GROUND_HALL, 0);
			floors.push({
				label: GROUND_FLOOR,
				units: [],
				areas: [{ key: hallKey, name: GROUND_HALL }],
			});
		}

		for (let number = parsed.first; number <= parsed.last; number++) {
			const floorKey = `tower:${towerIndex}:floor:${number}`;
			const floorId = add(
				floorKey,
				towerId,
				"floor",
				floorName(number),
				position++,
			);
			const units: string[] = [];
			for (let at = 0; at < parsed.perFloor; at++) {
				const unit = unitName(number, at, draft.numbering);
				add(`${floorKey}:unit:${at}`, floorId, "unit", unit, at);
				units.push(unit);
			}

			const names: string[] = [];
			if (tower.hall) names.push(FLOOR_HALL);
			for (const area of draft.floorAreas) {
				if (area.tower === towerIndex && Number(area.floor) === number) {
					names.push(area.name.trim());
				}
			}
			const areas = names.map((name, at) => {
				const key = `${floorKey}:area:${at}`;
				add(key, floorId, "common_area", name, parsed.perFloor + at);
				return { key, name };
			});

			floors.push({ label: `${number}º`, units, areas });
		}

		if (several) {
			draft.towerAreas.forEach((area, at) => {
				add(
					`tower:${towerIndex}:area:${at}`,
					towerId,
					"common_area",
					area.trim(),
					position + at,
				);
			});
		}

		towers.push({ key: tower.key, name, floors, valid: true });
	});

	draft.projectAreas.forEach((area, at) => {
		add(
			`project:area:${at}`,
			null,
			"common_area",
			area.trim(),
			draft.towers.length + at,
		);
	});

	const count = (type: NewLocation["type"]) =>
		locations.filter((location) => location.type === type).length;

	return {
		locations,
		counts: {
			towers: count("tower"),
			floors: count("floor"),
			units: count("unit"),
			commonAreas: count("common_area"),
		},
		towers,
	};
}
