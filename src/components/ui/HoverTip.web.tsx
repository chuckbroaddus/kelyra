import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  label?: string | null;
  children: ReactNode;
  fill?: boolean;
};

export { tipIfNew } from '@/components/ui/tipCopy';

type Box = { left: number; top: number; width: number; height: number };

function canHover(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function HoverTip({ label, children, fill }: Props) {
  const { colors, scheme } = useTheme();
  const host = useRef<View>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const text = label?.trim() ?? '';

  const clearTimer = () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = null;
  };

  const hide = useCallback(() => {
    clearTimer();
    setBox(null);
  }, []);

  const measure = useCallback(() => {
    const node = host.current as unknown as { getBoundingClientRect?: () => DOMRect } | null;
    const rect = node?.getBoundingClientRect?.();
    if (!rect || rect.width === 0) return;
    setBox({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
  }, []);

  const scheduleShow = useCallback(() => {
    if (!text || !canHover()) return;
    clearTimer();
    showTimer.current = setTimeout(measure, 180);
  }, [measure, text]);

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (!box) return;
    const onMove = () => hide();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [box, hide]);

  if (!text) return children;

  const ink = scheme === 'dark' ? colors.ink : '#FFFCFA';
  const bg = scheme === 'dark' ? colors.card : '#1A1612';
  const tip = box && typeof document !== 'undefined' ? createPortal(placeTip(box, text, bg, ink), document.body) : null;

  return (
    <View
      ref={host}
      collapsable={false}
      style={fill ? styles.fill : styles.inline}
      {...({
        onMouseEnter: scheduleShow,
        onMouseLeave: hide,
        onFocus: scheduleShow,
        onBlur: hide,
      } as object)}
    >
      {children}
      {tip}
    </View>
  );
}

function placeTip(box: Box, text: string, backgroundColor: string, color: string) {
  const maxW = 280;
  const padX = 20;
  const est = Math.min(maxW, Math.max(72, text.length * 7.2 + padX));
  const lines = Math.max(1, Math.ceil((text.length * 7.2) / (maxW - padX)));
  const tipH = 8 + lines * 18;
  const vw = typeof window === 'undefined' ? 800 : window.innerWidth;
  let left = box.left + box.width / 2 - est / 2;
  left = Math.max(8, Math.min(left, vw - est - 8));
  const below = box.top < tipH + 12;
  const top = below ? box.top + box.height + 8 : box.top - tipH - 8;

  return (
    <View pointerEvents="none" style={[styles.tip, { backgroundColor, left, top, maxWidth: maxW }]}>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    alignSelf: 'flex-start',
  },
  fill: {
    alignSelf: 'stretch',
  },
  tip: {
    position: 'fixed',
    zIndex: 10000,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    maxWidth: 280,
  },
  text: {
    ...type.meta,
    fontWeight: '600',
  },
});
