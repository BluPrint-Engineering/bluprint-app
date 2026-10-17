import { ROOM_NAME_MAX_LENGTH } from "@bluprint/shared";

export type RoomHolder = "unit" | "common_area";

export function roomNameError(name: string): string | undefined {
	const trimmed = name.trim();
	if (trimmed.length === 0) return "Informe o nome do cômodo.";
	if (trimmed.length > ROOM_NAME_MAX_LENGTH) {
		return `O nome pode ter até ${ROOM_NAME_MAX_LENGTH} caracteres.`;
	}
	return undefined;
}

export function roomNameTakenText(holder: RoomHolder, name: string): string {
	return `Já existe o cômodo ${name} ${holder === "unit" ? "nesta unidade" : "nesta área comum"}.`;
}
