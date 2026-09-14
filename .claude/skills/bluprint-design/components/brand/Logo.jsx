import React from "react";

const MARK = { gradient: "logo-mark.svg", blue: "logo-mark-blue.svg", white: "logo-mark-white.svg", ink: "logo-mark-ink.svg" };
const LOCKUP = { gradient: "logo-lockup.svg", blue: "logo-lockup-blue.svg", white: "logo-lockup-white.svg", ink: "logo-lockup-ink.svg" };
const STACKED = { gradient: "logo-stacked.svg", blue: "logo-stacked.svg", white: "logo-stacked-white.svg", ink: "logo-stacked-ink.svg" };

export function Logo({ tone = "gradient", size = 40, wordmark = false, stacked = false, basePath = "assets", className = "", style = {}, ...rest }) {
  const set = stacked ? STACKED : wordmark ? LOCKUP : MARK;
  const src = set[tone] || set.gradient;
  // Stacked art scales from the mark's height; the lockup's viewBox is already mark-height tall.
  const height = stacked ? size * 1.63 : size;
  return (
    <span className={`bp-logo ${className}`} style={style} {...rest}>
      <img src={`${basePath}/${src}`} alt="BluPrint" style={{ height, width: "auto" }} />
    </span>
  );
}
