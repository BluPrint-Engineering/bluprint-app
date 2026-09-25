import React from "react";

/** Initials from a full name: first and last word. "Guilherme Lopes da Silva" -> "GS". */
export function initialsOf(name = "") {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "";
  return ((w[0][0] || "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name = "", src = null, size = "md", className = "", ...rest }) {
  return (
    <span className={`bp-avatar bp-avatar--${size} ${className}`} aria-hidden="true" {...rest}>
      {src ? <img src={src} alt="" /> : initialsOf(name)}
    </span>
  );
}
