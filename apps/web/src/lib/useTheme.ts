import { useEffect, useState } from "react";

const THEME_KEY = "bp-theme";

function storedTheme(): boolean {
	try {
		return localStorage.getItem(THEME_KEY) === "dark";
	} catch {
		return false;
	}
}

/** `index.html` reads the same stored choice to apply it before first paint. */
export function useTheme() {
	const [dark, setDark] = useState(storedTheme);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", dark);
		try {
			localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
		} catch {
			// per-viewer convenience only; a blocked storage falls back to the default theme
		}
	}, [dark]);

	return { dark, setDark, toggle: () => setDark((shown) => !shown) };
}
