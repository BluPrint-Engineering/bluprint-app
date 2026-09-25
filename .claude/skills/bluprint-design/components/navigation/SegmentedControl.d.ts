import type * as React from "react";

/** Two to four mutually exclusive choices shown at once — obra status, theme. */
export interface SegmentedControlProps {
  options: Array<{ value: string; label?: React.ReactNode; icon?: React.ReactNode; ariaLabel?: string }>;
  value: string;
  onChange?: (value: string) => void;
  /** `md` 44px segments (field) · `sm` 30px segments (desktop toolbar). */
  size?: "sm" | "md";
  /** Stretch to the container, segments share the width. */
  block?: boolean;
  label?: string;
  className?: string;
}
export declare function SegmentedControl(props: SegmentedControlProps): JSX.Element;
