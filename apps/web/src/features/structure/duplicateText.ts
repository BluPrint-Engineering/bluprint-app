import { MAX_LOCATIONS_PER_REQUEST } from "@bluprint/shared";
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

export function duplicateTooLargeText(locations: number): string {
	return `Esta cópia tem ${locations.toLocaleString("pt-BR")} locais e o limite é ${MAX_LOCATIONS_PER_REQUEST.toLocaleString("pt-BR")} por vez. Duplique os andares um a um.`;
}

export function duplicateGoneText(type: DuplicateKind, name: string): string {
	const close = "Feche para ver a estrutura atualizada.";
	switch (type) {
		case "tower":
			return `${/^torre\b/i.test(name) ? `A ${name}` : `A torre ${name}`} foi excluída e não pode mais ser duplicada. ${close}`;
		case "floor":
			return `${/andar$/i.test(name) ? `O ${name}` : `O andar ${name}`} foi excluído e não pode mais ser duplicado. ${close}`;
		case "unit":
			return `A unidade ${name} foi excluída e não pode mais ser duplicada. ${close}`;
	}
}
