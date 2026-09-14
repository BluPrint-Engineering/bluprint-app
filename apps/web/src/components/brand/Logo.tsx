import type * as React from "react";

const MARK: Record<LogoTone, string> = {
	gradient: "logo-mark.svg",
	blue: "logo-mark-blue.svg",
	white: "logo-mark-white.svg",
	ink: "logo-mark-ink.svg",
};
const LOCKUP: Record<LogoTone, string> = {
	gradient: "logo-lockup.svg",
	blue: "logo-lockup-blue.svg",
	white: "logo-lockup-white.svg",
	ink: "logo-lockup-ink.svg",
};
// The stacked art has no blue variant; gradient falls back to the default file.
const STACKED: Record<LogoTone, string> = {
	gradient: "logo-stacked.svg",
	blue: "logo-stacked.svg",
	white: "logo-stacked-white.svg",
	ink: "logo-stacked-ink.svg",
};

export type LogoTone = "gradient" | "blue" | "white" | "ink";

export interface LogoProps extends React.ComponentPropsWithoutRef<"span"> {
	/** `gradient` on light surfaces, `white` on brand blue or dark, `ink`/`blue` for flat single-color use. */
	tone?: LogoTone;
	/** Mark height in px. The lockups scale from it. */
	size?: number;
	/** Mark + wordmark side by side. */
	wordmark?: boolean;
	/** Mark above the wordmark, as in the original brand file. Wins over `wordmark`. */
	stacked?: boolean;
}

export function Logo({
	tone = "gradient",
	size = 40,
	wordmark = false,
	stacked = false,
	className = "",
	...props
}: LogoProps) {
	const set = stacked ? STACKED : wordmark ? LOCKUP : MARK;
	const src = set[tone];
	// Stacked art scales from the mark's height; the lockup's viewBox is already mark-height tall.
	const height = stacked ? size * 1.63 : size;

	return (
		<span className={className} {...props}>
			<img
				src={`/brand/${src}`}
				alt="BluPrint"
				style={{ height, width: "auto" }}
			/>
		</span>
	);
}
