import type * as React from "react";

/** Bottom sheet over an ink scrim. Mobile-only surface for choices that do not fit the screen (filters). */
export interface SheetProps {
  open: boolean;
  /** Scrim tap, the X and Escape all call this. */
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Sticky action row — secondary left, primary right. */
  footer?: React.ReactNode;
  /** Fill the nearest positioned parent instead of the viewport (previews). */
  contained?: boolean;
  className?: string;
  children?: React.ReactNode;
}
export declare function Sheet(props: SheetProps): JSX.Element | null;
