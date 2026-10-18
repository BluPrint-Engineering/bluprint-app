import type { DuplicateKind } from "./duplicate";
import { placeOf } from "./naming";
import { listOfNames } from "./reserveText";

const MENU_LABELS: Record<DuplicateKind, string> = {
	tower: "Duplicar torre",
	floor: "Duplicar andar",
	unit: "Duplicar unidade",
};

export const duplicateMenuLabel = (type: DuplicateKind) => MENU_LABELS[type];

export function duplicateTitle(type: DuplicateKind, name: string): string {
	switch (type) {
		case "tower":
			return /^torre\b/i.test(name)
				? `Duplicar a ${name}`
				: `Duplicar a torre ${name}`;
		case "floor":
			return /andar$/i.test(name)
				? `Duplicar o ${name}`
				: `Duplicar o andar ${name}`;
		case "unit":
			return `Duplicar a unidade ${name}`;
	}
}

export function duplicatedToast(type: DuplicateKind, name: string): string {
	switch (type) {
		case "tower":
			return /^torre\b/i.test(name)
				? `${name} criada.`
				: `Torre ${name} criada.`;
		case "floor":
			return /andar$/i.test(name) ? `${name} criado.` : `Andar ${name} criado.`;
		case "unit":
			return `Unidade ${name} criada.`;
	}
}

export function copiedUnitsTakenText(
	names: string[],
	renumbered: boolean,
	towerName?: string,
): string {
	const many = names.length > 1;
	const place = placeOf("tower", towerName);
	if (!renumbered) {
		const created = many
			? `As unidades ${listOfNames(names)} acabaram de ser criadas`
			: `A unidade ${listOfNames(names)} acabou de ser criada`;
		return `${created} ${place}. Tente de novo para usar o próximo número de cópia.`;
	}
	const taken = many
		? `Já existem as unidades ${listOfNames(names)}`
		: `Já existe a unidade ${listOfNames(names)}`;
	return `${taken} ${place}. Troque o número do andar e tente de novo.`;
}
