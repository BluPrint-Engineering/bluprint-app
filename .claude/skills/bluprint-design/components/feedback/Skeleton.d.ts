import type * as React from "react";

/** Placeholder block shaped like the content it stands for, so nothing jumps when data arrives. */
export interface SkeletonProps extends React.ComponentPropsWithoutRef<"span"> {
  width?: number | string;
  height?: number | string;
  /** Radius token suffix: sm · md · lg · xl · full. */
  radius?: "sm" | "md" | "lg" | "xl" | "full";
  /** Circle of `height` diameter (avatars). */
  circle?: boolean;
}
export declare function Skeleton(props: SkeletonProps): JSX.Element;
