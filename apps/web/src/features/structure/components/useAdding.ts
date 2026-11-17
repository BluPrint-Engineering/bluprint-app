import { type RefObject, useEffect, useMemo, useRef, useState } from "react";

export type AddKind =
	| "tower"
	| "project-area"
	| "tower-area"
	| "floor-unit"
	| "floor-area";

export type AddOpener = "row" | "menu";

export interface Adding {
	is: (kind: AddKind) => boolean;
	openedFrom: AddOpener;
	open: (kind: AddKind, from?: AddOpener) => void;
	close: () => void;
}

export function useAdding(): Adding {
	const [current, setCurrent] = useState<{
		kind: AddKind;
		from: AddOpener;
	} | null>(null);
	return useMemo(
		() => ({
			is: (kind) => kind === current?.kind,
			openedFrom: current?.from ?? "row",
			open: (kind, from = "row") => setCurrent({ kind, from }),
			close: () => setCurrent(null),
		}),
		[current],
	);
}

export function useFocusOnClose<T extends HTMLElement>(
	open: boolean,
	given?: RefObject<T | null>,
	instead?: () => HTMLElement | null | undefined,
) {
	const own = useRef<T>(null);
	const target = given ?? own;
	const wasOpen = useRef(open);
	useEffect(() => {
		if (wasOpen.current && !open) (instead?.() ?? target.current)?.focus();
		wasOpen.current = open;
	}, [open, target, instead]);
	return target;
}
