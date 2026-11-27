import {
	comparableLocationName,
	MAX_TYPOLOGIES_PER_REQUEST,
	type StructureTower,
	sameLocationName,
	sameRoomName,
	type Typology,
	type TypologyLocationType,
	typologyLocationTypes,
} from "@bluprint/shared";
import { z } from "zod";
import {
	convertFinals,
	floorNumber,
	MAX_LETTER_STACKS,
	type Numbering,
	type RangeDraft,
	type RangeField,
	rangeFieldErrors,
	rangeOverlap,
	readRange,
	towerFloors,
	typedStackSpan,
} from "./floorRanges";
import { describeTower, type ExtendFacts } from "./towerNow";
import {
	ALL_FINALS,
	parseFinals,
	parseFloorBound,
	type RuleDraft,
	type TypologyDraft,
} from "./typologyRules";

export type { Numbering, RangeDraft } from "./floorRanges";

export interface TowerDraft {
	key: string;
	name: string;
	ranges: RangeDraft[];
	ground: boolean;
	hall: boolean;
	entranceTypology: string | null;
	hallTypology: string | null;
}

export interface AreaDraft {
	name: string;
	typology: string | null;
}

export interface FloorAreaDraft {
	key: string;
	tower: number;
	floor: string;
	name: string;
	typology: string | null;
}

export interface ExtendDraft {
	towerId: string;
}

export interface WizardDraft {
	extend?: ExtendDraft;
	towers: TowerDraft[];
	numbering: Numbering;
	projectAreas: AreaDraft[];
	towerAreas: AreaDraft[];
	floorAreas: FloorAreaDraft[];
	typologies: TypologyDraft[];
	rules: RuleDraft[];
}

export const STRUCTURE_DRAFT_VERSION = 3;

const typologyKeySchema = z.string().nullable();
const rangeSchema = z.strictObject({
	key: z.string(),
	first: z.string(),
	last: z.string(),
	finals: z.string(),
	noUnits: z.boolean(),
});
const towerSchema = z.strictObject({
	key: z.string(),
	name: z.string(),
	ranges: z.array(rangeSchema).min(1),
	ground: z.boolean(),
	hall: z.boolean(),
	entranceTypology: typologyKeySchema,
	hallTypology: typologyKeySchema,
});
const areaSchema = z.strictObject({
	name: z.string(),
	typology: typologyKeySchema,
});
const floorAreaSchema = z.strictObject({
	key: z.string(),
	tower: z.number().int(),
	floor: z.string(),
	name: z.string(),
	typology: typologyKeySchema,
});
const typologySchema = z.strictObject({
	key: z.string(),
	name: z.string(),
	rooms: z.array(z.string()),
	locationType: z.enum(typologyLocationTypes),
});
const ruleSchema = z.strictObject({
	key: z.string(),
	tower: z.number().int(),
	finals: z.string(),
	from: z.string(),
	to: z.string(),
	typology: z.string(),
});
export const storedWizardDraftSchema = z.strictObject({
	towers: z.array(towerSchema).min(1),
	numbering: z.enum(["digits", "letters"]),
	projectAreas: z.array(areaSchema),
	towerAreas: z.array(areaSchema),
	floorAreas: z.array(floorAreaSchema),
	typologies: z.array(typologySchema),
	rules: z.array(ruleSchema),
});
export type StoredWizardDraft = z.infer<typeof storedWizardDraftSchema>;

export function storeWizardDraft(draft: WizardDraft): StoredWizardDraft {
	return {
		towers: draft.towers.map((tower) => ({
			...tower,
			name: draft.extend ? "" : tower.name,
		})),
		numbering: draft.numbering,
		projectAreas: draft.projectAreas,
		towerAreas: draft.towerAreas,
		floorAreas: draft.floorAreas,
		typologies: draft.typologies,
		rules: draft.rules,
	};
}

export function restoreWizardDraft(
	stored: StoredWizardDraft,
	start?: WizardDraft,
): WizardDraft {
	const towers = start?.extend
		? stored.towers.map((tower) => ({
				...tower,
				name: start.towers[0]?.name ?? "",
			}))
		: stored.towers;
	towerKeys = Math.max(towerKeys, highestKey(towers, TOWER_KEY));
	rangeKeys = Math.max(
		rangeKeys,
		highestKey(
			towers.flatMap((tower) => tower.ranges),
			RANGE_KEY,
		),
	);
	typeKeys = Math.max(typeKeys, highestKey(stored.typologies, TYPOLOGY_KEY));
	ruleKeys = Math.max(ruleKeys, highestKey(stored.rules, RULE_KEY));
	return {
		...stored,
		towers,
		...(start?.extend ? { extend: start.extend } : {}),
	};
}

export const SINGLE_TOWER_NAME = "Torre A";
export const FLOOR_HALL = "Hall";

const TOWER_KEY = "tower-";
let towerKeys = 0;
const nextTowerKey = () => `${TOWER_KEY}${++towerKeys}`;

const RANGE_KEY = "range-";
let rangeKeys = 0;
const nextRangeKey = () => `${RANGE_KEY}${++rangeKeys}`;

export const newRange = (first = "", finals = ""): RangeDraft => ({
	key: nextRangeKey(),
	first,
	last: "",
	finals,
	noUnits: false,
});

const TYPOLOGY_KEY = "typology-";
let typeKeys = 0;
const nextTypologyKey = () => `${TYPOLOGY_KEY}${++typeKeys}`;

const RULE_KEY = "rule-";
let ruleKeys = 0;
const nextRuleKey = () => `${RULE_KEY}${++ruleKeys}`;

function highestKey(items: { key: string }[], prefix: string): number {
	return Math.max(
		0,
		...items.map(({ key }) =>
			key.startsWith(prefix) ? Number(key.slice(prefix.length)) || 0 : 0,
		),
	);
}

export const FIRST_TYPOLOGY_NAME = "Tipologia A";

export function typologyLimitReached(draft: WizardDraft): boolean {
	return draft.typologies.length >= MAX_TYPOLOGIES_PER_REQUEST;
}

export function initialDraft(): WizardDraft {
	const typology: TypologyDraft = {
		key: nextTypologyKey(),
		name: FIRST_TYPOLOGY_NAME,
		rooms: [],
		locationType: "unit",
	};
	return {
		towers: [
			{
				key: nextTowerKey(),
				name: SINGLE_TOWER_NAME,
				ranges: [newRange()],
				ground: true,
				hall: false,
				entranceTypology: null,
				hallTypology: null,
			},
		],
		numbering: "digits",
		projectAreas: [],
		towerAreas: [],
		floorAreas: [],
		typologies: [typology],
		rules: [
			{
				key: nextRuleKey(),
				tower: 0,
				finals: ALL_FINALS,
				from: "",
				to: "",
				typology: typology.key,
			},
		],
	};
}

function mirroredRules(
	tower: StructureTower,
	unitTypeIds: ReadonlySet<string>,
): RuleDraft[] | undefined {
	const units = describeTower(tower).lastFloor?.units ?? [];
	if (units.length === 0) return undefined;
	const finalsByType = new Map<string, number[]>();
	units.forEach((unit, at) => {
		const id = unit.typology?.id;
		if (id === undefined || !unitTypeIds.has(id)) return;
		finalsByType.set(id, [...(finalsByType.get(id) ?? []), at + 1]);
	});
	return [...finalsByType].map(([typology, finals]) => ({
		key: nextRuleKey(),
		tower: 0,
		finals:
			finals.length === units.length
				? ALL_FINALS
				: finals.map((final) => String(final).padStart(2, "0")).join(", "),
		from: "",
		to: "",
		typology,
	}));
}

function hallTypologyOf(
	tower: StructureTower,
	existingTypes: Typology[],
): string | null {
	const hall = describeTower(tower).lastFloor?.commonAreas.find((area) =>
		sameLocationName(area.name, FLOOR_HALL),
	);
	const id = hall?.typology?.id;
	if (id === undefined) return null;
	return existingTypes.some(
		(typology) => typology.id === id && typology.locationType === "common_area",
	)
		? id
		: null;
}

export function extendedDraft(
	tower: StructureTower,
	existingTypes: Typology[],
): WizardDraft {
	const now = describeTower(tower);
	const unitTypes = existingTypes.filter(
		(typology) => typology.locationType === "unit",
	);
	const typologies: TypologyDraft[] = [];
	let rules = mirroredRules(
		tower,
		new Set(unitTypes.map((typology) => typology.id)),
	);
	if (rules === undefined) {
		const first = unitTypes[0];
		const typology = first
			? undefined
			: {
					key: nextTypologyKey(),
					name: FIRST_TYPOLOGY_NAME,
					rooms: [],
					locationType: "unit" as const,
				};
		if (typology) typologies.push(typology);
		rules = [
			{
				key: nextRuleKey(),
				tower: 0,
				finals: ALL_FINALS,
				from: "",
				to: "",
				typology: first?.id ?? typology?.key ?? "",
			},
		];
	}
	const hasHall =
		now.lastFloor === undefined ||
		now.lastFloor.commonAreas.some((area) =>
			sameLocationName(area.name, FLOOR_HALL),
		);
	const numbering: Numbering = now.lettered ? "letters" : "digits";
	return {
		extend: { towerId: tower.id },
		towers: [
			{
				key: nextTowerKey(),
				name: tower.name,
				ranges: [newRange(String((now.numbered.at(-1) ?? 0) + 1))],
				ground: false,
				hall: hasHall,
				entranceTypology: null,
				hallTypology: hasHall ? hallTypologyOf(tower, existingTypes) : null,
			},
		],
		numbering,
		projectAreas: [],
		towerAreas: [],
		floorAreas: [],
		typologies,
		rules,
	};
}

export function withNewTypology(
	draft: WizardDraft,
	name: string,
	locationType: TypologyLocationType,
): WizardDraft {
	return {
		...draft,
		typologies: [
			...draft.typologies,
			{ key: nextTypologyKey(), name, rooms: [], locationType },
		],
	};
}

export function withCopiedTypology(
	draft: WizardDraft,
	source: { rooms: readonly string[]; locationType: TypologyLocationType },
	name: string,
): WizardDraft {
	return {
		...draft,
		typologies: [
			...draft.typologies,
			{
				key: nextTypologyKey(),
				name,
				rooms: [...source.rooms],
				locationType: source.locationType,
			},
		],
	};
}

function withoutChosen(selected: string | null, key: string): string | null {
	return selected === key ? null : selected;
}

export function withoutTypology(draft: WizardDraft, key: string): WizardDraft {
	return {
		...draft,
		typologies: draft.typologies.filter((typology) => typology.key !== key),
		rules: draft.rules.filter((rule) => rule.typology !== key),
		towers: draft.towers.map((tower) => ({
			...tower,
			entranceTypology: withoutChosen(tower.entranceTypology, key),
			hallTypology: withoutChosen(tower.hallTypology, key),
		})),
		projectAreas: draft.projectAreas.map((area) => ({
			...area,
			typology: withoutChosen(area.typology, key),
		})),
		towerAreas: draft.towerAreas.map((area) => ({
			...area,
			typology: withoutChosen(area.typology, key),
		})),
		floorAreas: draft.floorAreas.map((area) => ({
			...area,
			typology: withoutChosen(area.typology, key),
		})),
	};
}

export function withNewRule(
	draft: WizardDraft,
	typologyKey?: string,
): WizardDraft {
	const typology =
		typologyKey ??
		draft.typologies.find((item) => item.locationType === "unit")?.key;
	if (!typology) return draft;
	return {
		...draft,
		rules: [
			...draft.rules,
			{
				key: nextRuleKey(),
				tower: 0,
				finals: ALL_FINALS,
				from: "",
				to: "",
				typology,
			},
		],
	};
}

export function nextTowerName(previous: string): string {
	const trimmed = previous.trim();
	const letter = /^(.*\s)?([A-Z])$/.exec(trimmed);
	if (letter) {
		const prefix = letter[1] ?? "";
		const char = letter[2] ?? "A";
		return char === "Z"
			? `${prefix}AA`
			: `${prefix}${String.fromCharCode(char.charCodeAt(0) + 1)}`;
	}
	const number = /^(.*\s)?(\d+)$/.exec(trimmed);
	if (number) return `${number[1] ?? ""}${Number(number[2]) + 1}`;
	return "";
}

export function withTowerCount(draft: WizardDraft, count: number): WizardDraft {
	const target = Math.max(1, count);
	if (target <= draft.towers.length) {
		return {
			...draft,
			towers: draft.towers.slice(0, target),
			rules: draft.rules.filter((rule) => rule.tower < target),
		};
	}
	const towers = [...draft.towers];
	const rules = [...draft.rules];
	while (towers.length < target) {
		const previousIndex = towers.length - 1;
		const previous = towers[previousIndex] as TowerDraft;
		towers.push({
			...previous,
			key: nextTowerKey(),
			name: nextTowerName(previous.name),
			ranges: previous.ranges.map((range) => ({
				...range,
				key: nextRangeKey(),
			})),
			hall: false,
			hallTypology: null,
		});
		const inherited = rules.filter((other) => other.tower === previousIndex);
		for (const rule of inherited) {
			rules.push({ ...rule, key: nextRuleKey(), tower: towers.length - 1 });
		}
	}
	return { ...draft, towers, rules };
}

function withTower(
	draft: WizardDraft,
	index: number,
	update: (tower: TowerDraft) => TowerDraft,
): WizardDraft {
	return {
		...draft,
		towers: draft.towers.map((tower, at) =>
			at === index ? update(tower) : tower,
		),
	};
}

export function withNewRange(draft: WizardDraft, tower: number): WizardDraft {
	return withTower(draft, tower, (current) => {
		const last = floorNumber(current.ranges.at(-1)?.last ?? "");
		return {
			...current,
			ranges: [
				...current.ranges,
				newRange(last === undefined ? "" : String(last + 1)),
			],
		};
	});
}

export function withoutRange(
	draft: WizardDraft,
	tower: number,
	key: string,
): WizardDraft {
	return withTower(draft, tower, (current) => ({
		...current,
		ranges: current.ranges.filter((range) => range.key !== key),
	}));
}

export function withRange(
	draft: WizardDraft,
	tower: number,
	key: string,
	patch: Partial<Omit<RangeDraft, "key">>,
): WizardDraft {
	return withTower(draft, tower, (current) => ({
		...current,
		ranges: current.ranges.map((range) =>
			range.key === key ? { ...range, ...patch } : range,
		),
	}));
}

export function towerLabel(draft: WizardDraft, index: number): string {
	return draft.towers.length > 1
		? (draft.towers[index]?.name.trim() ?? "")
		: SINGLE_TOWER_NAME;
}

export type NumberingChange =
	| { draft: WizardDraft; refusal?: undefined }
	| { draft?: undefined; refusal: string };

export function withNumbering(
	draft: WizardDraft,
	numbering: Numbering,
): NumberingChange {
	if (numbering === draft.numbering) return { draft };
	if (numbering === "letters") {
		for (const [index, tower] of draft.towers.entries()) {
			for (const [at, range] of tower.ranges.entries()) {
				const span = typedStackSpan(range, draft.numbering);
				if (!span) continue;
				const named = `A faixa ${at + 1} da ${towerLabel(draft, index)}`;
				const limit = `Com letras, o máximo é ${MAX_LETTER_STACKS}, de A a Z.`;
				if (span.count > MAX_LETTER_STACKS) {
					return { refusal: `${named} tem ${span.count} finais. ${limit}` };
				}
				if (span.highest > MAX_LETTER_STACKS) {
					return {
						refusal: `${named} vai até o final ${span.highest}. ${limit}`,
					};
				}
			}
		}
	}
	return {
		draft: {
			...draft,
			numbering,
			towers: draft.towers.map((tower) => ({
				...tower,
				ranges: tower.ranges.map((range) => ({
					...range,
					finals: convertFinals(range.finals, draft.numbering, numbering),
				})),
			})),
		},
	};
}

export type TowerField = "name";

export const towerFieldId = (index: number, field: TowerField) =>
	`tower-${index}-${field}`;

export const rangeFieldId = (key: string, field: RangeField) =>
	`${key}-${field}`;

export const rangeOverlapId = (key: string) => `${key}-overlap`;

export const floorAreaFieldId = (key: string) => `floor-area-${key}`;

export const listedFloorAreas = (draft: WizardDraft) =>
	draft.floorAreas.filter((area) => area.tower < draft.towers.length);

export type RuleField = "finals" | "from" | "to";

export const typologyFieldId = (key: string) => `${key}-name`;

export const ruleFieldId = (key: string, field: RuleField) => `${key}-${field}`;

export type DraftErrors = Partial<Record<string, string>>;

export interface FloorAreaProblem {
	field: "name" | "floor";
	message: string;
}

export function floorAreaProblem(
	draft: WizardDraft,
	area: { tower: number; floor: string; name: string },
	before: { tower: number; floor: string; name: string }[],
): FloorAreaProblem | undefined {
	const tower = draft.towers[area.tower];
	const floors = tower && towerFloors(tower.ranges, draft.numbering);
	const numbers = floors?.map(({ number }) => number) ?? [];
	const lowest = numbers[0];
	const highest = numbers.at(-1);
	if (!tower || lowest === undefined || highest === undefined) {
		return { field: "floor", message: "Confira os andares da torre primeiro." };
	}
	const floor = Number(area.floor);
	if (!numbers.includes(floor)) {
		return {
			field: "floor",
			message:
				highest - lowest + 1 === numbers.length
					? `O andar precisa estar entre o ${lowest}º e o ${highest}º.`
					: `O ${floor}º andar não está em nenhuma faixa da torre.`,
		};
	}
	const taken = [
		...(tower.hall ? [FLOOR_HALL] : []),
		...before
			.filter(
				(other) => other.tower === area.tower && Number(other.floor) === floor,
			)
			.map((other) => other.name),
	];
	if (taken.some((name) => sameLocationName(name, area.name))) {
		return {
			field: "name",
			message: "Esse andar já tem uma área comum com esse nome.",
		};
	}
	return undefined;
}

function clashingUnit(
	range: RangeDraft,
	numbering: Numbering,
	takenUnits: string[],
): string | undefined {
	const floors = readRange(range, numbering);
	if (!floors) return undefined;
	const taken = new Map(
		takenUnits.map((name) => [comparableLocationName(name), name]),
	);
	for (let floor = floors.first; floor <= floors.last; floor++) {
		for (const stack of floors.stacks) {
			const clash = taken.get(comparableLocationName(`${floor}${stack.label}`));
			if (clash !== undefined) return clash;
		}
	}
	return undefined;
}

function extendProblem(
	facts: ExtendFacts,
	range: RangeDraft,
): string | undefined {
	const first = floorNumber(range.first);
	if (first === undefined) return undefined;
	const last = floorNumber(range.last) ?? first;
	const label = facts.named ? `A ${facts.name}` : "A obra";
	const taken = facts.takenFloors.find(
		(number) => number >= first && number <= last,
	);
	if (taken !== undefined) return `${label} já tem o ${taken}º andar.`;
	const clash = clashingUnit(range, facts.numbering, facts.takenUnits);
	return clash === undefined
		? undefined
		: `${label} já tem a unidade ${clash}. Use outro andar ou outros finais.`;
}

export function extendConflicts(
	draft: WizardDraft,
	facts: ExtendFacts,
): DraftErrors {
	if (!draft.extend) return {};
	const errors: DraftErrors = {};
	for (const tower of draft.towers) {
		for (const range of tower.ranges) {
			if (rangeFieldErrors(range, facts.numbering).first !== undefined)
				continue;
			const message = extendProblem(facts, range);
			if (message !== undefined) {
				errors[rangeFieldId(range.key, "first")] = message;
			}
		}
	}
	return errors;
}

export function validateDraft(
	draft: WizardDraft,
	facts?: ExtendFacts,
	existingNames: readonly string[] = [],
): DraftErrors {
	const errors: DraftErrors = {};
	const numbering = facts?.numbering ?? draft.numbering;
	const several = draft.towers.length > 1;

	draft.towers.forEach((tower, index) => {
		if (several) {
			const id = towerFieldId(index, "name");
			if (tower.name.trim() === "") errors[id] = "Informe o nome da torre.";
			else if (
				draft.towers.some(
					(other, at) => at < index && sameLocationName(other.name, tower.name),
				)
			) {
				errors[id] = "Já existe outra torre com esse nome.";
			}
		}

		tower.ranges.forEach((range, at) => {
			const found = rangeFieldErrors(range, numbering);
			for (const field of ["first", "last", "finals"] as const) {
				const message = found[field];
				if (message !== undefined) {
					errors[rangeFieldId(range.key, field)] = message;
				}
			}
			const overlap = rangeOverlap(tower.ranges, at);
			if (overlap !== undefined) errors[rangeOverlapId(range.key)] = overlap;
		});
	});
	if (facts) Object.assign(errors, extendConflicts(draft, facts));

	const listed = listedFloorAreas(draft);
	listed.forEach((area, index) => {
		const problem = floorAreaProblem(draft, area, listed.slice(0, index));
		if (problem) errors[floorAreaFieldId(area.key)] = problem.message;
	});

	draft.typologies.forEach((typology, index) => {
		const id = typologyFieldId(typology.key);
		if (typology.name.trim() === "") {
			errors[id] = "Informe o nome da tipologia.";
		} else if (
			existingNames.some((other) => sameRoomName(other, typology.name)) ||
			draft.typologies.some(
				(other, at) => at < index && sameRoomName(other.name, typology.name),
			)
		) {
			errors[id] = "Esse nome já existe nesta obra.";
		}
	});

	for (const rule of draft.rules) {
		if (parseFinals(rule.finals) === undefined) {
			errors[ruleFieldId(rule.key, "finals")] =
				"Use números como 01, 03, ou escreva todos.";
		}
		const from = parseFloorBound(rule.from);
		const to = parseFloorBound(rule.to);
		if (from !== undefined && to !== undefined && to < from) {
			errors[ruleFieldId(rule.key, "to")] =
				"O andar final precisa ser igual ou maior que o inicial.";
		}
	}

	return errors;
}

export function typologyNameTakenErrors(
	draft: WizardDraft,
	names: readonly string[],
): DraftErrors {
	const errors: DraftErrors = {};
	for (const typology of draft.typologies) {
		if (names.some((name) => sameRoomName(name, typology.name))) {
			errors[typologyFieldId(typology.key)] = "Esse nome já existe nesta obra.";
		}
	}
	return errors;
}

export type DraftSection = "towers" | "areas" | "types";

export function firstInvalidField(
	draft: WizardDraft,
	errors: DraftErrors,
): { id: string; section: DraftSection } | undefined {
	const fields: { id: string; error?: string; section: DraftSection }[] = [
		...draft.towers.flatMap((tower, index) => [
			{ id: towerFieldId(index, "name"), section: "towers" as const },
			...tower.ranges.flatMap((range) => [
				{ id: rangeFieldId(range.key, "first"), section: "towers" as const },
				{
					id: rangeFieldId(range.key, "first"),
					error: rangeOverlapId(range.key),
					section: "towers" as const,
				},
				{ id: rangeFieldId(range.key, "last"), section: "towers" as const },
				{ id: rangeFieldId(range.key, "finals"), section: "towers" as const },
			]),
		]),
		...listedFloorAreas(draft).map((area) => ({
			id: floorAreaFieldId(area.key),
			section: "areas" as const,
		})),
		...draft.typologies.map((typology) => ({
			id: typologyFieldId(typology.key),
			section: "types" as const,
		})),
		...draft.rules.flatMap((rule) =>
			(["finals", "from", "to"] as const).map((field) => ({
				id: ruleFieldId(rule.key, field),
				section: "types" as const,
			})),
		),
	];
	const found = fields.find(
		(field) => errors[field.error ?? field.id] !== undefined,
	);
	return found && { id: found.id, section: found.section };
}
