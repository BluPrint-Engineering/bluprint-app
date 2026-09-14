import type * as React from "react";

/** Single-line text input, 44px tall with a 1px `--input` border that stays visible in sunlight. */
export interface InputProps extends React.ComponentPropsWithoutRef<"input"> {
  /** Red border + `aria-invalid`. Pair it with the message in `Field.error`. */
  invalid?: boolean;
  /** Trailing control inside the field, e.g. the show-password icon button. */
  affix?: React.ReactNode;
}
export declare function Input(props: InputProps): JSX.Element;
