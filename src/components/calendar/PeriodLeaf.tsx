/**
 * Fixed-plate period tiles (View/Text — no PNG atlas / build-icons).
 * Leaf hex fixed across themes (CAL-3DW-10). Chrome plate themes elsewhere.
 * CAL-DRUM P1: fixed plate idle — red header + single body line/numeral/range.
 * Never mounts month hanging grids or week day strips on the drum (grids stay in calendar body).
 * P0 ContentPolicy: fling ±3 clear; beyond → opacity-dim silhouette (no BlurView / CSS blur).
 * Plate geometry is always compact (showCenterExtras / motionCompact kept for API compat).
 */
import { memo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PeriodTileModel } from '@/lib/calendar/periodPager';
import {
  SET_B,
  WHEEL_HERO_HEIGHT,
  WHEEL_HERO_WIDTH,
  type WheelContentMode,
} from '@/lib/calendar/periodWheel';

export type PeriodLeafRole =
  | 'prev3'
  | 'prev2'
  | 'prev'
  | 'current'
  | 'next'
  | 'next2'
  | 'next3';

type Props = {
  tile: PeriodTileModel;
  /** Side tiles stay abbreviated; center shows full caption after snap. */
  role: PeriodLeafRole;
  /** Kept for API compat — plate never mounts drum-grid extras. */
  showCenterExtras: boolean;
  /**
   * Kept for API compat — plate geometry is always fixed/compact
   * (no hanging month grid, no expanding week/day headers, no year fontSize swap).
   */
  motionCompact?: boolean;
  /** P0 ContentPolicy: silhouette during fling; full ledger after snap. */
  contentMode: WheelContentMode;
  /** Ignored for layout — hero box is SoT 108×126. Kept for call-site compat. */
  width?: number;
};

const MONS_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

function MetalTabs() {
  return (
    <View style={styles.tabsRow} accessibilityElementsHidden>
      <View style={styles.tab}>
        <View style={styles.tabHighlight} />
      </View>
      <View style={styles.tab}>
        <View style={styles.tabHighlight} />
      </View>
    </View>
  );
}

/** Red header on week plate — start month (CEO 2026-09-24). */
function weekHeaderMonth(fromIso: string): string {
  const m = Number(fromIso.slice(5, 7)) - 1;
  return MONS_SHORT[m] ?? '';
}

/** Body on week plate — day range; include months only when the week crosses months. */
function weekBodyRange(fromIso: string, toIso: string): string {
  const fm = Number(fromIso.slice(5, 7)) - 1;
  const fd = Number(fromIso.slice(8, 10));
  const tm = Number(toIso.slice(5, 7)) - 1;
  const td = Number(toIso.slice(8, 10));
  const fromMon = MONS_SHORT[fm] ?? '';
  const toMon = MONS_SHORT[tm] ?? '';
  // Header already shows the start month — same-month weeks use day numbers only.
  return fm === tm ? `${fd}–${td}` : `${fromMon} ${fd}–${toMon} ${td}`;
}

/** Footer on week plate — year from week start (CEO 2026-09-24). */
function weekFooterYear(fromIso: string): string {
  return String(Number(fromIso.slice(0, 4)));
}

/** Red header on day plate — month only (CEO 2026-09-24). */
function dayHeaderMonth(dayIso: string): string {
  const m = Number(dayIso.slice(5, 7)) - 1;
  return MONS_SHORT[m] ?? '';
}

/** Footer on day plate — year (CEO 2026-09-24). */
function dayFooterYear(dayIso: string): string {
  return String(Number(dayIso.slice(0, 4)));
}

/** Tall red header (~1/3) on month plate — year (CEO 2026-09-24). */
function monthHeaderYear(year: number): string {
  return String(year);
}

/** Body on month plate — month name (CEO 2026-09-24). */
function monthBodyName(monthIndex0: number): string {
  return MONS_SHORT[monthIndex0] ?? '';
}

/**
 * Opacity-dim silhouette wrapper (CAL-DRUM P0 N4).
 * No BlurView / CSS filter blur — fill-rate safe during fling.
 */
function DimOut({ children }: { children: ReactNode }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.dimOutRoot, styles.dimOutOpacity]}
      accessibilityElementsHidden
    >
      {children}
    </View>
  );
}

/**
 * Per-kind fling silhouette — clone idle chrome geometry (DimOut = opacity).
 * Month/week/day must match header/body/footer heights of the snapped plate
 * so flick → snap does not jump (CEO 2026-09-24).
 */
function SilhouetteLeaf({ tile }: { tile: PeriodTileModel }) {
  const label = tile.centerCaption;

  let body: React.ReactNode;

  if (tile.kind === 'year') {
    const yearLabel = String(tile.year ?? tile.centerCaption);
    body = (
      <View style={styles.hero} accessibilityLabel={label} accessibilityElementsHidden>
        <MetalTabs />
        <View style={[styles.page, styles.yearPage]}>
          <Text
            style={[styles.yearText, styles.yearTextPlate, styles.silhouetteYearText]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {yearLabel}
          </Text>
        </View>
      </View>
    );
  } else if (tile.kind === 'month') {
    const year = tile.monthYear ?? 0;
    const monthIndex0 = tile.monthIndex0 ?? 0;
    const header = monthHeaderYear(year);
    const monthName = monthBodyName(monthIndex0);
    body = (
      <View style={styles.hero} accessibilityLabel={label} accessibilityElementsHidden>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.monthTallHeader}>
            <Text
              style={[styles.monthTallHeaderText, styles.silhouetteSoftText]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {header}
            </Text>
          </View>
          <View style={styles.monthTallBody}>
            <Text
              style={[styles.monthTallBodyText, styles.silhouetteSoftText]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {monthName}
            </Text>
          </View>
        </View>
      </View>
    );
  } else if (tile.kind === 'week' && tile.fromIso && tile.toIso) {
    const header = weekHeaderMonth(tile.fromIso);
    const range = weekBodyRange(tile.fromIso, tile.toIso);
    const footer = weekFooterYear(tile.fromIso);
    body = (
      <View style={styles.hero} accessibilityLabel={label} accessibilityElementsHidden>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.wrapHeader}>
            <Text
              style={[styles.wrapHeaderText, styles.silhouetteSoftText]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {header}
            </Text>
          </View>
          <View style={styles.weekBody}>
            <Text
              style={[styles.weekBodyText, styles.silhouetteSoftText]}
              numberOfLines={2}
              allowFontScaling={false}
            >
              {range}
            </Text>
          </View>
          <View style={styles.wrapFooter}>
            <Text
              style={[styles.wrapFooterText, styles.silhouetteSoftText]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {footer}
            </Text>
          </View>
        </View>
      </View>
    );
  } else if (tile.kind === 'day' && tile.dayIso) {
    const header = dayHeaderMonth(tile.dayIso);
    const dayNum = String(Number(tile.dayIso.slice(8, 10)));
    const footer = dayFooterYear(tile.dayIso);
    body = (
      <View style={styles.hero} accessibilityLabel={label} accessibilityElementsHidden>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.wrapHeader}>
            <Text
              style={[styles.wrapHeaderText, styles.silhouetteSoftText]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {header}
            </Text>
          </View>
          <View style={styles.dayBody}>
            <Text
              style={[styles.dayNumeral, styles.silhouetteSoftText]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {dayNum}
            </Text>
          </View>
          <View style={styles.wrapFooter}>
            <Text
              style={[styles.wrapFooterText, styles.silhouetteSoftText]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {footer}
            </Text>
          </View>
        </View>
      </View>
    );
  } else {
    const hint = tile.sideCaption || tile.centerCaption;
    body = (
      <View style={styles.hero} accessibilityLabel={label} accessibilityElementsHidden>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.wrapHeader} />
          <Text style={styles.silhouetteCaption} numberOfLines={2} allowFontScaling={false}>
            {hint}
          </Text>
        </View>
      </View>
    );
  }

  return <DimOut>{body}</DimOut>;
}

function PeriodLeafImpl({
  tile,
  role,
  showCenterExtras: _showCenterExtras,
  motionCompact: _motionCompact = false,
  contentMode,
}: Props) {
  // Fixed plate always — drum never mounts hanging month grids / week day strips.
  void _showCenterExtras;
  void _motionCompact;
  const isCenter = role === 'current';

  if (contentMode === 'silhouette') {
    return <SilhouetteLeaf tile={tile} />;
  }

  if (tile.kind === 'year') {
    // Always 4-digit year on every plate (sides used to show 'YY; center ellipsized with Dynamic Type).
    void isCenter;
    const label = String(tile.year ?? tile.centerCaption);
    return (
      <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
        <MetalTabs />
        <View style={[styles.page, styles.yearPage]}>
          <Text
            style={[styles.yearText, styles.yearTextPlate]}
            numberOfLines={1}
            allowFontScaling={false}
            ellipsizeMode="clip"
          >
            {label}
          </Text>
        </View>
      </View>
    );
  }

  if (tile.kind === 'month') {
    const year = tile.monthYear ?? 0;
    const monthIndex0 = tile.monthIndex0 ?? 0;
    const header = monthHeaderYear(year);
    const body = monthBodyName(monthIndex0);
    return (
      <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
        <MetalTabs />
        <View style={styles.page}>
          {/* Header ≈1/3 page (36px); body fills rest — matches silhouette. */}
          <View style={styles.monthTallHeader}>
            <Text style={styles.monthTallHeaderText} numberOfLines={1} allowFontScaling={false}>
              {header}
            </Text>
          </View>
          <View style={styles.monthTallBody}>
            <Text style={styles.monthTallBodyText} numberOfLines={1} allowFontScaling={false}>
              {body}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (tile.kind === 'week' && tile.fromIso && tile.toIso) {
    const header = weekHeaderMonth(tile.fromIso);
    const body = weekBodyRange(tile.fromIso, tile.toIso);
    const footer = weekFooterYear(tile.fromIso);
    return (
      <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.wrapHeader}>
            <Text style={styles.wrapHeaderText} numberOfLines={1}>
              {header}
            </Text>
          </View>
          <View style={styles.weekBody}>
            <Text style={styles.weekBodyText} numberOfLines={2} allowFontScaling={false}>
              {body}
            </Text>
          </View>
          <View style={styles.wrapFooter}>
            <Text style={styles.wrapFooterText} numberOfLines={1} allowFontScaling={false}>
              {footer}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (tile.kind === 'day' && tile.dayIso) {
    const header = dayHeaderMonth(tile.dayIso);
    const dayNum = String(Number(tile.dayIso.slice(8, 10)));
    const footer = dayFooterYear(tile.dayIso);
    return (
      <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.wrapHeader}>
            <Text style={styles.wrapHeaderText} numberOfLines={1}>
              {header}
            </Text>
          </View>
          <View style={styles.dayBody}>
            <Text style={styles.dayNumeral} numberOfLines={1} allowFontScaling={false}>
              {dayNum}
            </Text>
          </View>
          <View style={styles.wrapFooter}>
            <Text style={styles.wrapFooterText} numberOfLines={1} allowFontScaling={false}>
              {footer}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // multiday / agenda — hanging ledger shell (no generic body noun captions)
  const wrapLine = tile.sideCaption || tile.centerCaption;
  return (
    <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
      <MetalTabs />
      <View style={styles.page}>
        <View style={styles.wrapHeader}>
          <Text style={styles.wrapHeaderText} numberOfLines={2}>
            {wrapLine}
          </Text>
        </View>
        <View style={styles.wrapBodyEmpty} />
      </View>
    </View>
  );
}

export const PeriodLeaf = memo(PeriodLeafImpl);

const styles = StyleSheet.create({
  hero: {
    width: WHEEL_HERO_WIDTH,
    height: WHEEL_HERO_HEIGHT,
    alignItems: 'center',
  },
  tabsRow: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 18,
  },
  tab: {
    width: 14,
    height: 16,
    borderRadius: 3.5,
    backgroundColor: SET_B.tabMetal,
    alignItems: 'center',
    paddingTop: 2,
  },
  tabHighlight: {
    width: 10,
    height: 5,
    borderRadius: 2,
    backgroundColor: SET_B.tabHighlight,
  },
  page: {
    marginTop: 10,
    width: 92,
    height: 108,
    borderRadius: 8,
    backgroundColor: SET_B.body,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SET_B.softEdge,
    overflow: 'hidden',
  },
  yearPage: {
    backgroundColor: SET_B.header,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    color: SET_B.body,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  yearTextPlate: {
    fontSize: 24,
  },
  /** Month plate: header ≈1/3 of page (fixed 36 of 108); body fills rest. */
  monthTallHeader: {
    height: 36,
    backgroundColor: SET_B.header,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  monthTallHeaderText: {
    color: SET_B.body,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  monthTallBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  monthTallBodyText: {
    color: SET_B.type,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  monthHeader: {
    backgroundColor: SET_B.header,
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
    minHeight: 24,
    justifyContent: 'center',
  },
  monthHeaderText: {
    color: SET_B.body,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  silhouetteHeader: {
    backgroundColor: SET_B.header,
    height: 24,
    width: '100%',
  },
  monthStub: {
    flex: 1,
  },
  wrapHeader: {
    backgroundColor: SET_B.header,
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  wrapHeaderText: {
    color: SET_B.body,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  wrapFooter: {
    backgroundColor: SET_B.header,
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  wrapFooterText: {
    color: SET_B.body,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  plateBodyLine: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: SET_B.type,
    paddingHorizontal: 6,
    paddingTop: 10,
  },
  weekBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  weekBodyText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: SET_B.type,
  },
  /** Centers the day numeral vertically between header and footer. */
  dayBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  dayNumeral: {
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '700',
    color: SET_B.type,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    lineHeight: 38,
  },
  wrapBodyEmpty: {
    flex: 1,
  },
  // Opacity-dim silhouette (no BlurView / CSS blur) — CAL-DRUM P0 N4.
  dimOutRoot: {
    width: WHEEL_HERO_WIDTH,
    height: WHEEL_HERO_HEIGHT,
    overflow: 'hidden',
  },
  dimOutOpacity: {
    opacity: 0.4,
  },
  silhouetteYearText: {
    fontSize: 26,
    // Fallback when blur unavailable: heavy opacity + letter-spacing (single layer).
    opacity: 0.55,
    letterSpacing: 2,
  },
  /** Soften cloned idle labels during fling (geometry stays identical). */
  silhouetteSoftText: {
    opacity: 0.55,
  },
  silhouetteFooter: {
    backgroundColor: SET_B.header,
    height: 24,
    width: '100%',
  },
  silhouetteHintRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 4,
  },
  silhouetteDayHint: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: SET_B.type,
    opacity: 0.55,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  silhouetteLabelHint: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: SET_B.type,
    opacity: 0.55,
    letterSpacing: 1,
  },
  silhouetteDayNumeral: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 38,
    fontWeight: '700',
    color: SET_B.type,
    opacity: 0.55,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  silhouetteCaption: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: SET_B.type,
    opacity: 0.55,
    letterSpacing: 1.5,
    paddingHorizontal: 6,
    paddingTop: 10,
  },
});
