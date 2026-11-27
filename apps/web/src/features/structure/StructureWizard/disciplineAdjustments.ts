import {
	type Discipline,
	disciplineApplies,
	type TypologyLocationType,
} from "@bluprint/shared";

export interface DisciplineLocation {
	address: string;
	type: TypologyLocationType;
	tower: string | null;
	floor: string | null;
}

export type DisciplineDefaults = Pick<
	Discipline,
	"id" | "name" | "type" | "appliesEverywhere"
>;

export interface DisciplineAdjustment {
	addresses: readonly string[];
	on: readonly string[];
	off: readonly string[];
}

export type DisciplineTarget =
	| { kind: "floor"; floor: string }
	| { kind: "tower"; tower: string };

export interface DisciplineException {
	disciplineId: string;
	applies: boolean;
}

interface Named {
	address: string;
	type: TypologyLocationType;
	overrides: Map<string, boolean>;
}

function listedDisciplines(
	disciplines: readonly DisciplineDefaults[],
): DisciplineDefaults[] {
	return disciplines.filter(({ type }) => type !== "general");
}

function namedAt(
	locations: readonly DisciplineLocation[],
	adjustments: readonly DisciplineAdjustment[],
): Named[] {
	const reached = adjustments.map(
		(adjustment) => new Set(adjustment.addresses),
	);
	return locations.map(({ address, type }) => {
		const overrides = new Map<string, boolean>();
		adjustments.forEach((adjustment, at) => {
			if (!reached[at]?.has(address)) return;
			for (const id of adjustment.on) overrides.set(id, true);
			for (const id of adjustment.off) overrides.set(id, false);
		});
		return { address, type, overrides };
	});
}

export function resolveTarget(
	locations: readonly DisciplineLocation[],
	target: DisciplineTarget,
): string[] {
	return locations
		.filter((location) =>
			target.kind === "floor"
				? location.floor === target.floor
				: location.tower === target.tower,
		)
		.map(({ address }) => address);
}

export function disciplinesByLocation(
	locations: readonly DisciplineLocation[],
	disciplines: readonly DisciplineDefaults[],
	adjustments: readonly DisciplineAdjustment[],
): Map<string, string[]> {
	const listed = listedDisciplines(disciplines);
	return new Map(
		namedAt(locations, adjustments).map(({ address, type, overrides }) => {
			return [
				address,
				listed
					.filter((discipline) =>
						disciplineApplies(
							type,
							discipline,
							overrides.get(discipline.id) ?? null,
						),
					)
					.map(({ id }) => id),
			];
		}),
	);
}

export function disciplineExceptions(
	locations: readonly DisciplineLocation[],
	disciplines: readonly DisciplineDefaults[],
	adjustments: readonly DisciplineAdjustment[],
): Map<string, DisciplineException[]> {
	const listed = listedDisciplines(disciplines);
	return new Map(
		namedAt(locations, adjustments).map(({ address, type, overrides }) => {
			const exceptions: DisciplineException[] = [];
			for (const discipline of listed) {
				const override = overrides.get(discipline.id);
				if (override === undefined) continue;
				if (override !== disciplineApplies(type, discipline, null)) {
					exceptions.push({ disciplineId: discipline.id, applies: override });
				}
			}
			return [address, exceptions];
		}),
	);
}

export function tidyAdjustments(
	adjustments: readonly DisciplineAdjustment[],
	locations: readonly DisciplineLocation[],
	disciplines: readonly DisciplineDefaults[],
): DisciplineAdjustment[] {
	const existing = new Set(locations.map(({ address }) => address));
	const kept = new Set(disciplines.map(({ id }) => id));
	return adjustments
		.map((adjustment) => ({
			addresses: adjustment.addresses.filter((address) =>
				existing.has(address),
			),
			on: adjustment.on.filter((id) => kept.has(id)),
			off: adjustment.off.filter((id) => kept.has(id)),
		}))
		.filter(({ addresses }) => addresses.length > 0);
}
