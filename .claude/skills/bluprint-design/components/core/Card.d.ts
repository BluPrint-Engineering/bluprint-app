import type * as React from "react";

/**
 * Surface for grouped content: an auth form, a unit sheet, a pin summary.
 * Separated by a hairline ring, not a shadow — `raised` is for things floating over a plan.
 *
 * @startingPoint section="Core" subtitle="Card with header, content and footer" viewport="700x260"
 */
export interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  /** `sm` tightens the internal spacing token from 16px to 12px. */
  size?: "default" | "sm";
  /** Adds the floating shadow. Only for sheets, popovers and overlays. */
  raised?: boolean;
}
export declare function Card(props: CardProps): JSX.Element;
export declare function CardHeader(props: React.ComponentPropsWithoutRef<"div">): JSX.Element;
export declare function CardTitle(props: React.ComponentPropsWithoutRef<"div">): JSX.Element;
export declare function CardDescription(props: React.ComponentPropsWithoutRef<"div">): JSX.Element;
export declare function CardContent(props: React.ComponentPropsWithoutRef<"div">): JSX.Element;
export declare function CardFooter(props: React.ComponentPropsWithoutRef<"div">): JSX.Element;
