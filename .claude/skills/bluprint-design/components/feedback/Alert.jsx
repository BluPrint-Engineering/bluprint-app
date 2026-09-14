import React from "react";

const ICONS = {
  danger: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
  success: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></>,
};

export function Alert({ tone = "danger", title, children, className = "", ...rest }) {
  return (
    <div className={`bp-alert bp-alert--${tone} ${className}`} role={tone === "danger" ? "alert" : "status"} {...rest}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONS[tone]}
      </svg>
      <div>
        {title ? <div className="bp-alert__title">{title}</div> : null}
        {children}
      </div>
    </div>
  );
}
