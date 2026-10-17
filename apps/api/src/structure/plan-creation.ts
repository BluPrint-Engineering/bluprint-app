import {
	LOCATION_ID_TAKEN,
	LOCATION_NAME_TAKEN,
	LOCATION_PARENT_INVALID,
	type NewLocation,
	type StructureCounts,
} from "@bluprint/shared";
import { ProblemException } from "../common/problems/problem.exception";
import { canHoldChild } from "./location-pairs";
import type { LocationRow } from "./location-row";

export interface CreationPlan {
	fresh: NewLocation[];
	newUnits: number;
	counts: StructureCounts;
}

const comparable = (name: string) =>
	name.trim().replace(/\s+/g, " ").toLowerCase();

export function planCreation(
	requested: NewLocation[],
	inProject: LocationRow[],
	takenElsewhere: ReadonlySet<string>,
): CreationPlan {
	const stored = new Map(inProject.map((row) => [row.id, row]));

	for (const entry of requested) {
		const existing = stored.get(entry.id);
		if (
			takenElsewhere.has(entry.id) ||
			(existing &&
				(existing.type !== entry.type || existing.parentId !== entry.parentId))
		) {
			throw new ProblemException({
				status: 409,
				code: LOCATION_ID_TAKEN,
				detail: "A location id of the request is already taken.",
			});
		}
	}

	const known = new Map<string, Pick<LocationRow, "type" | "parentId">>(stored);
	for (const entry of requested) {
		const parent = entry.parentId === null ? null : known.get(entry.parentId);
		if (
			parent === undefined ||
			!canHoldChild(parent?.type ?? null, entry.type)
		) {
			throw new ProblemException({
				status: 400,
				code: LOCATION_PARENT_INVALID,
				detail:
					"A location hangs under a parent that does not exist yet or cannot hold its kind.",
			});
		}
		known.set(entry.id, entry);
	}

	const scopeOf = ({
		type,
		parentId,
	}: Pick<LocationRow, "type" | "parentId">) => {
		if (type === "unit") {
			const floor = parentId === null ? undefined : known.get(parentId);
			return `unit|${floor?.parentId}`;
		}
		return `${type}|${type === "tower" ? "" : parentId}`;
	};
	const nameKey = (row: Pick<LocationRow, "type" | "parentId">, name: string) =>
		`${scopeOf(row)}|${comparable(name)}`;

	const fresh = requested.filter((entry) => !stored.has(entry.id));
	const claimed = new Set(inProject.map((row) => nameKey(row, row.name)));
	const clashes = new Set<string>();
	for (const entry of fresh) {
		const key = nameKey(entry, entry.name);
		if (claimed.has(key)) clashes.add(entry.name);
		claimed.add(key);
	}
	if (clashes.size > 0) {
		throw new ProblemException({
			status: 409,
			code: LOCATION_NAME_TAKEN,
			detail: "A name of the request is already in use where it would go.",
			names: [...clashes],
		});
	}

	const count = (type: NewLocation["type"]) =>
		requested.filter((entry) => entry.type === type).length;

	return {
		fresh,
		newUnits: fresh.filter((entry) => entry.type === "unit").length,
		counts: {
			towers: count("tower"),
			floors: count("floor"),
			units: count("unit"),
			commonAreas: count("common_area"),
		},
	};
}
