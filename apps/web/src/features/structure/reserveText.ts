import { plural } from "./plural";

const NBSP = " ";

const sobram = (count: number) =>
	`${count === 1 ? "sobra" : "sobram"}${NBSP}${count}`;

function remainingLine(remaining: number): string {
	if (remaining <= 0) return "A reserva da obra acabou.";
	if (remaining === 1) return "Resta 1 unidade nesta obra.";
	return `Restam ${remaining} unidades nesta obra.`;
}

export function addOneLine(remaining: number): string {
	if (remaining <= 0) return remainingLine(remaining);
	return remaining === 1
		? "Usa 1 da única unidade que resta nesta obra."
		: `Usa 1 das ${remaining} unidades que restam nesta obra.`;
}

export type ReserveMode = "create" | "add";

export interface ReserveParts {
	units: number;
	floorHalls: number;
	entranceHalls: number;
	otherAreas: number;
}

export const INCOMPLETE_RESERVE =
	"Complete as faixas para ver quanto da reserva esta estrutura usa.";

const usesOf = (used: number, mode: ReserveMode) =>
	mode === "create"
		? `Esta estrutura usa${NBSP}${used}`
		: `Estes andares usam${NBSP}${used}`;

export function reserveLine(
	used: number,
	reserved: number,
	remaining: number,
	mode: ReserveMode,
): string {
	const ofReserved = `${usesOf(used, mode)} de ${reserved} ${
		reserved === 1 ? "reservada" : "reservadas"
	}.`;
	if (used > remaining) return ofReserved;
	const after = `Depois de ${mode === "create" ? "criar" : "adicionar"}, ${sobram(remaining - used)}.`;
	if (mode === "create") return `${ofReserved} ${after}`;
	const left =
		remaining === 1 ? "da 1 que resta" : `das ${remaining} que restam`;
	return `${usesOf(used, mode)} ${left} na reserva. ${after}`;
}

export function reserveDetail(parts: ReserveParts): string {
	return [
		[parts.units, "unidade", "unidades"] as const,
		[parts.floorHalls, "hall de andar", "halls de andar"] as const,
		[parts.entranceHalls, "hall de entrada", "halls de entrada"] as const,
		[parts.otherAreas, "outra área comum", "outras áreas comuns"] as const,
	]
		.filter(([count]) => count > 0)
		.map(([count, one, many]) => plural(count, one, many))
		.join(" + ");
}

export function missingReserveTitle(missing: number): string {
	return missing === 1
		? "Falta 1 unidade na reserva"
		: `Faltam ${missing} unidades na reserva`;
}

export function missingReserveText(
	used: number,
	remaining: number,
	mode: ReserveMode,
): string {
	return remaining <= 0
		? `${usesOf(used, mode)} e a reserva da obra acabou.`
		: `${usesOf(used, mode)} e a obra ainda tem${NBSP}${remaining}.`;
}

export function createdToast(towers: number, units: number): string {
	return `Estrutura criada: ${plural(towers, "torre", "torres")} e ${plural(units, "unidade", "unidades")}.`;
}

export function floorsAddedToast(floors: number, towerName?: string): string {
	const added = floors === 1 ? "andar adicionado" : "andares adicionados";
	return `${floors} ${added}${towerName ? ` à ${towerName}` : ""}.`;
}

export function listOfNames(names: string[]): string {
	const quoted = names.map((name) => `“${name}”`);
	const last = quoted.pop();
	return quoted.length === 0 ? (last ?? "") : `${quoted.join(", ")} e ${last}`;
}

export function nameTakenText(names: string[]): string {
	const many = names.length > 1;
	return `Já existe um local com ${many ? "os nomes" : "o nome"} ${listOfNames(names)}. Troque ${many ? "esses nomes" : "esse nome"} e tente de novo.`;
}

export function duplicateLine(units: number, remaining: number): string {
	const uses =
		remaining === 1
			? "Usa 1 da única unidade que resta nesta obra."
			: `Usa ${units} das ${remaining} unidades que restam nesta obra.`;
	return `${uses} Depois, ${sobram(remaining - units)}.`;
}

export function duplicateOverText(
	title: string,
	units: number,
	remaining: number,
): string {
	const left =
		remaining <= 0
			? "a reserva da obra acabou"
			: `${remaining === 1 ? "resta" : "restam"}${NBSP}${remaining}`;
	return `${title} usa ${plural(units, "unidade", "unidades")} e ${left}.`;
}
