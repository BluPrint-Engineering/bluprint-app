import React from "react";

/** 1 … 4 5 6 … 12 — at most 7 slots, first and last always shown. */
export function pageItems(page, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out = [1];
  let a = Math.max(2, page - 1), b = Math.min(count - 1, page + 1);
  if (page <= 3) { a = 2; b = 5; }
  if (page >= count - 2) { a = count - 4; b = count - 1; }
  if (a > 2) out.push("…");
  for (let i = a; i <= b; i++) out.push(i);
  if (b < count - 1) out.push("…");
  out.push(count);
  return out;
}

const Chev = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export function Pagination({ page, pageCount, onPageChange, loadingPage = null, label = "Paginação", className = "" }) {
  const busy = loadingPage != null;
  const shown = busy ? loadingPage : page;
  const go = p => { if (onPageChange && p !== page) onPageChange(p); };
  return (
    <nav aria-label={label} className={`bp-pagination ${className}`}>
      <button type="button" className="bp-pagination__page bp-pagination__step" disabled={busy || page <= 1} onClick={() => go(page - 1)}>
        <Chev d="m15 18-6-6 6-6" />Anterior
      </button>
      {pageItems(shown, pageCount).map((p, i) => p === "…" ? (
        <span key={"e" + i} className="bp-pagination__ellipsis" aria-hidden="true">…</span>
      ) : (
        <button key={p} type="button" className="bp-pagination__page" aria-current={p === shown ? "page" : undefined}
          aria-label={`Página ${p}`} aria-busy={busy && p === loadingPage ? true : undefined} disabled={busy} onClick={() => go(p)}>
          {busy && p === loadingPage ? <span className="bp-spinner" style={{ width: 14, height: 14 }} aria-hidden="true" /> : p}
        </button>
      ))}
      <button type="button" className="bp-pagination__page bp-pagination__step" disabled={busy || page >= pageCount} onClick={() => go(page + 1)}>
        Próxima<Chev d="m9 18 6-6-6-6" />
      </button>
    </nav>
  );
}
