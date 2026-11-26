import { z } from "zod";
import {
	STRUCTURE_DRAFT_VERSION,
	storedWizardDraftSchema,
} from "./wizardDraft";

export const STRUCTURE_DRAFT_PREFIX = "bluprint.structure-draft.";
export const SIGN_OUT_REQUEST = "bluprint:structure-draft-sign-out";

export function requestDraftSignOut(): Promise<boolean> {
	return new Promise((resolve) => {
		const event = new CustomEvent(SIGN_OUT_REQUEST, {
			cancelable: true,
			detail: resolve,
		});
		if (window.dispatchEvent(event)) resolve(true);
	});
}

const attemptSchema = z.strictObject({
	ids: z.record(z.string(), z.uuid()),
	firstLocationId: z.uuid(),
});

export const structureDraftSchema = z.strictObject({
	version: z.literal(STRUCTURE_DRAFT_VERSION),
	draft: storedWizardDraftSchema,
	attempt: attemptSchema.optional(),
});

export type StructureDraft = z.infer<typeof structureDraftSchema>;

export function structureDraftKey(
	accountId: string,
	projectId: string,
	towerId?: string,
): string {
	const flow = towerId === undefined ? "new" : `tower:${towerId}`;
	return `${STRUCTURE_DRAFT_PREFIX}${encodeURIComponent(accountId)}:${encodeURIComponent(projectId)}:${encodeURIComponent(flow)}`;
}

export function readStructureDraft(key: string): StructureDraft | undefined {
	const raw = localStorage.getItem(key);
	if (raw === null) return undefined;
	try {
		const result = structureDraftSchema.safeParse(JSON.parse(raw));
		if (result.success) return result.data;
	} catch {
		localStorage.removeItem(key);
		return undefined;
	}
	localStorage.removeItem(key);
	return undefined;
}

export function writeStructureDraft(key: string, draft: StructureDraft): void {
	localStorage.setItem(key, JSON.stringify(draft));
}

export function dropStructureDrafts(
	accountId: string,
	keepAccount: boolean,
): void {
	const accountPrefix = `${STRUCTURE_DRAFT_PREFIX}${encodeURIComponent(accountId)}:`;
	const keys = Array.from({ length: localStorage.length }, (_, index) =>
		localStorage.key(index),
	);
	for (const key of keys) {
		if (
			key?.startsWith(STRUCTURE_DRAFT_PREFIX) &&
			key.startsWith(accountPrefix) !== keepAccount
		) {
			localStorage.removeItem(key);
		}
	}
}
