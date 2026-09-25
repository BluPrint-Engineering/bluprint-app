import "@testing-library/jest-dom/vitest";

// jsdom has no ResizeObserver, and Radix's Checkbox measures itself with one
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
};
