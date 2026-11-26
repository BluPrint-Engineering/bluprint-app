import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { RuleDraft, TypologyDraft } from "./StructureWizard/typologyRules";
import {
	type AreaDraft,
	type ExtendDraft,
	type FloorAreaDraft,
	initialDraft,
	type RangeDraft,
	restoreWizardDraft,
	STRUCTURE_DRAFT_VERSION,
	storeWizardDraft,
	type TowerDraft,
	type WizardDraft,
} from "./StructureWizard/wizardDraft";
import {
	dropStructureDrafts,
	readStructureDraft,
	type StructureDraft,
	structureDraftKey,
	structureDraftSchema,
	writeStructureDraft,
} from "./structureDraftStore";

const fields = {
	wizard: {
		extend: true,
		towers: true,
		numbering: true,
		projectAreas: true,
		towerAreas: true,
		floorAreas: true,
		typologies: true,
		rules: true,
	} satisfies Record<keyof WizardDraft, true>,
	tower: {
		key: true,
		name: true,
		ranges: true,
		ground: true,
		hall: true,
		entranceTypology: true,
		hallTypology: true,
	} satisfies Record<keyof TowerDraft, true>,
	range: {
		key: true,
		first: true,
		last: true,
		finals: true,
		noUnits: true,
	} satisfies Record<keyof RangeDraft, true>,
	floorArea: {
		key: true,
		tower: true,
		floor: true,
		name: true,
		typology: true,
	} satisfies Record<keyof FloorAreaDraft, true>,
	area: {
		name: true,
		typology: true,
	} satisfies Record<keyof AreaDraft, true>,
	typology: {
		key: true,
		name: true,
		rooms: true,
		locationType: true,
	} satisfies Record<keyof TypologyDraft, true>,
	rule: {
		key: true,
		tower: true,
		finals: true,
		from: true,
		to: true,
		typology: true,
	} satisfies Record<keyof RuleDraft, true>,
	extend: {
		towerId: true,
		towerName: true,
		named: true,
		takenFloors: true,
		takenUnits: true,
		lead: true,
	} satisfies Record<keyof ExtendDraft, true>,
};

beforeEach(() => localStorage.clear());

function shape(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(shape).slice(0, 1);
	if (value !== null && typeof value === "object")
		return Object.fromEntries(
			Object.entries(value).map(([key, nested]) => [key, shape(nested)]),
		);
	return typeof value;
}

describe("structure draft storage", () => {
	it(`records the persisted schema shape for version ${STRUCTURE_DRAFT_VERSION}`, () => {
		expect({
			schema: z.toJSONSchema(structureDraftSchema),
			initial: shape(initialDraft()),
			fields,
		}).toMatchSnapshot();
	});
	it("stores typed fields without server facts", () => {
		const draft = initialDraft();
		draft.extend = {
			towerId: "server-id",
			towerName: "Server tower",
			named: true,
			takenFloors: [4],
			takenUnits: ["401"],
			lead: "Server facts",
		};
		const saved = JSON.stringify(storeWizardDraft(draft));
		expect(saved).not.toContain("Server tower");
		expect(saved).not.toContain("401");
		expect(saved).not.toContain("Server facts");
		expect(saved).not.toContain("takenFloors");
	});

	it("reads back a record with the typologies of the entrance, the floor hall and the common areas", () => {
		const key = structureDraftKey("a", "p");
		const start = initialDraft();
		const tower = start.towers[0];
		if (!tower) throw new Error("the initial draft has no tower");
		const draft: WizardDraft = {
			...start,
			towers: [
				{
					...tower,
					hall: true,
					entranceTypology: "type-hall",
					hallTypology: "server-hall",
				},
			],
			projectAreas: [{ name: "Salão de festas", typology: "type-hall" }],
			towerAreas: [{ name: "Garagem", typology: null }],
			floorAreas: [
				{
					key: "area-1",
					tower: 0,
					floor: "1",
					name: "Lavanderia",
					typology: "server-hall",
				},
			],
			typologies: [
				...start.typologies,
				{
					key: "type-hall",
					name: "Hall social",
					rooms: ["Piso"],
					locationType: "common_area",
				},
			],
		};
		writeStructureDraft(key, {
			version: STRUCTURE_DRAFT_VERSION,
			draft: storeWizardDraft(draft),
		});

		const read = readStructureDraft(key);

		expect(read && restoreWizardDraft(read.draft)).toEqual(draft);
		expect(localStorage.getItem(key)).not.toBeNull();
	});

	it("isolates account, project and flow", () => {
		const keys = [
			structureDraftKey("a", "p"),
			structureDraftKey("b", "p"),
			structureDraftKey("a", "q"),
			structureDraftKey("a", "p", "tower-1"),
			structureDraftKey("a", "p", "tower-2"),
		];
		expect(new Set(keys).size).toBe(5);
	});

	it("discards invalid or old records instead of restoring part of them", () => {
		const key = structureDraftKey("a", "p");
		for (const value of [
			"{",
			JSON.stringify({
				version: STRUCTURE_DRAFT_VERSION - 1,
				draft: storeWizardDraft(initialDraft()),
			}),
			JSON.stringify({ version: STRUCTURE_DRAFT_VERSION, draft: {} }),
		]) {
			localStorage.setItem(key, value);
			expect(readStructureDraft(key)).toBeUndefined();
			expect(localStorage.getItem(key)).toBeNull();
		}
	});

	it("removes other accounts and then the signed-out account", () => {
		const own = structureDraftKey("a", "p");
		const other = structureDraftKey("b", "p");
		const value: StructureDraft = {
			version: STRUCTURE_DRAFT_VERSION,
			draft: storeWizardDraft(initialDraft()),
		};
		writeStructureDraft(own, value);
		writeStructureDraft(other, value);
		dropStructureDrafts("a", true);
		expect(readStructureDraft(own)).toEqual(value);
		expect(readStructureDraft(other)).toBeUndefined();
		dropStructureDrafts("a", false);
		expect(readStructureDraft(own)).toBeUndefined();
	});
});
