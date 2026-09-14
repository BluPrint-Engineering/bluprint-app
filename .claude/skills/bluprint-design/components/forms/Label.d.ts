import type * as React from "react";

/** Field label. Sentence case, pt-BR, never a placeholder standing in for a label. */
export interface LabelProps extends React.ComponentPropsWithoutRef<"label"> {
  /** Appends the muted "(opcional)" marker — optional fields are marked, required ones are not. */
  optional?: boolean;
}
export declare function Label(props: LabelProps): JSX.Element;
