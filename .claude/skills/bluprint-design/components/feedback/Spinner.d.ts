/** Indeterminate loader. Used while the session is being read, so content never flashes. */
export interface SpinnerProps {
  /** Pixel box. 20 inline, 32 for a screen-level wait. */
  size?: number;
  label?: string;
  className?: string;
}
export declare function Spinner(props: SpinnerProps): JSX.Element;
