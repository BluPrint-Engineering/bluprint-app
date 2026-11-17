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

export function deleteBlockedText(locationType: TypologyLocationType): string {
	return `Excluir (só sem ${FOLLOWERS[locationType].many})`;
}

export function unitsChangedText({
	name,
	locationType,
	locationCount,
	changedLocationCount,
}: Typology): string {
	const { one, many, none } = FOLLOWERS[locationType];
	if (locationCount === 0) return `${none} usa a ${name} ainda.`;

	const reach =
		locationCount === 1
			? `Salvar muda 1 ${one} da ${name}.`
			: `Salvar muda as ${locationCount} ${many} da ${name}.`;
	if (changedLocationCount === 0) return reach;

	return changedLocationCount === 1
		? `${reach} 1 ${one} com alterações mantém o que foi mudado nela.`
		: `${reach} ${changedLocationCount} ${many} com alterações mantêm o que foi mudado nelas.`;
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
