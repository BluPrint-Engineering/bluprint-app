import type { QueryClient } from "@tanstack/react-query";
import { sessionQueryOptions } from "./api";

export const sessionDraftKinds = [
	"create-project",
	"rename-project",
	"change-reservation",
	"update-reservations",
	"create-structure",
	"duplicate-location",
	"rename-location",
	"add-room",
	"rename-room",
	"change-unit-type",
	"create-unit-type",
	"update-unit-type",
] as const;

export type SessionDraftKind = (typeof sessionDraftKinds)[number];

interface StoredDraft {
	kind: SessionDraftKind;
	variables: unknown;
}

const PREFIX = "bluprint.session-draft.";

declare module "@tanstack/react-query" {
	interface Register {
		mutationMeta: {
			sessionDraft?: SessionDraftKind;
		};
	}
}

export function isSessionDraftKind(value: unknown): value is SessionDraftKind {
	return (
		typeof value === "string" &&
		sessionDraftKinds.some((kind) => kind === value)
	);
}

export function accountIdFromSession(value: unknown): string | undefined {
	if (typeof value !== "object" || value === null || !("user" in value)) {
		return undefined;
	}
	const { user } = value;
	if (typeof user !== "object" || user === null || !("id" in user)) {
		return undefined;
	}
	return typeof user.id === "string" ? user.id : undefined;
}

export function screenPath(location: {
	pathname: string;
	searchStr: string;
}): string {
	return location.pathname + location.searchStr;
}

export function rememberFailedSubmission({
	accountId,
	path,
	kind,
	variables,
}: {
	accountId: string | undefined;
	path: string;
	kind: unknown;
	variables: unknown;
}): void {
	if (!accountId || !isSessionDraftKind(kind) || containsPassword(variables)) {
		return;
	}
	const body = JSON.stringify({ kind, variables } satisfies StoredDraft);
	if (body === undefined) return;
	localStorage.setItem(storageKey(accountId, path), body);
}

export function forgetFailedSubmission({
	accountId,
	path,
	kind,
}: {
	accountId: string | undefined;
	path: string;
	kind: unknown;
}): void {
	if (!accountId || !isSessionDraftKind(kind)) return;
	const stored = readSessionDraft(accountId, path);
	if (stored?.kind !== kind) return;
	localStorage.removeItem(storageKey(accountId, path));
}

export function readSessionDraft(
	accountId: string,
	path: string,
): StoredDraft | undefined {
	const raw = localStorage.getItem(storageKey(accountId, path));
	if (raw === null) return undefined;
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return undefined;
	}
	if (typeof parsed !== "object" || parsed === null) return undefined;
	if (!("kind" in parsed) || !isSessionDraftKind(parsed.kind)) return undefined;
	if (!("variables" in parsed)) return undefined;
	return { kind: parsed.kind, variables: parsed.variables };
}

export function clearSessionDraft(accountId: string, path: string): void {
	localStorage.removeItem(storageKey(accountId, path));
}

export function dropDraftsOfOtherAccounts(accountId: string): void {
	const keys: string[] = [];
	for (let index = 0; index < localStorage.length; index++) {
		const key = localStorage.key(index);
		if (key?.startsWith(PREFIX)) keys.push(key);
	}
	for (const key of keys) {
		if (!key.startsWith(storageKey(accountId, ""))) {
			localStorage.removeItem(key);
		}
	}
}

export function cachedAccountId(queryClient: QueryClient): string | undefined {
	return accountIdFromSession(
		queryClient.getQueryData(sessionQueryOptions.queryKey),
	);
}

function storageKey(accountId: string, path: string): string {
	return `${PREFIX}${encodeURIComponent(accountId)}:${encodeURIComponent(path)}`;
}

function containsPassword(value: unknown): boolean {
	if (typeof value !== "object" || value === null) return false;
	if (Array.isArray(value)) return value.some(containsPassword);
	return Object.entries(value).some(
		([key, nested]) => key === "password" || containsPassword(nested),
	);
}
