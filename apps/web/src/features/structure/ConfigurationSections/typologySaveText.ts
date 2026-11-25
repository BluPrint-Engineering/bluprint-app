import type { Typology, TypologyLocationType } from "@bluprint/shared";
import { plural } from "../plural";

const FOLLOWERS = {
	unit: { one: "unidade", many: "unidades", none: "Nenhuma unidade" },
	common_area: {
		one: "área comum",
		many: "áreas comuns",
		none: "Nenhuma área comum",
	},
} as const satisfies Record<TypologyLocationType, object>;

export function followersText(
	locationType: TypologyLocationType,
	count: number,
): string {
	const { one, many } = FOLLOWERS[locationType];
	return plural(count, one, many);
}

export function unitsChangedText({
	name,
	locationType,
	locationCount,
}: Typology): string {
	const { one, many, none } = FOLLOWERS[locationType];
	if (locationCount === 0) return `${none} usa a ${name} ainda.`;

	const reach =
		locationCount === 1
			? `Salvar muda 1 ${one} da ${name}.`
			: `Salvar muda as ${locationCount} ${many} da ${name}.`;
	return `${reach} Um local com alterações mantém o que foi mudado nele.`;
}

export function savedText(
	{ name, locationType }: Typology,
	updatedLocationCount: number,
): string {
	const { one, many } = FOLLOWERS[locationType];
	return updatedLocationCount === 0
		? `${name} salva.`
		: `${name} salva. ${plural(updatedLocationCount, `${one} atualizada`, `${many} atualizadas`)}.`;
}

export function saveFailedText({ name }: Typology): string {
	return `A ${name} não mudou. Confira a conexão e tente de novo.`;
}

export function deleteInUseText({ name, locationType }: Typology): string {
	return `Não foi possível excluir a ${name}: ${FOLLOWERS[locationType].many} passaram a usá-la.`;
}

export function changedTitleText({ name }: Pick<Typology, "name">): string {
	return `A ${name} mudou`;
}

export const CHANGED_TEXT =
	"Outra pessoa salvou enquanto você editava. Confira a lista atual antes de salvar de novo.";

export function deletedByOtherText({ name }: Pick<Typology, "name">): string {
	return `A ${name} foi excluída por outra pessoa.`;
}
