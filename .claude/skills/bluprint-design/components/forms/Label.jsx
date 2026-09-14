import React from "react";

export function Label({ optional = false, className = "", children, ...rest }) {
  return (
    <label className={`bp-label ${className}`} {...rest}>
      {children}
      {optional ? <span className="bp-label__optional"> (opcional)</span> : null}
    </label>
  );
}
