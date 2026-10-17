import {
	comparableLocationName,
	LOCATION_NAME_MAX_LENGTH,
	type LocationType,
} from "@bluprint/shared";

export type Scope = "project" | "tower" | "floor";

function successor(name: string): string {
	const number = /^(.*?)(\d+)$/.exec(name);
	if (number) {
		const [, head = "", tail = ""] = number;
		return `${head}${String(Number(tail) + 1).padStart(tail.length, "0")}`;
	}
	const letter = /^(.*\d)([A-Y])$/.exec(name);
	if (letter) {
		const [, head = "", last = ""] = letter;
		return `${head}${String.fromCharCode(last.charCodeAt(0) + 1)}`;
	}
	return "";
}

function firstOfFloor(floorName: string, lettered: boolean): string {
	const number = /^(\d+)º/.exec(floorName)?.[1];
	if (!number) return "";
	return lettered ? `${number}A` : `${number}01`;
}

export function nextTowerName(towerNames: string[]): string {
	const taken = new Set(towerNames.map(comparableLocationName));
	for (let code = "A".charCodeAt(0); code <= "Z".charCodeAt(0); code++) {
		const candidate = `Torre ${String.fromCharCode(code)}`;
		if (!taken.has(comparableLocationName(candidate))) return candidate;
	}
	return "";
}

export function nextUnitName(
	floorName: string,
	floorUnitNames: string[],
	towerUnitNames: string[],
): string {
	const taken = new Set(towerUnitNames.map(comparableLocationName));
	const last = floorUnitNames.at(-1);
	let candidate =
		last === undefined
			? firstOfFloor(
					floorName,
					towerUnitNames.some((name) => /^\d+[A-Z]$/i.test(name)),
				)
			: successor(last);
	for (
		let tries = 0;
		candidate !== "" && tries <= towerUnitNames.length;
		tries++
	) {
		if (!taken.has(comparableLocationName(candidate))) return candidate;
		candidate = successor(candidate);
	}
	return "";
}

export function nameProblem(raw: string): string | undefined {
	const name = raw.trim();
	if (name === "") return "Informe o nome.";
	if (name.length > LOCATION_NAME_MAX_LENGTH) {
		return `Use até ${LOCATION_NAME_MAX_LENGTH} caracteres.`;
	}
	return undefined;
}

function placeOf(scope: Scope, towerName: string | undefined): string {
	if (scope === "project") return "na obra";
	if (scope === "floor") return "neste andar";
	return towerName ? `na ${towerName}` : "nesta torre";
}

export function takenText(
	type: LocationType,
	name: string,
	scope: Scope,
	towerName?: string,
): string {
	const place = placeOf(scope, towerName);
	switch (type) {
		case "unit":
			return `Já existe a unidade ${name} ${place}.`;
		case "floor":
			return `Já existe o ${/andar$/i.test(name) ? name : `andar ${name}`} ${place}.`;
		case "tower":
			return `Já existe uma torre com o nome ${name}.`;
		case "common_area":
			return `Já existe uma área comum ${name} ${place}.`;
	}
}

export function uniqueHint(scope: Scope): string {
	if (scope === "project") return "Único na obra.";
	if (scope === "floor") return "Único no andar.";
	return "Único na torre.";
}

const RENAME_TITLES: Record<LocationType, string> = {
	tower: "Renomear a torre",
	floor: "Renomear o andar",
	unit: "Renomear a unidade",
	common_area: "Renomear a área comum",
};

export const renameTitle = (type: LocationType) => RENAME_TITLES[type];

const RENAME_LABELS: Record<LocationType, string> = {
	tower: "Renomear torre",
	floor: "Renomear andar",
	unit: "Renomear",
	common_area: "Renomear",
};

export const renameLabel = (type: LocationType) => RENAME_LABELS[type];
