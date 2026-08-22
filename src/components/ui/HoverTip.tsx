import type { ReactNode } from 'react';

type Props = {
  /** What happens on activate. Empty or a repeat of on-screen text is omitted. */
  label?: string | null;
  children: ReactNode;
  /** Stretch to the parent width (list rows, full-width buttons, tabs). */
  fill?: boolean;
};

export { tipIfNew } from '@/components/ui/tipCopy';

/** Native: no hover. Web implementation lives in `HoverTip.web.tsx`. */
export function HoverTip({ children }: Props) {
  return children;
}
