import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
	dropStructureDrafts,
	readStructureDraft,
	type StructureDraft,
	structureDraftKey,
	structureDraftSchema,
	writeStructureDraft,
} from "./structureDraftStore";
import {
	initialDraft,
	STRUCTURE_DRAFT_VERSION,
	storeWizardDraft,
} from "./wizardDraft";

beforeEach(() => localStorage.clear());

describe("structure draft storage", () => {
	it(`records the persisted schema shape for version ${STRUCTURE_DRAFT_VERSION}`, () => {
		expect(z.toJSONSchema(structureDraftSchema)).toMatchSnapshot();
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
			JSON.stringify({ version: 0, draft: {} }),
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
