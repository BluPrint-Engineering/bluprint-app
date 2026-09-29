import { useSyncExternalStore } from "react";

/** Must match Tailwind's `md` breakpoint. */
const DESKTOP = "(min-width: 48rem)";

function subscribe(onChange: () => void) {
	const query = window.matchMedia(DESKTOP);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

const isDesktop = () => window.matchMedia(DESKTOP).matches;

export function useIsDesktop(): boolean {
	return useSyncExternalStore(subscribe, isDesktop);
}
