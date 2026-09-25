import type * as React from "react";

/** A short status label. Always text — the tint is a second signal, never the only one (RNF-07). */
export interface BadgeProps extends React.ComponentPropsWithoutRef<"span"> {
  /** `primary` active/in progress · `neutral` finished, quiet · `success` · `danger` · `outline`. */
  tone?: "primary" | "neutral" | "success" | "danger" | "outline";
  /** Leading 6px dot in the text color. */
  dot?: boolean;
  /** Leading icon (16px), used instead of the dot. */
  icon?: React.ReactNode;
  /** Round numeric pill, e.g. the active-filter count on a button. */
  count?: boolean;
}
export declare function Badge(props: BadgeProps): JSX.Element;
