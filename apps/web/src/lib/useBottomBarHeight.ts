import { type RefObject, useLayoutEffect } from "react";

export function useBottomBarHeight(bar: RefObject<HTMLElement | null>) {
	useLayoutEffect(() => {
		const element = bar.current;
		if (!element) return;
		const root = document.documentElement;
		const publish = () =>
			root.style.setProperty(
				"--bottom-bar-height",
				`${element.getBoundingClientRect().height}px`,
			);
		publish();
		const observer = new ResizeObserver(publish);
		observer.observe(element);
		return () => {
			observer.disconnect();
			root.style.removeProperty("--bottom-bar-height");
		};
	}, [bar]);
}
