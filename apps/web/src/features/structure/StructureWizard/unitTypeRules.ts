export interface UnitTypeDraft {
	key: string;
	name: string;
	rooms: string[];
	existing?: true;
}

export interface RuleDraft {
	key: string;
	tower: number;
	finals: string;
	from: string;
	to: string;
	unitType: string;
}

export type Finals = "all" | number[];

export const ALL_FINALS = "todos";

export function parseFinals(typed: string): Finals | undefined {
	const text = typed.trim().toLowerCase();
	if (text === "" || text === ALL_FINALS) return "all";
	const finals = text
		.split(/[\s,;]+/)
		.filter(Boolean)
		.map((part) => (/^\d+$/.test(part) ? Number(part) : 0));
	return finals.every((final) => final >= 1) ? finals : undefined;
}

export function parseFloorBound(typed: string): number | undefined {
	const text = typed.trim();
	return /^\d+$/.test(text) ? Number(text) : undefined;
}

function ruleApplies(rule: RuleDraft, floor: number, final: number): boolean {
	const finals = parseFinals(rule.finals);
	if (finals === undefined) return false;
	if (finals !== "all" && !finals.includes(final)) return false;
	const from = parseFloorBound(rule.from);
	const to = parseFloorBound(rule.to);
	return (
		(from === undefined || floor >= from) && (to === undefined || floor <= to)
	);
}

export function unitTypeKeyFor(
	rules: RuleDraft[],
	tower: number,
	floor: number,
	final: number,
): string | null {
	return (
		rules.find(
			(rule) => rule.tower === tower && ruleApplies(rule, floor, final),
		)?.unitType ?? null
	);
}
