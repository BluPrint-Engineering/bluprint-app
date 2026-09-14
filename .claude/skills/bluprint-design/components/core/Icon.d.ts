import type * as React from "react";

/** Lucide icon (the app's icon library) drawn in currentColor at 1.5px stroke. */
export interface IconProps extends React.ComponentPropsWithoutRef<"span"> {
  /** Lucide kebab-case name, e.g. `"map-pin"`. The SVG must exist in `assets/icons/`. */
  name: string;
  /** 20 inline, 24 in a 44px tap target. */
  size?: number;
  /** Path to the icon folder, relative to the page. */
  basePath?: string;
}
export declare function Icon(props: IconProps): JSX.Element;
