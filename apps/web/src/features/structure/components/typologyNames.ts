import { TYPOLOGY_NAME_MAX_LENGTH } from "@bluprint/shared";

export const TYPOLOGY_NAME_TAKEN_TEXT = "Esse nome já existe nesta obra.";

export function typologyNameError(name: string): string | undefined {
	const trimmed = name.trim();
	if (trimmed.length === 0) return "Informe o nome.";
	if (trimmed.length > TYPOLOGY_NAME_MAX_LENGTH) {
		return `O nome pode ter até ${TYPOLOGY_NAME_MAX_LENGTH} caracteres.`;
	}
	return undefined;
}
