import type { UnitType } from "@bluprint/shared";
import { plural } from "../plural";

export function unitsChangedText({
	name,
	unitCount,
	changedUnitCount,
}: UnitType): string {
	if (unitCount === 0) return `Nenhuma unidade usa a ${name} ainda.`;

	const reach =
		unitCount === 1
			? `Salvar muda 1 unidade da ${name}.`
			: `Salvar muda as ${unitCount} unidades da ${name}.`;
	if (changedUnitCount === 0) return reach;

	return changedUnitCount === 1
		? `${reach} 1 unidade com alterações mantém o que foi mudado nela.`
		: `${reach} ${changedUnitCount} unidades com alterações mantêm o que foi mudado nelas.`;
}

export function savedText(name: string, updatedUnitCount: number): string {
	return updatedUnitCount === 0
		? `${name} salva.`
		: `${name} salva. ${plural(updatedUnitCount, "unidade atualizada", "unidades atualizadas")}.`;
}
