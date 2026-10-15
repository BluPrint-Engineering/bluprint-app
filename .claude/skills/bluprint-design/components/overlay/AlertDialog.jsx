import React from "react";
import { Alert } from "../feedback/Alert.jsx";

export function AlertDialog({ open, onClose, title, actionLabel, actionIcon = null, onAction, actionDisabled = false, pending = false, error = null, contained = false, className = "", children }) {
  const id = React.useId ? React.useId() : "bp-alert-dialog";
  const close = () => { if (!pending && onClose) onClose(); };
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);
  if (!open) return null;
  return (
    <div className={`bp-alert-dialog-root ${contained ? "bp-alert-dialog-root--contained" : ""}`}>
      <div className="bp-alert-dialog__scrim" onClick={close} />
      <div role="alertdialog" aria-modal="true" aria-labelledby={id + "-t"} className={`bp-alert-dialog ${className}`}>
        <h2 id={id + "-t"} className="bp-alert-dialog__title">{title}</h2>
        <div className="bp-alert-dialog__body">{children}</div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <footer className="bp-alert-dialog__footer">
          <button type="button" className="bp-btn bp-btn--outline bp-btn--md" disabled={pending} onClick={close}>Cancelar</button>
          <button type="button" className="bp-btn bp-btn--default bp-btn--md" disabled={actionDisabled || pending} aria-busy={pending || undefined} onClick={onAction}>
            {pending ? <span className="bp-spinner" style={{ width: "1.15em", height: "1.15em" }} aria-hidden="true" /> : actionIcon}
            {actionLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
