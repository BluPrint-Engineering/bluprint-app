import type { Typology, TypologyLocationType } from "@bluprint/shared";
import type { TypologyDraft, WizardDraft } from "./wizardDraft";

export interface CatalogTypology {
	key: string;
	name: string;
	rooms: string[];
	locationType: TypologyLocationType;
	existing: boolean;
}

export function catalogOf(
	draft: WizardDraft,
	existing: readonly Typology[],
): CatalogTypology[] {
	return [
		...draft.typologies.map((typology) => ({
			...typology,
			existing: false,
		})),
		...existing.map((typology) => ({
			key: typology.id,
			name: typology.name,
			rooms: typology.rooms.map((room) => room.name),
			locationType: typology.locationType,
			existing: true,
		})),
	];
}

export function ofKind(
	catalog: readonly CatalogTypology[],
	locationType: TypologyLocationType,
): CatalogTypology[] {
	return catalog.filter((typology) => typology.locationType === locationType);
}

export function typologyNameOf(
	catalog: readonly CatalogTypology[],
	key: string | null,
): string | undefined {
	if (key === null) return undefined;
	return catalog.find((typology) => typology.key === key)?.name;
}

export function takenTypologyNames(
	draft: WizardDraft,
	existing: readonly Typology[],
): string[] {
	return [
		...draft.typologies.map((typology) => typology.name),
		...existing.map((typology) => typology.name),
	];
}

export function usedRoomNames(
	serverNames: readonly string[],
	typologies: readonly Pick<TypologyDraft, "rooms">[],
): string[] {
	return [...serverNames, ...typologies.flatMap((typology) => typology.rooms)];
}
