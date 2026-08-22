import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export type Palette = {
  bg: string;
  elevated: string;
  card: string;
  ink: string;
  mute: string;
  line: string;
  brand: string;
  brandSoft: string;
  brandInk: string;
  good: string;
  goodSoft: string;
  warn: string;
  warnSoft: string;
  danger: string;
  dangerSoft: string;
  focus: string;
  wash: string;
};

export const palettes = {
  light: {
    bg: '#F7F3EC',
    elevated: '#FFFCFA',
    card: '#FFFFFF',
    ink: '#1A1612',
    mute: '#6A635B',
    line: '#E7E0D6',
    brand: '#B03E0E',
    brandSoft: '#F8E2D4',
    brandInk: '#FFF8F3',
    good: '#1F6B40',
    goodSoft: '#DCEFE4',
    warn: '#8F5610',
    warnSoft: '#F8E7C8',
    danger: '#B53A32',
    dangerSoft: '#F8DDD9',
    focus: '#B03E0E',
    wash: '#EFE8DE',
  },
  dark: {
    bg: '#141311',
    elevated: '#1E1C19',
    card: '#26231F',
    ink: '#F4EFE6',
    mute: '#B0A79C',
    line: '#3D3832',
    brand: '#E07A3A',
    brandSoft: '#3C2418',
    brandInk: '#1A120C',
    good: '#5FBE82',
    goodSoft: '#1A2E22',
    warn: '#E0A04A',
    warnSoft: '#2E2416',
    danger: '#F07A70',
    dangerSoft: '#331C1A',
    focus: '#E07A3A',
    wash: '#2A2723',
  },
} as const satisfies Record<'light' | 'dark', Palette>;

export type ColorScheme = 'light' | 'dark';
export type AppearanceMode = 'system' | 'light' | 'dark';

export const space = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  24: 24,
  32: 32,
  48: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  tray: 22,
  pill: 999,
} as const;

const fontFamily = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  ios: 'System',
  default: undefined,
});

function face(
  fontSize: number,
  fontWeight: TextStyle['fontWeight'],
  lineHeight: number,
  letterSpacing: number,
): TextStyle {
  return { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing };
}

export const type = {
  display: face(30, '700', 36, -0.5),
  title: face(22, '700', 28, -0.3),
  section: face(12, '600', 16, 0.8),
  body: face(16, '400', 24, 0),
  rowTitle: face(17, '600', 22, 0),
  meta: face(13, '400', 18, 0),
  button: face(16, '600', 20, 0.2),
  pill: face(14, '600', 18, 0),
  badge: face(11, '600', 14, 0.3),
  cell: {
    ...face(13, '600', 16, 0),
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
};

export const hitSlop = { top: 6, bottom: 6, left: 4, right: 4 };

export function webFocus(brand: string): TextStyle {
  return Platform.select({
    web: {
      outlineWidth: 2,
      outlineColor: brand,
      outlineOffset: 2,
    } as TextStyle,
    default: {},
  })!;
}

export const shadows = {
  light: Platform.select<ViewStyle>({
    web: {
      boxShadow: '0 2px 12px rgba(26, 22, 18, 0.10)',
    } as ViewStyle,
    ios: {
      shadowColor: '#1A1612',
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    default: {
      elevation: 3,
    },
  })!,
  dark: {} as ViewStyle,
};

export const chrome = {
  headerHeight: 56,
  headerHeightLandscape: 44,
  contextHeight: 44,
  contextHeightLandscape: 36,
  trayHeight: 56,
  trayHeightLandscape: 44,
  trayRadius: 22,
  trayInset: 12,
  drawerWidth: 304,
  topBarAt: 720,
  topBarHeight: 48,
  /** Premium chrome motion — slow enough to read, not so slow it fights a repeat tap. */
  motion: {
    tray: 260,
    trayStagger: 50,
    searchIn: 280,
    searchOut: 240,
    drawerInX: 260,
    drawerInY: 320,
    drawerOutY: 240,
    drawerOutX: 220,
    menuIn: 280,
    menuOut: 220,
    context: 260,
  },
};

export const APPEARANCE_KEY = 'kelyra.appearance';
