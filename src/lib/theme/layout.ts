import { useWindowDimensions } from 'react-native';

import { isPhoneFormFactor, layoutBreakpoint } from './layoutBreakpoint.ts';
import type { Layout, LayoutBreakpoint } from './layoutTypes.ts';

export type { Layout, LayoutBreakpoint };
export { isPhoneFormFactor, layoutBreakpoint };

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const orientation = width > height ? 'landscape' : 'portrait';
  const showTopBar = width >= 720;
  const isSplit = width >= 900;
  const isPhone = isPhoneFormFactor(width, height);
  const breakpoint = layoutBreakpoint(width, height);
  return {
    width,
    height,
    pad: width >= 720 ? 24 : 16,
    orientation,
    breakpoint,
    isPhone,
    isSplit,
    showTopBar,
  };
}
