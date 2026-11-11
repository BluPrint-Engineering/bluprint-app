import {
	comparableLocationName,
	MAX_UNITS_PER_FLOOR,
	type StructureTower,
	sameLocationName,
	type UnitType,
} from "@bluprint/shared";
import { describeTower, newFloorsLead } from "./towerNow";
import {
	ALL_FINALS,
	parseFinals,
	parseFloorBound,
	type RuleDraft,
	type UnitTypeDraft,
} from "./unitTypeRules";

export type Numbering = "digits" | "letters";

export interface TowerDraft {
	key: string;
	name: string;
	first: string;
	last: string;
	perFloor: string;
	ground: boolean;
	hall: boolean;
}

export interface FloorAreaDraft {
	key: string;
	tower: number;
	floor: string;
	name: string;
}

export interface ExtendDraft {
	towerId: string;
	towerName: string;
	named: boolean;
	takenFloors: number[];
	takenUnits: string[];
	lead: string;
}

export interface WizardDraft {
	extend?: ExtendDraft;
	towers: TowerDraft[];
	numbering: Numbering;
	projectAreas: string[];
	towerAreas: string[];
	floorAreas: FloorAreaDraft[];
	unitTypes: UnitTypeDraft[];
	rules: RuleDraft[];
}

export const SINGLE_TOWER_NAME = "Torre A";
export const FLOOR_HALL = "Hall";

const TOWER_KEY = "tower-";
let towerKeys = 0;
const nextTowerKey = () => `${TOWER_KEY}${++towerKeys}`;

const UNIT_TYPE_KEY = "unit-type-";
let typeKeys = 0;
const nextUnitTypeKey = () => `${UNIT_TYPE_KEY}${++typeKeys}`;

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

export const FIRST_UNIT_TYPE_NAME = "Tipologia A";

function record(value: unknown): Record<string, unknown> | undefined {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return undefined;
	}
	const entries = Object.entries(value);
	return Object.fromEntries(entries);
}

function strings(value: unknown): string[] | undefined {
	return Array.isArray(value) && value.every((item) => typeof item === "string")
		? value
		: undefined;
}

export function readWizardDraft(value: unknown): WizardDraft | undefined {
	const draft = record(value);
	if (!draft) return undefined;
	if (draft.numbering !== "digits" && draft.numbering !== "letters") {
		return undefined;
	}
	const projectAreas = strings(draft.projectAreas);
	const towerAreas = strings(draft.towerAreas);
	if (!projectAreas || !towerAreas || !Array.isArray(draft.towers)) {
		return undefined;
	}
	const towers: TowerDraft[] = [];
	for (const item of draft.towers) {
		const tower = record(item);
		if (
			!tower ||
			typeof tower.key !== "string" ||
			typeof tower.name !== "string" ||
			typeof tower.first !== "string" ||
			typeof tower.last !== "string" ||
			typeof tower.perFloor !== "string" ||
			typeof tower.ground !== "boolean" ||
			typeof tower.hall !== "boolean"
		) {
			return undefined;
		}
		towers.push({
			key: tower.key,
			name: tower.name,
			first: tower.first,
			last: tower.last,
			perFloor: tower.perFloor,
			ground: tower.ground,
			hall: tower.hall,
		});
	}
	if (!Array.isArray(draft.floorAreas) || !Array.isArray(draft.unitTypes)) {
		return undefined;
	}
	if (!Array.isArray(draft.rules)) return undefined;
	const floorAreas: FloorAreaDraft[] = [];
	for (const item of draft.floorAreas) {
		const area = record(item);
		if (
			!area ||
			typeof area.key !== "string" ||
			typeof area.tower !== "number" ||
			typeof area.floor !== "string" ||
			typeof area.name !== "string"
		) {
			return undefined;
		}
		floorAreas.push({
			key: area.key,
			tower: area.tower,
			floor: area.floor,
			name: area.name,
		});
	}
	const unitTypes: UnitTypeDraft[] = [];
	for (const item of draft.unitTypes) {
		const unitType = record(item);
		const rooms = unitType && strings(unitType.rooms);
		if (
			!unitType ||
			!rooms ||
			typeof unitType.key !== "string" ||
			typeof unitType.name !== "string"
		) {
			return undefined;
		}
		unitTypes.push({
			key: unitType.key,
			name: unitType.name,
			rooms,
			...(unitType.existing === true ? { existing: true } : {}),
		});
	}
	const rules: RuleDraft[] = [];
	for (const item of draft.rules) {
		const rule = record(item);
		if (
			!rule ||
			typeof rule.key !== "string" ||
			typeof rule.tower !== "number" ||
			typeof rule.finals !== "string" ||
			typeof rule.from !== "string" ||
			typeof rule.to !== "string" ||
			typeof rule.unitType !== "string"
		) {
			return undefined;
		}
		rules.push({
			key: rule.key,
			tower: rule.tower,
			finals: rule.finals,
			from: rule.from,
			to: rule.to,
			unitType: rule.unitType,
		});
	}
	const extend = readExtend(draft.extend);
	if (draft.extend !== undefined && !extend) return undefined;
	towerKeys = Math.max(towerKeys, highestKey(towers, TOWER_KEY));
	typeKeys = Math.max(typeKeys, highestKey(unitTypes, UNIT_TYPE_KEY));
	ruleKeys = Math.max(ruleKeys, highestKey(rules, RULE_KEY));
	return {
		...(extend ? { extend } : {}),
		numbering: draft.numbering,
		towers,
		projectAreas,
		towerAreas,
		floorAreas,
		unitTypes,
		rules,
	};
}

function readExtend(value: unknown): ExtendDraft | undefined {
	const extend = record(value);
	if (!extend) return undefined;
	const takenFloors = extend.takenFloors;
	const takenUnits = strings(extend.takenUnits);
	if (
		typeof extend.towerId !== "string" ||
		typeof extend.towerName !== "string" ||
		typeof extend.named !== "boolean" ||
		typeof extend.lead !== "string" ||
		!takenUnits ||
		!Array.isArray(takenFloors) ||
		!takenFloors.every((floor) => typeof floor === "number")
	) {
		return undefined;
	}
	return {
		towerId: extend.towerId,
		towerName: extend.towerName,
		named: extend.named,
		takenFloors,
		takenUnits,
		lead: extend.lead,
	};
}

export function initialDraft(): WizardDraft {
	const unitType: UnitTypeDraft = {
		key: nextUnitTypeKey(),
		name: FIRST_UNIT_TYPE_NAME,
		rooms: [],
	};
	return {
		towers: [
			{
				key: nextTowerKey(),
				name: SINGLE_TOWER_NAME,
				first: "1",
				last: "",
				perFloor: "",
				ground: true,
				hall: true,
			},
		],
		numbering: "digits",
		projectAreas: [],
		towerAreas: [],
		floorAreas: [],
		unitTypes: [unitType],
		rules: [
			{
				key: nextRuleKey(),
				tower: 0,
				finals: ALL_FINALS,
				from: "",
				to: "",
				unitType: unitType.key,
			},
		],
	};
}

function mirroredRules(
	tower: StructureTower,
	unitTypes: UnitTypeDraft[],
): RuleDraft[] | undefined {
	const units = describeTower(tower).lastFloor?.units ?? [];
	if (units.length === 0) return undefined;
	const finalsByType = new Map<string, number[]>();
	units.forEach((unit, at) => {
		const id = unit.unitType?.id;
		if (id === undefined || !unitTypes.some(({ key }) => key === id)) return;
		finalsByType.set(id, [...(finalsByType.get(id) ?? []), at + 1]);
	});
	return [...finalsByType].map(([unitType, finals]) => ({
		key: nextRuleKey(),
		tower: 0,
		finals:
			finals.length === units.length
				? ALL_FINALS
				: finals.map((final) => String(final).padStart(2, "0")).join(", "),
		from: "",
		to: "",
		unitType,
	}));
}

export function extendedDraft(
	tower: StructureTower,
	existingTypes: UnitType[],
	named: boolean,
): WizardDraft {
	const now = describeTower(tower);
	const unitTypes: UnitTypeDraft[] = existingTypes.map(
		({ id, name, rooms }) => ({
			key: id,
			name,
			rooms: rooms.map((room) => room.name),
			existing: true,
		}),
	);
	let rules = mirroredRules(tower, unitTypes);
	if (rules === undefined) {
		const first = unitTypes[0];
		const unitType = first ?? {
			key: nextUnitTypeKey(),
			name: FIRST_UNIT_TYPE_NAME,
			rooms: [],
		};
		if (!first) unitTypes.push(unitType);
		rules = [
			{
				key: nextRuleKey(),
				tower: 0,
				finals: ALL_FINALS,
				from: "",
				to: "",
				unitType: unitType.key,
			},
		];
	}
	const perFloor = now.lastFloor?.units.length ?? 0;
	return {
		extend: {
			towerId: tower.id,
			towerName: tower.name,
			named,
			takenFloors: now.numbered,
			takenUnits: tower.floors.flatMap((floor) =>
				floor.units.map((unit) => unit.name),
			),
			lead: newFloorsLead(tower, named),
		},
		towers: [
			{
				key: nextTowerKey(),
				name: tower.name,
				first: String((now.numbered.at(-1) ?? 0) + 1),
				last: "",
				perFloor: perFloor > 0 ? String(perFloor) : "",
				ground: false,
				hall:
					now.lastFloor === undefined ||
					now.lastFloor.commonAreas.some((area) =>
						sameLocationName(area.name, FLOOR_HALL),
					),
			},
		],
		numbering: now.lettered ? "letters" : "digits",
		projectAreas: [],
		towerAreas: [],
		floorAreas: [],
		unitTypes,
		rules,
	};
}

function freeUnitTypeName(taken: string[]): string {
	for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
		const name = `Tipologia ${letter}`;
		if (!taken.some((other) => sameLocationName(other, name))) return name;
	}
	return "";
}

export function withNewUnitType(draft: WizardDraft): WizardDraft {
	return {
		...draft,
		unitTypes: [
			...draft.unitTypes,
			{
				key: nextUnitTypeKey(),
				name: freeUnitTypeName(draft.unitTypes.map(({ name }) => name)),
				rooms: [],
			},
		],
	};
}

export function withoutUnitType(draft: WizardDraft, key: string): WizardDraft {
	return {
		...draft,
		unitTypes: draft.unitTypes.filter((unitType) => unitType.key !== key),
		rules: draft.rules.filter((rule) => rule.unitType !== key),
	};
}

export function withNewRule(draft: WizardDraft): WizardDraft {
	const unitType = draft.unitTypes[0];
	if (!unitType) return draft;
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
				unitType: unitType.key,
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
		});
		const inherited = rules.filter((other) => other.tower === previousIndex);
		for (const rule of inherited) {
			rules.push({ ...rule, key: nextRuleKey(), tower: towers.length - 1 });
		}
	}
	return { ...draft, towers, rules };
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
	numbering: Numbering,
): string {
	return numbering === "letters"
		? `${floor}${letters(index)}`
		: `${floor}${String(index + 1).padStart(2, "0")}`;
}

export interface ParsedTower {
	first: number;
	last: number;
	perFloor: number;
}

function wholeNumber(typed: string): number | undefined {
	return /^\d+$/.test(typed.trim()) ? Number(typed.trim()) : undefined;
}

export function parseTower(tower: TowerDraft): ParsedTower | undefined {
	const first = wholeNumber(tower.first);
	const last = wholeNumber(tower.last);
	const perFloor = wholeNumber(tower.perFloor);
	if (
		first === undefined ||
		last === undefined ||
		perFloor === undefined ||
		first < 1 ||
		last < first ||
		perFloor < 1 ||
		perFloor > MAX_UNITS_PER_FLOOR
	) {
		return undefined;
	}
	return { first, last, perFloor };
}

export type TowerField = "name" | "first" | "last" | "perFloor";

export const towerFieldId = (index: number, field: TowerField) =>
	`tower-${index}-${field}`;

export const floorAreaFieldId = (key: string) => `floor-area-${key}`;

export const listedFloorAreas = (draft: WizardDraft) =>
	draft.floorAreas.filter((area) => area.tower < draft.towers.length);

export type RuleField = "finals" | "from" | "to";

export const unitTypeFieldId = (key: string) => `${key}-name`;

export const ruleFieldId = (key: string, field: RuleField) => `${key}-${field}`;

export type DraftErrors = Partial<Record<string, string>>;

export interface FloorAreaProblem {
	field: "name" | "floor";
	message: string;
}

export function floorAreaProblem(
	draft: WizardDraft,
	area: Omit<FloorAreaDraft, "key">,
	before: FloorAreaDraft[],
): FloorAreaProblem | undefined {
	const tower = draft.towers[area.tower];
	const range = tower && parseTower(tower);
	if (!tower || !range) {
		return { field: "floor", message: "Confira os andares da torre primeiro." };
	}
	const floor = Number(area.floor);
	if (floor < range.first || floor > range.last) {
		return {
			field: "floor",
			message: `O andar precisa estar entre o ${range.first}º e o ${range.last}º.`,
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
	tower: TowerDraft,
	numbering: Numbering,
	takenUnits: string[],
): string | undefined {
	const range = parseTower(tower);
	if (!range) return undefined;
	const taken = new Map(
		takenUnits.map((name) => [comparableLocationName(name), name]),
	);
	for (let floor = range.first; floor <= range.last; floor++) {
		for (let at = 0; at < range.perFloor; at++) {
			const clash = taken.get(
				comparableLocationName(unitName(floor, at, numbering)),
			);
			if (clash !== undefined) return clash;
		}
	}
	return undefined;
}

export function validateDraft(draft: WizardDraft): DraftErrors {
	const errors: DraftErrors = {};
	const several = draft.towers.length > 1;

	draft.towers.forEach((tower, index) => {
		const set = (field: TowerField, message: string) => {
			errors[towerFieldId(index, field)] = message;
		};
		if (several) {
			if (tower.name.trim() === "") set("name", "Informe o nome da torre.");
			else if (
				draft.towers.some(
					(other, at) => at < index && sameLocationName(other.name, tower.name),
				)
			) {
				set("name", "Já existe outra torre com esse nome.");
			}
		}

		const first = wholeNumber(tower.first);
		const last = wholeNumber(tower.last);
		if (first === undefined) set("first", "Informe o primeiro andar.");
		else if (first < 1) set("first", "O primeiro andar começa no 1º.");
		if (last === undefined) set("last", "Informe o último andar.");
		else if (first !== undefined && first >= 1 && last < first) {
			set("last", "O último andar precisa ser igual ou maior que o primeiro.");
		}

		if (draft.extend && first !== undefined && first >= 1) {
			const label = draft.extend.named
				? `A ${draft.extend.towerName}`
				: "A obra";
			const taken = draft.extend.takenFloors.find(
				(number) => number >= first && number <= (last ?? first),
			);
			const clash =
				taken === undefined
					? clashingUnit(tower, draft.numbering, draft.extend.takenUnits)
					: undefined;
			if (taken !== undefined) {
				set("first", `${label} já tem o ${taken}º andar.`);
			} else if (clash !== undefined) {
				set(
					"first",
					`${label} já tem a unidade ${clash}. Comece em um andar acima dela.`,
				);
			}
		}

		const perFloor = wholeNumber(tower.perFloor);
		if (
			perFloor === undefined ||
			perFloor < 1 ||
			perFloor > MAX_UNITS_PER_FLOOR
		) {
			set("perFloor", `De 1 a ${MAX_UNITS_PER_FLOOR} unidades por andar.`);
		}
	});

	const listed = listedFloorAreas(draft);
	listed.forEach((area, index) => {
		const problem = floorAreaProblem(draft, area, listed.slice(0, index));
		if (problem) errors[floorAreaFieldId(area.key)] = problem.message;
	});

	draft.unitTypes.forEach((unitType, index) => {
		const id = unitTypeFieldId(unitType.key);
		if (unitType.name.trim() === "") {
			errors[id] = "Informe o nome da tipologia.";
		} else if (
			draft.unitTypes.some(
				(other, at) =>
					at < index && sameLocationName(other.name, unitType.name),
			)
		) {
			errors[id] = "Já existe outra tipologia com esse nome.";
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

export type DraftSection = "towers" | "areas" | "types";

export function firstInvalidField(
	draft: WizardDraft,
	errors: DraftErrors,
): { id: string; section: DraftSection } | undefined {
	const fields = [
		...draft.towers.flatMap((_, index) =>
			(["name", "first", "last", "perFloor"] as const).map((field) => ({
				id: towerFieldId(index, field),
				section: "towers" as const,
			})),
		),
		...listedFloorAreas(draft).map((area) => ({
			id: floorAreaFieldId(area.key),
			section: "areas" as const,
		})),
		...draft.unitTypes.map((unitType) => ({
			id: unitTypeFieldId(unitType.key),
			section: "types" as const,
		})),
		...draft.rules.flatMap((rule) =>
			(["finals", "from", "to"] as const).map((field) => ({
				id: ruleFieldId(rule.key, field),
				section: "types" as const,
			})),
		),
	];
	return fields.find((field) => errors[field.id] !== undefined);
}
