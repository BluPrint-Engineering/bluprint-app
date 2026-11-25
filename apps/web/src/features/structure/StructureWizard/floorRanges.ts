import { MAX_UNITS_PER_FLOOR } from "@bluprint/shared";

export type Numbering = "digits" | "letters";

export interface RangeDraft {
	key: string;
	first: string;
	last: string;
	finals: string;
	noUnits: boolean;
}

export interface Stack {
	position: number;
	label: string;
}

export interface RangeFloors {
	first: number;
	last: number;
	stacks: Stack[];
}

export interface TowerFloor {
	number: number;
	stacks: Stack[];
}

export type RangeField = "first" | "last" | "finals";

export type RangeFieldErrors = Partial<Record<RangeField, string>>;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const MAX_LETTER_STACKS = LETTERS.length;

const finalPieces = (typed: string) =>
	typed
		.trim()
		.split(/[\s,]+/)
		.filter(Boolean);

function positionOf(piece: string, numbering: Numbering): number | undefined {
	if (numbering === "digits") {
		return /^\d{1,2}$/.test(piece) && Number(piece) >= 1
			? Number(piece)
			: undefined;
	}
	return /^[a-z]$/i.test(piece)
		? LETTERS.indexOf(piece.toUpperCase()) + 1
		: undefined;
}

export function stackLabel(position: number, numbering: Numbering): string {
	return numbering === "letters"
		? (LETTERS[position - 1] ?? String(position))
		: String(position).padStart(2, "0");
}

export type StacksRead =
	| { stacks: Stack[]; error?: undefined }
	| { stacks?: undefined; error: string };

function typedPositions(
	typed: string,
	numbering: Numbering,
): number[] | undefined {
	const positions: number[] = [];
	for (const piece of finalPieces(typed)) {
		const position = positionOf(piece, numbering);
		if (position === undefined) return undefined;
		positions.push(position);
	}
	return positions;
}

function stackSpan(positions: number[]) {
	const lowest = Math.min(...positions);
	return { lowest, count: Math.max(...positions) - lowest + 1 };
}

export function readStacks(typed: string, numbering: Numbering): StacksRead {
	const positions = typedPositions(typed, numbering);
	if (positions === undefined) {
		return {
			error:
				numbering === "letters"
					? "Use letras de A a Z, como A, B."
					: "Use números de 1 a 30, como 01, 02.",
		};
	}
	if (positions.length === 0)
		return { error: "Informe os finais desta faixa." };
	const { lowest, count } = stackSpan(positions);
	if (count > MAX_UNITS_PER_FLOOR) {
		return { error: `De 1 a ${MAX_UNITS_PER_FLOOR} unidades por andar.` };
	}
	return {
		stacks: Array.from({ length: count }, (_, at) => ({
			position: lowest + at,
			label: stackLabel(lowest + at, numbering),
		})),
	};
}

export function floorNumber(typed: string): number | undefined {
	const text = typed.trim();
	return /^\d+$/.test(text) && Number(text) >= 1 ? Number(text) : undefined;
}

interface FloorSpan {
	first: number;
	last: number;
}

function spanOf(range: RangeDraft): FloorSpan | undefined {
	const first = floorNumber(range.first);
	const last = floorNumber(range.last);
	return first !== undefined && last !== undefined && last >= first
		? { first, last }
		: undefined;
}

export function rangeFieldErrors(
	range: RangeDraft,
	numbering: Numbering,
): RangeFieldErrors {
	const errors: RangeFieldErrors = {};
	const first = floorNumber(range.first);
	if (range.first.trim() === "") errors.first = "Informe o primeiro andar.";
	else if (first === undefined) errors.first = "Use um andar a partir do 1º.";
	if (range.last.trim() === "") errors.last = "Informe o último andar.";
	else {
		const last = floorNumber(range.last);
		if (last === undefined || (first !== undefined && last < first)) {
			errors.last = "O último andar precisa ser igual ou maior que o primeiro.";
		}
	}
	if (!range.noUnits) {
		const { error } = readStacks(range.finals, numbering);
		if (error !== undefined) errors.finals = error;
	}
	return errors;
}

export function readRange(
	range: RangeDraft,
	numbering: Numbering,
): RangeFloors | undefined {
	const span = spanOf(range);
	if (!span) return undefined;
	if (range.noUnits) return { ...span, stacks: [] };
	const { stacks } = readStacks(range.finals, numbering);
	return stacks && { ...span, stacks };
}

export function rangeOverlap(
	ranges: RangeDraft[],
	index: number,
): string | undefined {
	const range = ranges[index];
	const span = range && spanOf(range);
	if (!span) return undefined;
	for (let at = 0; at < index; at++) {
		const other = ranges[at];
		const earlier = other && spanOf(other);
		if (
			earlier &&
			Math.max(span.first, earlier.first) <= Math.min(span.last, earlier.last)
		) {
			const shared = Math.max(span.first, earlier.first);
			return `O ${shared}º andar já está na faixa ${at + 1}. Cada andar fica numa faixa só.`;
		}
	}
	return undefined;
}

export function isBlankRange(range: RangeDraft): boolean {
	return (
		!range.noUnits &&
		[range.first, range.last, range.finals].every(
			(typed) => typed.trim() === "",
		)
	);
}

export function towerFloors(
	ranges: RangeDraft[],
	numbering: Numbering,
): TowerFloor[] | undefined {
	if (ranges.length === 0) return undefined;
	const floors: TowerFloor[] = [];
	for (const [index, range] of ranges.entries()) {
		const read = readRange(range, numbering);
		if (!read || rangeOverlap(ranges, index) !== undefined) return undefined;
		for (let number = read.first; number <= read.last; number++) {
			floors.push({ number, stacks: read.stacks });
		}
	}
	return floors.sort((a, b) => a.number - b.number);
}

export function convertFinals(
	typed: string,
	from: Numbering,
	to: Numbering,
): string {
	const positions = typedPositions(typed, from);
	if (!positions || positions.length === 0) return typed;
	return positions
		.map((position) =>
			to === "letters" && position > MAX_LETTER_STACKS
				? String(position)
				: stackLabel(position, to),
		)
		.join(", ");
}

export function typedStackCount(
	range: RangeDraft,
	numbering: Numbering,
): number | undefined {
	if (range.noUnits) return undefined;
	const positions = typedPositions(range.finals, numbering);
	return positions && positions.length > 0
		? stackSpan(positions).count
		: undefined;
}
