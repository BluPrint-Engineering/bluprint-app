import React from "react";

export function Input({ invalid = false, affix = null, className = "", ...rest }) {
  const input = (
    <input
      className={["bp-input", invalid ? "bp-input--invalid" : "", affix ? "bp-input--with-affix" : "", className].filter(Boolean).join(" ")}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
  if (!affix) return input;
  return (
    <span className="bp-input-wrap">
      {input}
      <span className="bp-input-affix">{affix}</span>
    </span>
  );
}
