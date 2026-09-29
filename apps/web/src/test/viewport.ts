const DESKTOP_WIDTH = 1280;
const PHONE_WIDTH = 390;

let width = DESKTOP_WIDTH;

function matches(query: string): boolean {
	const minWidth = /\(min-width:\s*([\d.]+)(px|rem)\)/.exec(query);
	if (!minWidth) return false;
	const px = Number(minWidth[1]) * (minWidth[2] === "rem" ? 16 : 1);
	return width >= px;
}

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

export function setInView(inView = true) {
	for (const observer of [...observers]) {
		const entries = [...observer.targets].map(
			(target) =>
				({ target, isIntersecting: inView }) as IntersectionObserverEntry,
		);
		if (entries.length > 0) observer.callback(entries, observer);
	}
}

export function observedMargins(): string[] {
	return [...observers].map((observer) => observer.rootMargin);
}

export function installIntersectionObserver() {
	globalThis.IntersectionObserver = FakeIntersectionObserver;
}
