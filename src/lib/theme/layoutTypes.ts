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
