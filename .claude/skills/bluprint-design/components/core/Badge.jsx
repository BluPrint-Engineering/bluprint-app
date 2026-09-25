import React from "react";

export function Badge({ tone = "neutral", dot = false, icon = null, count = false, className = "", children, ...rest }) {
  const cls = ["bp-badge", `bp-badge--${tone}`, count ? "bp-badge--count" : "", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {dot ? <span className="bp-badge__dot" aria-hidden="true" /> : icon}
      {children}
    </span>
  );
}
