import React from "react";

export function Skeleton({ width = "100%", height = 16, radius = "md", circle = false, className = "", style = {}, ...rest }) {
  return (
    <span
      className={`bp-skeleton ${className}`}
      aria-hidden="true"
      style={{ width: circle ? height : width, height, borderRadius: circle ? "var(--radius-full)" : `var(--radius-${radius})`, ...style }}
      {...rest}
    />
  );
}
