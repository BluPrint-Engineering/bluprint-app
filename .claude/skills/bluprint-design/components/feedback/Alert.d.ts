import type * as React from "react";

/** Inline message at the top of a form or screen. Always icon + text, never color alone (RNF-07). */
export interface AlertProps extends React.ComponentPropsWithoutRef<"div"> {
  tone?: "danger" | "info" | "success";
  title?: React.ReactNode;
}
export declare function Alert(props: AlertProps): JSX.Element;
