import React from "react";

export function Sheet({ open, onClose, title, description, footer = null, contained = false, className = "", children }) {
  const id = React.useId ? React.useId() : "bp-sheet";
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape" && onClose) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={`bp-sheet-root ${contained ? "bp-sheet-root--contained" : ""}`}>
      <div className="bp-sheet__scrim" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={id + "-t"} className={`bp-sheet ${className}`}>
        <div className="bp-sheet__handle" aria-hidden="true" />
        <header className="bp-sheet__header">
          <div className="bp-sheet__heading">
            <h2 id={id + "-t"} className="bp-sheet__title">{title}</h2>
            {description ? <p className="bp-sheet__desc">{description}</p> : null}
          </div>
          <button type="button" className="bp-btn bp-btn--ghost bp-btn--icon" aria-label="Fechar" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </header>
        <div className="bp-sheet__body">{children}</div>
        {footer ? <footer className="bp-sheet__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
