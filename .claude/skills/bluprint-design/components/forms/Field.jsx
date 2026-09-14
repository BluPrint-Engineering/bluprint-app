import React from "react";
import { Label } from "./Label.jsx";

export function Field({ label, htmlFor, optional = false, hint, error, children, className = "", ...rest }) {
  return (
    <div className={`bp-field ${className}`} {...rest}>
      {label ? <Label htmlFor={htmlFor} optional={optional}>{label}</Label> : null}
      {children}
      {hint && !error ? <span className="bp-hint">{hint}</span> : null}
      {error ? (
        <span className="bp-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" />
          </svg>
          {error}
        </span>
      ) : null}
    </div>
  );
}
