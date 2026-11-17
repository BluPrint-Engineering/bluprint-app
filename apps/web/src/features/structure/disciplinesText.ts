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
