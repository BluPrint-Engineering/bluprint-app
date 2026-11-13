import { TYPOLOGY_NAME_MAX_LENGTH } from "@bluprint/shared";

export function typologyNameError(name: string): string | undefined {
	const trimmed = name.trim();
	if (trimmed.length === 0) return "Informe o nome da tipologia.";
	if (trimmed.length > TYPOLOGY_NAME_MAX_LENGTH) {
		return `O nome pode ter até ${TYPOLOGY_NAME_MAX_LENGTH} caracteres.`;
	}
	return undefined;
}

export function typologyNameTakenText(name: string): string {
	return `Já existe a tipologia ${name} nesta obra.`;
}
