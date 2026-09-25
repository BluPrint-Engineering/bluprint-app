import React from "react";

export function SegmentedControl({ options = [], value, onChange, size = "md", block = false, label, className = "" }) {
  const cls = ["bp-seg", `bp-seg--${size}`, block ? "bp-seg--block" : "", className].filter(Boolean).join(" ");
  return (
    <div role="radiogroup" aria-label={label} className={cls}>
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} aria-label={o.ariaLabel}
          className="bp-seg__item" onClick={() => onChange && onChange(o.value)}>
          {o.icon || null}{o.label}
        </button>
      ))}
    </div>
  );
}
