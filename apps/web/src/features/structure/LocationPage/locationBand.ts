import type { LocationDetail, LocationRef, Structure } from "@bluprint/shared";
import { plural } from "../plural";
import { PROJECT_ORIGIN } from "./origin";

export interface LocationBand {
	parent: { kind: "project" } | { kind: "location"; id: string; name: string };
	title: string;
	mono: boolean;
	meta: string;
}

const KIND_LABEL = {
	tower: "Torre",
	floor: "Andar",
	unit: "Unidade",
	common_area: "Área comum",
} as const;

function unitsOf(structure: Structure, towerId: string): number {
	const tower = structure.towers.find((candidate) => candidate.id === towerId);
	return tower?.floors.reduce((sum, floor) => sum + floor.units.length, 0) ?? 0;
}

export function describeLocation(
	location: LocationDetail,
	structure: Structure,
	from?: string,
): LocationBand {
	const showTower = structure.towers.length > 1;
	const above: LocationRef[] = location.ancestors.filter(
		(ancestor) => ancestor.type !== "tower" || showTower,
	);
	const origin = above.find((ancestor) => ancestor.id === from);
	const parent = origin ?? above.at(-1);

	const context: string[] = [];
	switch (location.type) {
		case "tower":
			context.push(
				plural(
					location.children.filter((child) => child.type === "floor").length,
					"andar",
					"andares",
				),
				plural(unitsOf(structure, location.id), "unidade", "unidades"),
			);
			break;
		case "floor":
			context.push(
				...above.map((ancestor) => ancestor.name),
				plural(
					location.children.filter((child) => child.type === "unit").length,
					"unidade",
					"unidades",
				),
			);
			break;
		case "unit":
			context.push(...above.map((ancestor) => ancestor.name));
			break;
		case "common_area":
			context.push(
				...(above.length > 0
					? above.map((ancestor) => ancestor.name)
					: ["da obra"]),
			);
			break;
	}

	return {
		parent:
			from === PROJECT_ORIGIN || !parent
				? { kind: "project" }
				: { kind: "location", id: parent.id, name: parent.name },
		title: location.name,
		mono: location.type === "unit",
		meta: [KIND_LABEL[location.type], ...context].join(" · "),
	};
}
