import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { installIntersectionObserver, installViewport } from "./viewport";

configure({ asyncUtilTimeout: 3000 });

globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
};

Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;

window.scrollTo = () => {};

installViewport();
installIntersectionObserver();
