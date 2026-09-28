// jsdom lays nothing out: these stand in for the viewport width and for what scrolls into view

const DESKTOP_WIDTH = 1280;
const PHONE_WIDTH = 390;

let width = DESKTOP_WIDTH;

/** Answers `min-width` queries in px or rem against the stubbed width; anything else never matches. */
function matches(query: string): boolean {
	const minWidth = /\(min-width:\s*([\d.]+)(px|rem)\)/.exec(query);
	if (!minWidth) return false;
	const px = Number(minWidth[1]) * (minWidth[2] === "rem" ? 16 : 1);
	return width >= px;
}

/** Sets the width `matchMedia` answers for; read on the next render, so call it before rendering. */
export function setViewport(viewport: "phone" | "desktop") {
	width = viewport === "phone" ? PHONE_WIDTH : DESKTOP_WIDTH;
}

export function installViewport() {
	window.matchMedia = (query: string) =>
		({
			matches: matches(query),
			media: query,
			onchange: null,
			addEventListener() {},
			removeEventListener() {},
			addListener() {},
			removeListener() {},
			dispatchEvent: () => false,
		}) satisfies MediaQueryList;
	afterEach(() => setViewport("desktop"));
}

const observers = new Set<FakeIntersectionObserver>();

class FakeIntersectionObserver implements IntersectionObserver {
	readonly root = null;
	readonly rootMargin: string;
	readonly thresholds = [0];
	readonly scrollMargin = "0px";
	readonly targets = new Set<Element>();

	constructor(
		readonly callback: IntersectionObserverCallback,
		options: IntersectionObserverInit = {},
	) {
		this.rootMargin = options.rootMargin ?? "0px";
		observers.add(this);
	}

	observe(target: Element) {
		this.targets.add(target);
	}

	unobserve(target: Element) {
		this.targets.delete(target);
	}

	disconnect() {
		this.targets.clear();
		observers.delete(this);
	}

	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
}

/** Tells every observed element it came within its observer's margin of the viewport, or left it. */
export function setInView(inView = true) {
	for (const observer of [...observers]) {
		const entries = [...observer.targets].map(
			(target) =>
				({ target, isIntersecting: inView }) as IntersectionObserverEntry,
		);
		if (entries.length > 0) observer.callback(entries, observer);
	}
}

/** The margins the observers were created with, to assert how far ahead they look. */
export function observedMargins(): string[] {
	return [...observers].map((observer) => observer.rootMargin);
}

export function installIntersectionObserver() {
	globalThis.IntersectionObserver = FakeIntersectionObserver;
}
