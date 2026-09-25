import type * as React from "react";

/** Numbered pages for desktop lists. Mobile lists load more at the end instead. */
export interface PaginationProps {
  /** Current page, 1-based. Mirror it in the URL (?page=) so returning lands on the same page. */
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  /** Page being fetched: it shows a spinner, becomes current, and every control is disabled until it lands. */
  loadingPage?: number | null;
  label?: string;
  className?: string;
}
export declare function Pagination(props: PaginationProps): JSX.Element;
export declare function pageItems(page: number, count: number): Array<number | "…">;
