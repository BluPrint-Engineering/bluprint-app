import type * as React from "react";

/** Lucide icon (the app's icon library) drawn in currentColor at 1.5px stroke. */
export interface IconProps extends React.ComponentPropsWithoutRef<"span"> {
  /** Lucide kebab-case name, e.g. `"map-pin"`. One of the 24 glyphs embedded in the component (listed in readme.md). */
  name: string;
  /** 20 inline, 24 in a 44px tap target. */
  size?: number;
  /** Optional. Load `<name>.svg` from this folder instead of the embedded glyph. Not needed. */
  basePath?: string;
}
export declare function Icon(props: IconProps): JSX.Element;
