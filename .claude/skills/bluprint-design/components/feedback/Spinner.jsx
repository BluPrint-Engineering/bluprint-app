import React from "react";

export function Spinner({ size = 20, label = "Carregando…", className = "", ...rest }) {
  return (
    <span className={`bp-spinner ${className}`} style={{ width: size, height: size }} role="status" aria-label={label} {...rest} />
  );
}
