import type * as React from "react";

/** Checkbox with its label in one 44px-tall tap target. */
export interface CheckboxProps extends React.ComponentPropsWithoutRef<"input"> {
  label: React.ReactNode;
  /** Second line of muted text under the label. */
  description?: React.ReactNode;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
