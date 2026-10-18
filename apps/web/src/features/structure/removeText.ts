import type {
	LocationType,
	StructureFloor,
	StructureTower,
} from "@bluprint/shared";

export interface ChildCounts {
	floors: number;
	units: number;
	commonAreas: number;
}

export const NO_CHILDREN: ChildCounts = { floors: 0, units: 0, commonAreas: 0 };

export const floorChildCounts = (floor: StructureFloor): ChildCounts => ({
	floors: 0,
	units: floor.units.length,
	commonAreas: floor.commonAreas.length,
});

export const towerChildCounts = (tower: StructureTower): ChildCounts => ({
	floors: tower.floors.length,
	units: tower.floors.reduce((sum, floor) => sum + floor.units.length, 0),
	commonAreas:
		tower.commonAreas.length +
		tower.floors.reduce((sum, floor) => sum + floor.commonAreas.length, 0),
});

export const hasChildren = ({ floors, units, commonAreas }: ChildCounts) =>
	floors + units + commonAreas > 0;

const FEMININE: Record<LocationType, boolean> = {
	tower: true,
	floor: false,
	unit: true,
	common_area: true,
};

function bare(type: LocationType, name: string): string {
	if (type === "unit") return `unidade ${name}`;
	if (type === "common_area") return `área comum ${name}`;
	return name;
}

const capitalize = (text: string) =>
	text.charAt(0).toUpperCase() + text.slice(1);

const withArticle = (type: LocationType, name: string) =>
	`${FEMININE[type] ? "a" : "o"} ${bare(type, name)}`;

export function removedText(type: LocationType, name: string): string {
	return `${capitalize(bare(type, name))} ${FEMININE[type] ? "excluída" : "excluído"}.`;
}

const RETRY = "Confira sua conexão e tente de novo.";

export function removeFailedText(type: LocationType, name: string): string {
	return `Não foi possível remover ${withArticle(type, name)}. ${RETRY}`;
}

export type UndoFailure = "reserve" | "name" | "other";

export function undoFailedText(
	type: LocationType,
	name: string,
	failure: UndoFailure,
): string {
	const subject = `Não foi possível trazer ${withArticle(type, name)} de volta`;
	if (failure === "reserve") return `${subject}: a reserva da obra acabou.`;
	if (failure === "name") return `${subject}: o nome já está em uso.`;
	return `${subject}. ${RETRY}`;
}

export const moveFailedText = `Não foi possível mover. ${RETRY}`;

export const confirmTitle = (type: LocationType, name: string) =>
	`Excluir ${withArticle(type, name)}?`;

const PARTS = [
	{ key: "floors", one: "andar", many: "andares", feminine: false },
	{ key: "units", one: "unidade", many: "unidades", feminine: true },
	{
		key: "commonAreas",
		one: "área comum",
		many: "áreas comuns",
		feminine: true,
	},
] as const;

function cascade(type: LocationType, counts: ChildCounts): string {
	const parts = PARTS.filter(({ key }) => counts[key] > 0).map((part) => {
		const count = counts[part.key];
		const article = part.feminine ? "a" : "o";
		return {
			feminine: part.feminine,
			plural: count > 1,
			text:
				count === 1
					? `${article} ${part.one}`
					: `${article}s ${count} ${part.many}`,
		};
	});
	if (parts.length === 0) return "";

	const list = parts
		.map(({ text }) => text)
		.join(", ")
		.replace(/, ([^,]*)$/, " e $1");
	const several = parts.length > 1 || parts.some(({ plural }) => plural);
	const ending = `${parts.some(({ feminine }) => !feminine) ? "o" : "a"}${several ? "s" : ""}`;

	return `${capitalize(list)} ${FEMININE[type] ? "dela" : "dele"} também ${several ? "são" : "é"} excluíd${ending}.`;
}

export function confirmParagraphs(
	type: LocationType,
	name: string,
	counts: ChildCounts,
): string[] {
	const lead = capitalize(withArticle(type, name));
	const content = `${lead} não tem pins, plantas nem dados.`;
	const reserve =
		counts.units === 0
			? []
			: [
					counts.units === 1
						? "A unidade volta para a reserva da obra."
						: `As ${counts.units} unidades voltam para a reserva da obra.`,
				];

	return [`${content} ${cascade(type, counts)}`.trim(), ...reserve];
}
