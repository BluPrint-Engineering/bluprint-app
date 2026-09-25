import type * as React from "react";

/** Transient message that does not block the screen — for failures of an action the user already left behind (sign-out). */
export interface ToastProps extends React.ComponentPropsWithoutRef<"div"> {
  tone?: "default" | "danger" | "success";
  title?: React.ReactNode;
  /** Optional button, e.g. <Button size="sm" variant="outline">Tentar de novo</Button>. */
  action?: React.ReactNode;
  /** Shows a 44px close button. */
  onDismiss?: () => void;
}
export declare function Toast(props: ToastProps): JSX.Element;

export interface ToasterProps {
  /** `bottom-center` on mobile, `bottom-right` on desktop. */
  position?: "bottom-center" | "bottom-right";
  /** Extra bottom offset (px or CSS length), to clear a fixed action bar. */
  offset?: number | string;
  /** Position inside the nearest positioned parent instead of the viewport (previews). */
  contained?: boolean;
  children?: React.ReactNode;
}
export declare function Toaster(props: ToasterProps): JSX.Element;
