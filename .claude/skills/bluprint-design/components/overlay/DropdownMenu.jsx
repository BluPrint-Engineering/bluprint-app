import React from "react";

const MenuCtx = React.createContext({ close: () => {}, locked: false });

export function DropdownMenu({ trigger, open: openProp, defaultOpen = false, onOpenChange, align = "end", locked = false, width = 264, label, className = "", children }) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = openProp !== undefined ? openProp : inner;
  const ref = React.useRef(null);
  const set = React.useCallback(v => {
    if (locked && !v) return; // a locked menu (e.g. signing out) cannot be dismissed
    if (openProp === undefined) setInner(v);
    if (onOpenChange) onOpenChange(v);
  }, [locked, openProp, onOpenChange]);
  React.useEffect(() => {
    if (!open) return;
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) set(false); };
    const onKey = e => { if (e.key === "Escape") set(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, set]);
  const t = React.cloneElement(trigger, {
    onClick: e => { if (trigger.props.onClick) trigger.props.onClick(e); set(!open); },
    "aria-haspopup": "menu",
    "aria-expanded": open,
  });
  return (
    <div ref={ref} className={`bp-menu-root ${className}`}>
      {t}
      {open ? (
        <div role="menu" aria-label={label} aria-busy={locked || undefined} className={`bp-menu bp-menu--${align}`} style={{ width }}>
          <MenuCtx.Provider value={{ close: () => set(false), locked }}>{children}</MenuCtx.Provider>
        </div>
      ) : null}
    </div>
  );
}

export function DropdownMenuItem({ icon = null, checked, disabled = false, loading = false, keepOpen = false, onSelect, className = "", children, ...rest }) {
  const ctx = React.useContext(MenuCtx);
  const radio = checked !== undefined;
  return (
    <button type="button" role={radio ? "menuitemradio" : "menuitem"} aria-checked={radio ? checked : undefined}
      aria-busy={loading || undefined} disabled={disabled || loading || (ctx.locked && !loading)}
      className={`bp-menu__item ${className}`}
      onClick={() => { if (onSelect) onSelect(); if (!keepOpen) ctx.close(); }} {...rest}>
      {loading ? <span className="bp-spinner" style={{ width: 18, height: 18 }} aria-hidden="true" /> : icon}
      <span className="bp-menu__item-label">{children}</span>
      {radio && checked ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="bp-menu__check"><path d="M20 6 9 17l-5-5" /></svg>
      ) : null}
    </button>
  );
}

export function DropdownMenuLabel({ className = "", children, ...rest }) {
  return <div className={`bp-menu__label ${className}`} {...rest}>{children}</div>;
}

export function DropdownMenuSeparator() {
  return <div className="bp-menu__sep" role="separator" />;
}
