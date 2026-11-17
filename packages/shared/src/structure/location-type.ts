import { z } from "zod";

export const locationTypes = ["tower", "floor", "unit", "common_area"] as const;

export const locationTypeSchema = z.enum(locationTypes).meta({
	id: "LocationType",
	description:
		"What a location is: a `tower`, a `floor` of a tower, a `unit` on a floor, or a `common_area` of the project, a tower or a floor.",
});

export type LocationType = z.infer<typeof locationTypeSchema>;

export const locationTypesUsingReservation = [
	"unit",
	"common_area",
] as const satisfies readonly LocationType[];

export const typologyLocationTypes = [
	"unit",
	"common_area",
] as const satisfies readonly LocationType[];

export const typologyLocationTypeSchema = z.enum(typologyLocationTypes).meta({
	id: "TypologyLocationType",
	description:
		"The kind of location a typology serves, chosen when it is created and never changed: a `unit` typology is followed by units only, a `common_area` typology by common areas only (ADR 0080).",
});

export type TypologyLocationType = z.infer<typeof typologyLocationTypeSchema>;

export const followsTypologies = (
	type: LocationType,
): type is TypologyLocationType =>
	(typologyLocationTypes as readonly LocationType[]).includes(type);

export const usesReservation = (type: LocationType): boolean =>
	(locationTypesUsingReservation as readonly LocationType[]).includes(type);
