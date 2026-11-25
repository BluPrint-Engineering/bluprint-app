import { MAX_ROOMS_PER_LOCATION, ROOM_NAME_MAX_LENGTH } from "@bluprint/shared";

export type RoomHolder = "unit" | "common_area";

export function roomNameError(name: string): string | undefined {
	const trimmed = name.trim();
	if (trimmed.length === 0) return "Informe o nome do cômodo.";
	if (trimmed.length > ROOM_NAME_MAX_LENGTH) {
		return `O nome pode ter até ${ROOM_NAME_MAX_LENGTH} caracteres.`;
	}
	return undefined;
}

export function roomNameTakenText(holder: RoomHolder): string {
	return `Esse cômodo já está ${holder === "unit" ? "na unidade" : "na área comum"}.`;
}

export function roomLimitText(holder: RoomHolder): string {
	return `${holder === "unit" ? "A unidade" : "A área comum"} pode ter até ${MAX_ROOMS_PER_LOCATION} cômodos.`;
}
