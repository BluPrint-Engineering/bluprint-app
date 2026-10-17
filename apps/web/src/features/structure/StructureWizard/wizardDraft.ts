import { MAX_UNITS_PER_FLOOR, sameLocationName } from "@bluprint/shared";

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

export interface WizardDraft {
	towers: TowerDraft[];
	numbering: Numbering;
	projectAreas: string[];
	towerAreas: string[];
	floorAreas: FloorAreaDraft[];
}

export const SINGLE_TOWER_NAME = "Torre A";
export const FLOOR_HALL = "Hall";

let towerKeys = 0;
const nextTowerKey = () => `tower-${++towerKeys}`;

export function initialDraft(): WizardDraft {
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
		return { ...draft, towers: draft.towers.slice(0, target) };
	}
	const towers = [...draft.towers];
	while (towers.length < target) {
		const previous = towers[towers.length - 1] as TowerDraft;
		towers.push({
			...previous,
			key: nextTowerKey(),
			name: nextTowerName(previous.name),
		});
	}
	return { ...draft, towers };
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

	return errors;
}

export type DraftSection = "towers" | "areas";

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
	];
	return fields.find((field) => errors[field.id] !== undefined);
}
