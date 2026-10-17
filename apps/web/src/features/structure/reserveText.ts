import { plural } from "./plural";

const NBSP = " ";

const sobram = (count: number) =>
	`${count === 1 ? "sobra" : "sobram"}${NBSP}${count}`;

function remainingLine(remaining: number): string {
	if (remaining <= 0) return "A reserva da obra acabou.";
	if (remaining === 1) return "Resta 1 unidade nesta obra.";
	return `Restam ${remaining} unidades nesta obra.`;
}

export function planLine(
	units: number,
	remaining: number,
	verb: "criar" | "adicionar",
): string {
	if (remaining <= 0 || units > remaining || units === 0) {
		return remainingLine(remaining);
	}
	const uses =
		remaining === 1
			? "Usa 1 da única unidade que resta nesta obra."
			: `Usa ${units} das ${remaining} unidades que restam nesta obra.`;
	return `${uses} Depois de ${verb}, ${sobram(remaining - units)}.`;
}

export function addUnitLine(remaining: number): string {
	if (remaining <= 0) return remainingLine(remaining);
	return remaining === 1
		? "Usa 1 da única unidade que resta nesta obra."
		: `Usa 1 das ${remaining} unidades que restam nesta obra.`;
}

export function overReserveText(
	units: number,
	remaining: number,
	admin: boolean,
): string {
	const head = `Esta estrutura tem ${plural(units, "unidade", "unidades")}`;
	if (remaining <= 0) {
		return `${head} e a reserva da obra acabou. ${
			admin
				? "Aumente a reserva."
				: "Peça mais reserva ao admin da construtora."
		}`;
	}
	return `${head} e a obra tem${NBSP}${remaining}. Tire ${plural(
		units - remaining,
		"unidade",
		"unidades",
	)} ou ${
		admin ? "aumente a reserva." : "peça mais reserva ao admin da construtora."
	}`;
}

export function createdToast(towers: number, units: number): string {
	return `Estrutura criada: ${plural(towers, "torre", "torres")} e ${plural(units, "unidade", "unidades")}.`;
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

export function unitTypeNameTakenText(names: string[]): string {
	const many = names.length > 1;
	return `Já existe uma tipologia com ${many ? "os nomes" : "o nome"} ${listOfNames(names)}. Troque ${many ? "esses nomes" : "esse nome"} e tente de novo.`;
}
