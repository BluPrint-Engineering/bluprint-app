import React from "react";

const GLYPH = {
  danger: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></>,
  success: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></>,
  default: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
};

/** One transient message. In apps/web this is sonner's toast(); this is its look. */
export function Toast({ tone = "default", title, action = null, onDismiss, className = "", children, ...rest }) {
  return (
    <div className={`bp-toast bp-toast--${tone} ${className}`} role={tone === "danger" ? "alert" : "status"} {...rest}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="bp-toast__icon">{GLYPH[tone] || GLYPH.default}</svg>
      <div className="bp-toast__body">
        {title ? <div className="bp-toast__title">{title}</div> : null}
        {children}
      </div>
      {action}
      {onDismiss ? (
        <button type="button" className="bp-toast__close" aria-label="Fechar aviso" onClick={onDismiss}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      ) : null}
    </div>
  );
}

/** Stack that holds toasts. `offset` lifts it above a fixed bottom bar. `contained` pins it to the parent box. */
export function Toaster({ position = "bottom-center", offset = 0, contained = false, className = "", children }) {
  return (
    <div className={`bp-toaster bp-toaster--${position} ${contained ? "bp-toaster--contained" : ""} ${className}`}
      style={{ "--toaster-offset": typeof offset === "number" ? offset + "px" : offset }} aria-live="polite">
      {children}
    </div>
  );
}
