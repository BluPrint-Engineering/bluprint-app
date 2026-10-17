import { useEffect, useMemo, useRef, useState } from "react";

export type AddKind =
	| "tower"
	| "project-area"
	| "tower-area"
	| "floor-unit"
	| "floor-area";

export interface Adding {
	is: (kind: AddKind) => boolean;
	open: (kind: AddKind) => void;
	close: () => void;
}

export function useAdding(): Adding {
	const [current, setCurrent] = useState<AddKind | null>(null);
	return useMemo(
		() => ({
			is: (kind) => kind === current,
			open: setCurrent,
			close: () => setCurrent(null),
		}),
		[current],
	);
}

export function useFocusOnClose<T extends HTMLElement>(open: boolean) {
	const target = useRef<T>(null);
	const wasOpen = useRef(open);
	useEffect(() => {
		if (wasOpen.current && !open) target.current?.focus();
		wasOpen.current = open;
	}, [open]);
	return target;
}
