import type * as React from "react";

/**
 * The BluPrint logo, drawn from the vector assets — the mark alone, the horizontal lockup, or the
 * stacked lockup. The wordmark is vector geometry, not type, so it never depends on a loaded font.
 */
export interface LogoProps extends React.ComponentPropsWithoutRef<"span"> {
  /** `gradient` on light surfaces, `white` on brand blue or dark, `ink`/`blue` for flat single-color use. */
  tone?: "gradient" | "blue" | "white" | "ink";
  /** Mark height in px. The lockups scale from it. */
  size?: number;
  /** Mark + wordmark side by side. */
  wordmark?: boolean;
  /** Mark above the wordmark, as in the original brand file. Wins over `wordmark`. */
  stacked?: boolean;
  /** Where the SVGs live, relative to the page. Default `"assets"`. */
  basePath?: string;
}
export declare function Logo(props: LogoProps): JSX.Element;
