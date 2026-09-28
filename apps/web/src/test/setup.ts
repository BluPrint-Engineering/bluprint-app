import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { installIntersectionObserver, installViewport } from "./viewport";

// a file's first render pays its cold start, past the 1 s default when the root `test` runs the API suite alongside
configure({ asyncUtilTimeout: 3000 });

// jsdom has no ResizeObserver, and Radix's Checkbox measures itself with one
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// jsdom does not scroll, and the router scrolls to the top on every navigation
window.scrollTo = () => {};

installViewport();
installIntersectionObserver();
