import { useRouteContext, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
	clearSessionDraft,
	readSessionDraft,
	type SessionDraftKind,
	screenPath,
} from "./sessionDraft";

export function useSessionDraft<T>(
	kind: SessionDraftKind,
	accept: (variables: unknown) => T | undefined,
): T | undefined {
	const { session } = useRouteContext({ from: "/_authenticated" });
	const path = useRouterState({
		select: (state) => screenPath(state.location),
	});
	const [value] = useState(() => {
		const stored = readSessionDraft(session.user.id, path);
		if (stored?.kind !== kind) return undefined;
		return accept(stored.variables);
	});
	return value;
}

export function useClearSessionDraft(): () => void {
	const { session } = useRouteContext({ from: "/_authenticated" });
	const path = useRouterState({
		select: (state) => screenPath(state.location),
	});
	return () => clearSessionDraft(session.user.id, path);
}
