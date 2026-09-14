import type * as React from "react";

/**
 * Label + control + hint/error in one stack. Every input in the product sits in a Field, so an
 * error is always a message and an icon, never a red border alone (RNF-07).
 */
export interface FieldProps extends React.ComponentPropsWithoutRef<"div"> {
  label?: React.ReactNode;
  htmlFor?: string;
  optional?: boolean;
  /** Shown only while there is no error. */
  hint?: React.ReactNode;
  /** Translated pt-BR message. The API never returns display text. */
  error?: React.ReactNode;
}
export declare function Field(props: FieldProps): JSX.Element;
