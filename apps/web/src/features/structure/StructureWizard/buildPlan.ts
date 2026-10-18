import {
	type NewLocation,
	type NewUnitType,
	type StructureCounts,
	tidyLocationName,
} from "@bluprint/shared";
import { unitTypeKeyFor } from "./unitTypeRules";
import {
	FLOOR_HALL,
	type ParsedTower,
	parseTower,
	SINGLE_TOWER_NAME,
	unitName,
	type WizardDraft,
} from "./wizardDraft";

export interface PlanArea {
	key: string;
	name: string;
}

export interface PlanUnit {
	name: string;
	unitType: string | null;
}

export interface PlanFloor {
	label: string;
	added: boolean;
	units: PlanUnit[];
	areas: PlanArea[];
}

export interface PlanTower {
	key: string;
	name: string;
	floors: PlanFloor[];
	valid: boolean;
}

export interface PlanUnitTypeCount {
	key: string;
	name: string;
	units: number;
}

export interface Plan {
	unitTypes: NewUnitType[];
	locations: NewLocation[];
	counts: StructureCounts;
	towers: PlanTower[];
	unitTypeCounts: PlanUnitTypeCount[];
	untyped: number;
}

export const floorName = (floor: number) => `${floor}º andar`;

export const GROUND_FLOOR = "Térreo";
export const GROUND_HALL = "Hall de entrada";

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
		unitTypeKey: string | null = null,
	) => {
		const id = idFor(key);
		const appended =
			draft.extend !== undefined && parentId === draft.extend.towerId;
		locations.push({
			id,
			parentId,
			type,
			name,
			...(!appended && { position }),
			...(unitTypeKey !== null && { unitTypeId: unitTypeIdOf(unitTypeKey) }),
		});
		return id;
	};

	const unitTypeNames = new Map(
		draft.unitTypes.map(({ key, name }) => [key, tidyLocationName(name)]),
	);
	const existingTypes = new Set(
		draft.unitTypes.filter(({ existing }) => existing).map(({ key }) => key),
	);
	const unitTypeIdKey = (key: string) => `unit-type:${key}`;
	const unitTypeIdOf = (key: string) =>
		existingTypes.has(key) ? key : idFor(unitTypeIdKey(key));
	const typedUnits = new Map<string, number>();
	let untyped = 0;

	const several = draft.towers.length > 1;
	const towers: PlanTower[] = [];

	draft.towers.forEach((tower, towerIndex) => {
		const name = draft.extend
			? draft.extend.towerName
			: several
				? tower.name.trim()
				: SINGLE_TOWER_NAME;
		const parsed: ParsedTower | undefined = parseTower(tower);
		if (!parsed) {
			towers.push({ key: tower.key, name, floors: [], valid: false });
			return;
		}

		const towerId =
			draft.extend?.towerId ??
			add(`tower:${towerIndex}`, null, "tower", name, towerIndex);
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
				added: false,
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
			const units: PlanUnit[] = [];
			for (let at = 0; at < parsed.perFloor; at++) {
				const name = unitName(number, at, draft.numbering);
				const ruled = unitTypeKeyFor(draft.rules, towerIndex, number, at + 1);
				const typeKey =
					ruled !== null && unitTypeNames.has(ruled) ? ruled : null;
				add(`${floorKey}:unit:${at}`, floorId, "unit", name, at, typeKey);
				units.push({
					name,
					unitType:
						typeKey === null ? null : (unitTypeNames.get(typeKey) ?? null),
				});
				if (typeKey === null) untyped++;
				else typedUnits.set(typeKey, (typedUnits.get(typeKey) ?? 0) + 1);
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

			floors.push({
				label: `${number}º`,
				added: draft.extend !== undefined,
				units,
				areas,
			});
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
		unitTypes: draft.unitTypes
			.filter(({ existing }) => !existing)
			.map(({ key, rooms }) => ({
				id: unitTypeIdOf(key),
				name: unitTypeNames.get(key) ?? "",
				rooms: rooms.map((name, at) => ({
					id: idFor(`${unitTypeIdKey(key)}:room:${at}`),
					name,
				})),
			})),
		unitTypeCounts: draft.unitTypes
			.filter(({ key }) => typedUnits.has(key))
			.map(({ key }) => ({
				key,
				name: unitTypeNames.get(key) ?? "",
				units: typedUnits.get(key) ?? 0,
			})),
		untyped,
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
