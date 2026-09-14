import React from "react";

export function Checkbox({ label, description, className = "", ...rest }) {
  return (
    <label className={`bp-checkbox ${className}`}>
      <input type="checkbox" {...rest} />
      <span>
        {label}
        {description ? <span className="bp-hint" style={{ display: "block" }}>{description}</span> : null}
      </span>
    </label>
  );
}
