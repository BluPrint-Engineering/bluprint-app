import React from "react";

const SIZES = { sm: "bp-btn--sm", md: "bp-btn--md", lg: "bp-btn--lg", icon: "bp-btn--icon", "icon-sm": "bp-btn--icon-sm" };

export function Button({
  variant = "default",
  size = "md",
  block = false,
  loading = false,
  iconStart = null,
  iconEnd = null,
  as = "button",
  className = "",
  children,
  ...rest
}) {
  const Comp = as;
  const cls = ["bp-btn", `bp-btn--${variant}`, SIZES[size] || SIZES.md, block ? "bp-btn--block" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Comp className={cls} data-variant={variant} data-size={size} disabled={rest.disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="bp-spinner" style={{ width: "1.15em", height: "1.15em" }} aria-hidden="true" /> : iconStart}
      {children}
      {iconEnd}
    </Comp>
  );
}
