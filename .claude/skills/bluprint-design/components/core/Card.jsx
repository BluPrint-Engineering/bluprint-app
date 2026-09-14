import React from "react";

export function Card({ size = "default", raised = false, className = "", children, ...rest }) {
  const cls = ["bp-card", size === "sm" ? "bp-card--sm" : "", raised ? "bp-card--raised" : "", className].filter(Boolean).join(" ");
  return <div className={cls} data-size={size} {...rest}>{children}</div>;
}
export function CardHeader({ className = "", children, ...rest }) {
  return <div className={`bp-card__header ${className}`} {...rest}>{children}</div>;
}
export function CardTitle({ className = "", children, ...rest }) {
  return <div className={`bp-card__title ${className}`} {...rest}>{children}</div>;
}
export function CardDescription({ className = "", children, ...rest }) {
  return <div className={`bp-card__desc ${className}`} {...rest}>{children}</div>;
}
export function CardContent({ className = "", children, ...rest }) {
  return <div className={`bp-card__content ${className}`} {...rest}>{children}</div>;
}
export function CardFooter({ className = "", children, ...rest }) {
  return <div className={`bp-card__footer ${className}`} {...rest}>{children}</div>;
}
