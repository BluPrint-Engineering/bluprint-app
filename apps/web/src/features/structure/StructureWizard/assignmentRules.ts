export type RuleFinals = "all" | number[];

export interface AssignmentRule {
	key: string;
	towers: string[];
	finals: RuleFinals;
	fromFloor: number | null;
	toFloor: number | null;
	typology: string;
}

export interface DraftUnit {
	tower: string;
	floor: number;
	final: number;
}

export interface DraftTowerShape {
	key: string;
	finals: number[];
	floors: number[];
}

export type UnitOutcome =
	| { kind: "none" }
	| { kind: "typology"; typology: string }
	| { kind: "conflict"; ruleKeys: string[] };

export interface UnitAssignment {
	unit: DraftUnit;
	outcome: UnitOutcome;
}

export interface TowerConflict {
	ruleKeys: [string, string];
	tower: string;
	finals: number[];
	floors: number[];
}

export interface Assignments {
	units: UnitAssignment[];
	conflicts: TowerConflict[];
	reach: Record<string, number>;
}

export type BlockReason = "no-tower" | "no-final" | "conflict";

export interface BlockedRule {
	ruleKey: string;
	reason: BlockReason;
}

export interface RuleOptions {
	finals: number[];
	floors: number[];
}

const ascending = (a: number, b: number) => a - b;

const unique = (values: number[]) => [...new Set(values)].sort(ascending);

export function ruleReaches(rule: AssignmentRule, unit: DraftUnit): boolean {
	if (!rule.towers.includes(unit.tower)) return false;
	if (rule.finals !== "all" && !rule.finals.includes(unit.final)) return false;
	if (rule.fromFloor !== null && unit.floor < rule.fromFloor) return false;
	if (rule.toFloor !== null && unit.floor > rule.toFloor) return false;
	return true;
}

function outcomeFor(reaching: AssignmentRule[]): UnitOutcome {
	const [only, ...others] = reaching;
	if (only === undefined) return { kind: "none" };
	if (others.length === 0) return { kind: "typology", typology: only.typology };
	return {
		kind: "conflict",
		ruleKeys: reaching.map((rule) => rule.key).sort(),
	};
}

function pairsOf(ruleKeys: string[]): [string, string][] {
	return ruleKeys.flatMap((first, index) =>
		ruleKeys
			.slice(index + 1)
			.map((second): [string, string] => [first, second]),
	);
}

export function assignUnits(
	units: DraftUnit[],
	rules: AssignmentRule[],
): Assignments {
	const reach: Record<string, number> = {};
	for (const rule of rules) reach[rule.key] = 0;

	const assigned = units.map((unit): UnitAssignment => {
		const reaching = rules.filter((rule) => ruleReaches(rule, unit));
		for (const rule of reaching) reach[rule.key] = (reach[rule.key] ?? 0) + 1;
		return { unit, outcome: outcomeFor(reaching) };
	});

	const towers: string[] = [];
	for (const { unit } of assigned) {
		if (!towers.includes(unit.tower)) towers.push(unit.tower);
	}

	const grouped = new Map<
		string,
		{
			ruleKeys: [string, string];
			tower: string;
			finals: number[];
			floors: number[];
		}
	>();
	for (const { unit, outcome } of assigned) {
		if (outcome.kind !== "conflict") continue;
		for (const pair of pairsOf(outcome.ruleKeys)) {
			const id = JSON.stringify([pair, unit.tower]);
			const entry = grouped.get(id) ?? {
				ruleKeys: pair,
				tower: unit.tower,
				finals: [],
				floors: [],
			};
			entry.finals.push(unit.final);
			entry.floors.push(unit.floor);
			grouped.set(id, entry);
		}
	}

	const conflicts = [...grouped.values()]
		.map(
			(entry): TowerConflict => ({
				...entry,
				finals: unique(entry.finals),
				floors: unique(entry.floors),
			}),
		)
		.sort(
			(a, b) =>
				a.ruleKeys[0].localeCompare(b.ruleKeys[0]) ||
				a.ruleKeys[1].localeCompare(b.ruleKeys[1]) ||
				towers.indexOf(a.tower) - towers.indexOf(b.tower),
		);

	return { units: assigned, conflicts, reach };
}

export function ruleOptions(
	towerKeys: string[],
	draft: DraftTowerShape[],
): RuleOptions {
	const chosen = draft.filter((tower) => towerKeys.includes(tower.key));
	return {
		finals: unique(chosen.flatMap((tower) => tower.finals)),
		floors: unique(chosen.flatMap((tower) => tower.floors)),
	};
}

export function cleanRules(
	rules: AssignmentRule[],
	draft: DraftTowerShape[],
): AssignmentRule[] {
	return rules.map((rule) => {
		const towers = rule.towers.filter((key) =>
			draft.some((tower) => tower.key === key),
		);
		const options = ruleOptions(towers, draft);
		const keepFloor = (floor: number | null) =>
			floor !== null && options.floors.includes(floor) ? floor : null;
		return {
			...rule,
			towers,
			finals:
				rule.finals === "all"
					? "all"
					: rule.finals.filter((final) => options.finals.includes(final)),
			fromFloor: keepFloor(rule.fromFloor),
			toFloor: keepFloor(rule.toFloor),
		};
	});
}

export function blockedRules(
	rules: AssignmentRule[],
	units: DraftUnit[],
): BlockedRule[] {
	const inConflict = new Set(
		assignUnits(units, rules).conflicts.flatMap(
			(conflict) => conflict.ruleKeys,
		),
	);
	return rules.flatMap((rule): BlockedRule[] => {
		if (rule.towers.length === 0)
			return [{ ruleKey: rule.key, reason: "no-tower" }];
		if (rule.finals !== "all" && rule.finals.length === 0)
			return [{ ruleKey: rule.key, reason: "no-final" }];
		if (inConflict.has(rule.key))
			return [{ ruleKey: rule.key, reason: "conflict" }];
		return [];
	});
}
