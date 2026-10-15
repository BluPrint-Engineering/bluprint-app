import type * as React from "react";

/** Confirmation for an action that cannot be undone. Centered panel from 768px; bottom sheet below. */
export interface AlertDialogProps {
  open: boolean;
  /** Cancelar, Escape and the scrim call this; none of them works while `pending`. */
  onClose: () => void;
  title: React.ReactNode;
  actionLabel: React.ReactNode;
  actionIcon?: React.ReactNode;
  /** `destructive` for an action that destroys ("Excluir de vez"); archiving and restoring stay `default`. */
  actionVariant?: "default" | "destructive";
  onAction: () => void;
  /** Keeps the action off until the body's acknowledgement is given. */
  actionDisabled?: boolean;
  /** Spinner on the action; Cancelar and every way of closing are locked. */
  pending?: boolean;
  /** Danger Alert placed right above the buttons, so the title and the body do not move. */
  error?: React.ReactNode;
  /** Fill the nearest positioned parent instead of the viewport (previews). */
  contained?: boolean;
  className?: string;
  children?: React.ReactNode;
}
export declare function AlertDialog(props: AlertDialogProps): JSX.Element | null;
