import {
	type NewLocation,
	type NewTypology,
	type StructureCounts,
	type TypologyLocationType,
	tidyLocationName,
} from "@bluprint/shared";
import type { ReserveParts } from "../reserveText";
import {
	assignUnits,
	type DraftUnit,
	type TowerConflict,
} from "./assignmentRules";
import { positionsForNewFloors } from "./floorPosition";
import { isBlankRange, towerFloors } from "./floorRanges";
import type { ExtendFacts } from "./towerNow";
import { FLOOR_HALL, SINGLE_TOWER_NAME, type WizardDraft } from "./wizardDraft";

export interface PlanArea {
	key: string;
	name: string;
}

export interface PlanUnit {
	name: string;
	typology: string | null;
}

export interface PlanFloor {
	label: string;
	added: boolean;
	units: PlanUnit[];
	areas: PlanArea[];
}

export type PlanTowerState = "valid" | "blank" | "invalid";

export interface PlanTower {
	key: string;
	name: string;
	floors: PlanFloor[];
	state: PlanTowerState;
	units: number;
	numberedFloors: number;
}

export interface PlanTypologyCount {
	key: string;
	name: string;
	units: number;
}

export interface Plan {
	typologies: NewTypology[];
	locations: NewLocation[];
	counts: StructureCounts;
	towers: PlanTower[];
	typologyCounts: PlanTypologyCount[];
	untyped: number;
	conflicts: TowerConflict[];
	unitsByRule: Record<string, number>;
	complete: boolean;
	spend: ReserveParts;
}

export const floorName = (floor: number) => `${floor}º andar`;

export const GROUND_FLOOR = "Térreo";
export const GROUND_HALL = "Hall de entrada";

export interface KnownTypology {
	id: string;
	name: string;
	locationType: TypologyLocationType;
}

export function buildPlan(
	draft: WizardDraft,
	idFor: (key: string) => string,
	facts?: ExtendFacts,
	known: readonly KnownTypology[] = [],
): Plan {
	const locations: NewLocation[] = [];
	const add = (
		key: string,
		parentId: string | null,
		type: NewLocation["type"],
		name: string,
		position: number | undefined,
		typologyId: string | null = null,
	) => {
		const id = idFor(key);
		locations.push({
			id,
			parentId,
			type,
			name,
			...(position !== undefined && { position }),
			...(typologyId !== null && { typologyId }),
		});
		return id;
	};

	const typologyNames = new Map<string, string>([
		...known.map(({ id, name }) => [id, tidyLocationName(name)] as const),
		...draft.typologies.map(
			({ key, name }) => [key, tidyLocationName(name)] as const,
		),
	]);
	const knownById = new Map(known.map((typology) => [typology.id, typology]));
	const typologyIdKey = (key: string) => `typology:${key}`;
	const resolvedId = (
		key: string | null,
		kind: TypologyLocationType,
	): string | null => {
		if (key === null) return null;
		const drafted = draft.typologies.find((typology) => typology.key === key);
		if (drafted) {
			return drafted.locationType === kind ? idFor(typologyIdKey(key)) : null;
		}
		const stored = knownById.get(key);
		return stored?.locationType === kind ? key : null;
	};
	const numbering = draft.extend && facts ? facts.numbering : draft.numbering;
	const draftUnits: DraftUnit[] = draft.towers.flatMap((tower) =>
		(towerFloors(tower.ranges, numbering) ?? []).flatMap(({ number, stacks }) =>
			stacks.map(({ position }) => ({
				tower: tower.key,
				floor: number,
				final: position,
			})),
		),
	);
	const assignments = assignUnits(draftUnits, draft.rules);
	const outcomes = new Map(
		assignments.units.map(({ unit, outcome }) => [
			JSON.stringify([unit.tower, unit.floor, unit.final]),
			outcome,
		]),
	);
	const typedUnits = new Map<string, number>();
	let untyped = 0;
	const spend: ReserveParts = {
		units: 0,
		floorHalls: 0,
		entranceHalls: 0,
		otherAreas: 0,
	};

	const several = draft.towers.length > 1;
	const towers: PlanTower[] = [];

	draft.towers.forEach((tower, towerIndex) => {
		const name = draft.extend
			? (facts?.name ?? "")
			: several
				? tower.name.trim()
				: SINGLE_TOWER_NAME;
		const parsed = towerFloors(tower.ranges, numbering);
		if (!parsed) {
			towers.push({
				key: tower.key,
				name,
				floors: [],
				state: tower.ranges.every(isBlankRange) ? "blank" : "invalid",
				units: 0,
				numberedFloors: 0,
			});
			return;
		}

		const towerKey = `tower:${tower.key}`;
		const towerId =
			draft.extend?.towerId ?? add(towerKey, null, "tower", name, towerIndex);
		const floors: PlanFloor[] = [];
		let position = 0;
		let towerUnits = 0;
		const placed = draft.extend
			? positionsForNewFloors(
					facts?.storedFloors ?? [],
					(parsed ?? []).map(({ number }) => number),
				)
			: undefined;

		if (tower.ground) {
			const groundId = add(
				`${towerKey}:ground`,
				towerId,
				"floor",
				GROUND_FLOOR,
				position++,
			);
			const hallKey = `${towerKey}:ground:hall`;
			add(
				hallKey,
				groundId,
				"common_area",
				GROUND_HALL,
				0,
				resolvedId(tower.entranceTypology, "common_area"),
			);
			spend.entranceHalls++;
			floors.push({
				label: GROUND_FLOOR,
				added: false,
				units: [],
				areas: [{ key: hallKey, name: GROUND_HALL }],
			});
		}

		for (const { number, stacks } of parsed) {
			const floorKey = `${towerKey}:floor:${number}`;
			const floorId = add(
				floorKey,
				towerId,
				"floor",
				floorName(number),
				placed ? placed.get(number) : position++,
			);
			const units: PlanUnit[] = stacks.map((stack, at) => {
				const name = `${number}${stack.label}`;
				const outcome = outcomes.get(
					JSON.stringify([tower.key, number, stack.position]),
				);
				const ruled = outcome?.kind === "typology" ? outcome.typology : null;
				const typeKey =
					ruled !== null && typologyNames.has(ruled) ? ruled : null;
				const typeId = resolvedId(typeKey, "unit");
				add(
					`${floorKey}:unit:${stack.position}`,
					floorId,
					"unit",
					name,
					at,
					typeId,
				);
				if (outcome?.kind === "conflict") {
					return { name, typology: null };
				}
				if (typeKey === null || typeId === null) untyped++;
				else typedUnits.set(typeKey, (typedUnits.get(typeKey) ?? 0) + 1);
				return {
					name,
					typology:
						typeKey === null ? null : (typologyNames.get(typeKey) ?? null),
				};
			});
			towerUnits += units.length;

			const namedAreas: { name: string; typology: string | null }[] = [];
			if (tower.hall) {
				namedAreas.push({
					name: FLOOR_HALL,
					typology: tower.hallTypology,
				});
				spend.floorHalls++;
			}
			for (const area of draft.floorAreas) {
				if (area.tower === towerIndex && Number(area.floor) === number) {
					namedAreas.push({
						name: area.name.trim(),
						typology: area.typology,
					});
					spend.otherAreas++;
				}
			}
			const areas = namedAreas.map((area, at) => {
				const key = `${floorKey}:area:${at}`;
				add(
					key,
					floorId,
					"common_area",
					area.name,
					stacks.length + at,
					resolvedId(area.typology, "common_area"),
				);
				return { key, name: area.name };
			});

			floors.push({
				label: `${number}º`,
				added: draft.extend !== undefined,
				units,
				areas,
			});
		}
		spend.units += towerUnits;

		if (several) {
			draft.towerAreas.forEach((area, at) => {
				add(
					`${towerKey}:area:${at}`,
					towerId,
					"common_area",
					area.name.trim(),
					position + at,
					resolvedId(area.typology, "common_area"),
				);
				spend.otherAreas++;
			});
		}

		towers.push({
			key: tower.key,
			name,
			floors,
			state: "valid",
			units: towerUnits,
			numberedFloors: parsed.length,
		});
	});

	draft.projectAreas.forEach((area, at) => {
		add(
			`project:area:${at}`,
			null,
			"common_area",
			area.name.trim(),
			draft.towers.length + at,
			resolvedId(area.typology, "common_area"),
		);
		spend.otherAreas++;
	});

	const count = (type: NewLocation["type"]) =>
		locations.filter((location) => location.type === type).length;

	return {
		typologies: draft.typologies.map(({ key, rooms, locationType }) => ({
			id: idFor(typologyIdKey(key)),
			name: typologyNames.get(key) ?? "",
			locationType,
			rooms: rooms.map((name, at) => ({
				id: idFor(`${typologyIdKey(key)}:room:${at}`),
				name,
			})),
		})),
		typologyCounts: [
			...known.map(({ id }) => id),
			...draft.typologies.map(({ key }) => key),
		]
			.filter((key) => typedUnits.has(key))
			.map((key) => ({
				key,
				name: typologyNames.get(key) ?? "",
				units: typedUnits.get(key) ?? 0,
			})),
		untyped,
		conflicts: assignments.conflicts,
		unitsByRule: assignments.reach,
		locations,
		counts: {
			towers: count("tower"),
			floors: count("floor"),
			units: count("unit"),
			commonAreas: count("common_area"),
		},
		towers,
		complete: towers.every(({ state }) => state === "valid"),
		spend,
	};
}

export const reserveUsed = (spend: ReserveParts) =>
	spend.units + spend.floorHalls + spend.entranceHalls + spend.otherAreas;
