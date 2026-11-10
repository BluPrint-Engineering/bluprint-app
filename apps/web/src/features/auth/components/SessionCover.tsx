import { type ReactNode, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export function SessionCover({ children }: { children: ReactNode }) {
	const [cover] = useState(() => {
		const element = document.createElement("div");
		// a modal Radix dialog sets pointer-events: none on the body, which would leave the retry button dead
		element.style.pointerEvents = "auto";
		return element;
	});

	useLayoutEffect(() => {
		document.body.append(cover);
		const covered = [...document.body.children].filter(
			(element): element is HTMLElement =>
				element !== cover && element instanceof HTMLElement && !element.hidden,
		);
		for (const element of covered) element.hidden = true;
		return () => {
			for (const element of covered) element.hidden = false;
			cover.remove();
		};
	}, [cover]);

	return createPortal(children, cover);
}
