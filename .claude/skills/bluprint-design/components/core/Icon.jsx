import React from "react";

/** Lucide glyph rendered as a mask, so it inherits currentColor like lucide-react does in the app. */
export function Icon({ name, size = 20, basePath = "assets/icons", className = "", style = {}, ...rest }) {
  const url = `url("${basePath}/${name}.svg")`;
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        background: "currentColor",
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        ...style,
      }}
      {...rest}
    />
  );
}
