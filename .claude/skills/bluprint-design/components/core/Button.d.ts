import type * as React from "react";

/**
 * The one button of the product. Primary action is `default` at `lg` on mobile.
 *
 * @startingPoint section="Core" subtitle="Button variants and sizes" viewport="700x220"
 */
export interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  /** Visual role. `destructive` is a tinted button, never a solid red one. */
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  /** `md` (44px) is the field default; `lg` (52px) for the primary action; `sm` for dense desktop toolbars. */
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
  /** Full width — the mobile default for form submits. */
  block?: boolean;
  /** Swaps `iconStart` for a spinner and disables the button. */
  loading?: boolean;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  /** Render as another element, e.g. `"a"`. */
  as?: keyof JSX.IntrinsicElements;
}
export declare function Button(props: ButtonProps): JSX.Element;
