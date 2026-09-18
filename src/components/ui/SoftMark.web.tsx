import { createElement, useEffect, useMemo, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { softV8bHostInnerHtml } from '@/components/ui/softV8bHostHtml';
import { SOFT_INTRO } from '@/components/ui/softLetterScale';
import { startSoftCometFacing } from '@/components/ui/softCometFacing';

export type SoftMode = 'static' | 'working';

/** Extra canvas pad so comet orbit / gas blur is not clipped. */
const ORBIT_PAD_FRAC = 0.22;

/**
 * Soft v8b web host — real DOM div + SoT CSS (gas-svg / face).
 * Zero RN className on View/Animated.View. Morph via `.is-on` on `.av`.
 * Comet: JS always-facing + phase-z (inline <script> does not run via innerHTML).
 */
export function SoftMark({
  size,
  mode = 'static',
  style,
  accessibilityLabel,
  accessible = true,
}: {
  size: number;
  mode?: SoftMode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessible?: boolean;
}) {
  const working = mode === 'working';
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pad = Math.ceil(size * ORBIT_PAD_FRAC);
  const inner = useMemo(() => softV8bHostInnerHtml(size, working, pad), [size, working, pad]);

  useEffect(() => {
    const root = hostRef.current?.querySelector('#soft-root') as HTMLElement | null;
    if (!root) return;
    if (working) root.classList.add('is-on');
    else root.classList.remove('is-on');
  }, [working]);

  useEffect(() => {
    const root = hostRef.current?.querySelector('#soft-root') as HTMLElement | null;
    if (!root) return;
    const handle = startSoftCometFacing(root);
    return () => handle.stop();
  }, [inner]);

  // Outro: parent removes is-on (mode=static) before unmount (SOFT_INTRO.outroMs).
  void SOFT_INTRO.outroMs;

  const flat = flattenStyle(style);
  return createElement('div', {
    ref: hostRef,
    role: accessible && working ? 'progressbar' : accessible ? 'img' : undefined,
    'aria-label': accessible ? accessibilityLabel : undefined,
    'aria-busy': accessible && working ? true : undefined,
    style: {
      width: size,
      height: size,
      position: 'relative' as const,
      overflow: 'visible' as const,
      ...flat,
    },
    // Real DOM so CSS gas-svg + face work (RN View cannot).
    dangerouslySetInnerHTML: { __html: inner },
  });
}

function flattenStyle(style: StyleProp<ViewStyle> | undefined): Record<string, unknown> {
  if (style == null || style === false) return {};
  if (Array.isArray(style)) {
    return (style as readonly unknown[]).reduce<Record<string, unknown>>((acc, s) => {
      return { ...acc, ...flattenStyle(s as StyleProp<ViewStyle>) };
    }, {});
  }
  if (typeof style === 'object') return { ...(style as Record<string, unknown>) };
  return {};
}
