import type * as React from "react";

/** Input with a leading search glyph and a 44px clear button once there is text. */
export interface SearchInputProps extends Omit<React.ComponentPropsWithoutRef<"input">, "size"> {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Called by the clear (X) button. */
  onClear?: () => void;
  /** `md` 44px (field) · `sm` 36px (desktop toolbar). */
  size?: "sm" | "md";
}
export declare function SearchInput(props: SearchInputProps): JSX.Element;
