import React from "react";

export function SearchInput({ value = "", onChange, onClear, placeholder = "Buscar", size = "md", className = "", ...rest }) {
  return (
    <div className={`bp-search bp-search--${size} ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="bp-search__icon"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.34-4.34" /></svg>
      <input type="search" className="bp-input bp-search__input" value={value} onChange={onChange} placeholder={placeholder}
        enterKeyHint="search" autoComplete="off" {...rest} />
      {value ? (
        <button type="button" className="bp-search__clear" aria-label="Limpar busca" onClick={onClear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      ) : null}
    </div>
  );
}
