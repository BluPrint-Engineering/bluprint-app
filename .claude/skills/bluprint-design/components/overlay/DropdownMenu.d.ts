import type * as React from "react";

/** Popover menu anchored to a trigger — the user menu, and the sort / manager pickers of a desktop toolbar. */
export interface DropdownMenuProps {
  /** The element that opens it, usually a Button. Receives onClick + aria-expanded. */
  trigger: React.ReactElement;
  /** Controlled open state; omit to let the menu manage itself. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Edge of the trigger the menu lines up with. */
  align?: "start" | "end";
  /** While true the menu cannot close and its items are disabled (e.g. signing out). */
  locked?: boolean;
  /** Menu width in px. */
  width?: number;
  /** Accessible name of the menu. */
  label?: string;
  className?: string;
  children?: React.ReactNode;
}
export declare function DropdownMenu(props: DropdownMenuProps): JSX.Element;

export interface DropdownMenuItemProps extends Omit<React.ComponentPropsWithoutRef<"button">, "onSelect"> {
  icon?: React.ReactNode;
  /** Set (true/false) to make it a radio item with a trailing check. */
  checked?: boolean;
  /** Replaces the icon with a spinner; the item stays readable. */
  loading?: boolean;
  /** Do not close the menu on select. */
  keepOpen?: boolean;
  onSelect?: () => void;
}
export declare function DropdownMenuItem(props: DropdownMenuItemProps): JSX.Element;
export declare function DropdownMenuLabel(props: React.ComponentPropsWithoutRef<"div">): JSX.Element;
export declare function DropdownMenuSeparator(): JSX.Element;
