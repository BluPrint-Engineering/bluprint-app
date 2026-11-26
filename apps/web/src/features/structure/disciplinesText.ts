import type { LocationDetail } from "@bluprint/shared";

type Located = Pick<LocationDetail, "type" | "name">;

export function joinWithAnd(names: readonly string[]): string {
	if (names.length < 2) return names.join("");
	return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

function ofLocation({ type, name }: Located): string {
	if (type === "common_area") return `do ${name}`;
	if (type === "floor") return `do ${name}`;
	return `da ${name}`;
}

export const disciplinesFailedText = (location: Located) =>
	`As disciplinas ${ofLocation(location)} não mudaram. Confira a conexão e tente de novo.`;

export const generalSentence = (turnedOn: readonly string[]) =>
	`Geral vale em todo local e não entra na lista. Pin novo aqui oferece ${joinWithAnd(turnedOn)}.`;

export const NONE_TURNED_ON =
	"Nenhuma disciplina específica ligada. Pin novo aqui, nem na Geral, só depois de ligar uma.";

export const OFF_HERE = "Desligada neste local.";

export function ownListSentence(type: LocationDetail["type"]) {
	if (type === "floor") {
		return "Esta lista vale só para o andar. As unidades e áreas comuns têm suas próprias listas.";
	}
	if (type === "tower") {
		return "Esta lista vale só para a torre. Os andares, unidades e áreas comuns têm suas próprias listas.";
	}
	return undefined;
}

export const BATCH_TITLE = "Disciplinas em lote";
export const BATCH_MENU_LABEL = "Disciplinas em lote";
export const BATCH_PENDING = "Aplicando…";
export const BATCH_PLACES_NOTE = "Marque os locais deste andar.";
export const BATCH_SCOPE_NOTE =
	"O lote muda as unidades e áreas comuns dali. A lista do próprio andar ou torre não muda.";
export const GENERAL_NOTE = "Geral vale em todo local e não entra na lista.";
export const NO_TOWER = "Esta obra ainda não tem torre.";
export const NO_FLOORS = "Esta torre ainda não tem andares.";
export const EMPTY_FLOOR = "Este andar não tem unidade nem área comum.";
export const EMPTY_TOWER = "Esta torre não tem unidade nem área comum.";
export const BATCH_GONE_TEXT =
	"Um dos locais marcados não existe mais. Confira a lista e aplique de novo.";
export const BATCH_FAILED_TEXT = "Confira a conexão e tente de novo.";

export const batchApplyLabel = (count: number) =>
	count === 0
		? "Aplicar"
		: `Aplicar a ${count} ${count === 1 ? "local" : "locais"}`;

export const batchAppliedText = (count: number) =>
	`Disciplinas aplicadas a ${count} ${count === 1 ? "local" : "locais"}.`;

export const batchCardLabel = (type: LocationDetail["type"]) =>
	type === "floor" || type === "tower"
		? "Aplicar às unidades e áreas comuns"
		: "Aplicar a outros locais";
