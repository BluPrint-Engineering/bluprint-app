import type * as React from "react";

/** The user's picture, or their initials when there is no photo. Decorative: label the button that holds it. */
export interface AvatarProps extends React.ComponentPropsWithoutRef<"span"> {
  /** Full name; the initials are the first and last word. */
  name?: string;
  /** Photo URL. Profile-photo upload is not built yet, so this is usually null. */
  src?: string | null;
  /** `sm` 28px · `md` 36px (header) · `lg` 48px (menu header). */
  size?: "sm" | "md" | "lg";
}
export declare function Avatar(props: AvatarProps): JSX.Element;
export declare function initialsOf(name: string): string;
