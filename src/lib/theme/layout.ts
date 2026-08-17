import { useWindowDimensions } from 'react-native';

export type LayoutBreakpoint = 'phone-portrait' | 'phone-landscape' | 'tablet';

export type Layout = {
  width: number;
  height: number;
  pad: 16 | 24;
  orientation: 'portrait' | 'landscape';
  breakpoint: LayoutBreakpoint;
  isPhone: boolean;
  isSplit: boolean;
  showTopBar: boolean;
};

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const orientation = width > height ? 'landscape' : 'portrait';
  const showTopBar = width >= 720;
  const isSplit = width >= 900;
  const breakpoint: LayoutBreakpoint = showTopBar
    ? 'tablet'
    : width >= height && width < 900
      ? 'phone-landscape'
      : 'phone-portrait';
  return {
    width,
    height,
    pad: width >= 720 ? 24 : 16,
    orientation,
    breakpoint,
    isPhone: width < 720,
    isSplit,
    showTopBar,
  };
}
