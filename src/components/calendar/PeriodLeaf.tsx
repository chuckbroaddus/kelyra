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

import { monthGridDays } from '@/lib/calendar/month';
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

/** Red header on week plate — year only (CEO 2026-09-24). */
function weekHeaderYear(fromIso: string): string {
  return String(Number(fromIso.slice(0, 4)));
}

/** Body on week plate — date range (CEO 2026-09-24). */
function weekBodyRange(fromIso: string, toIso: string): string {
  const fm = Number(fromIso.slice(5, 7)) - 1;
  const fd = Number(fromIso.slice(8, 10));
  const tm = Number(toIso.slice(5, 7)) - 1;
  const td = Number(toIso.slice(8, 10));
  const fromMon = MONS_SHORT[fm] ?? '';
  const toMon = MONS_SHORT[tm] ?? '';
  return fm === tm ? `${fromMon} ${fd}–${td}` : `${fromMon} ${fd}–${toMon} ${td}`;
}

function dayHeaderLine(dayIso: string): string {
  const y = Number(dayIso.slice(0, 4));
  const m = Number(dayIso.slice(5, 7)) - 1;
  const mon = MONS_SHORT[m] ?? '';
  return `${mon} ${y}`;
}

function monthHeaderLabel(year: number, monthIndex0: number): string {
  const mon = MONS_SHORT[monthIndex0] ?? '';
  const label = `${mon} ${year}`;
  return label.length > 12 ? `${mon}\n${year}` : label;
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
 * Per-kind fling silhouette — fixed chrome clone; DimOut applies opacity.
 * year: red yearPage bg + white year digits with heavy soft shadow (unreadable);
 * month: black soft day-number hints; week/day: soft label/numeral hints.
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
    const hintDays =
      year > 0
        ? monthGridDays(year, monthIndex0, 0)
            .filter((iso) => {
              return (
                Number(iso.slice(0, 4)) === year && Number(iso.slice(5, 7)) - 1 === monthIndex0
              );
            })
            .slice(0, 7)
        : [];
    body = (
      <View style={styles.hero} accessibilityLabel={label} accessibilityElementsHidden>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.silhouetteHeader} />
          <View style={styles.silhouetteHintRow}>
            {hintDays.map((iso) => (
              <Text
                key={`sil-m-${iso}`}
                style={styles.silhouetteDayHint}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {Number(iso.slice(8, 10))}
              </Text>
            ))}
          </View>
        </View>
      </View>
    );
  } else if (tile.kind === 'week' && tile.fromIso) {
    const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    body = (
      <View style={styles.hero} accessibilityLabel={label} accessibilityElementsHidden>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.silhouetteHeader} />
          <View style={styles.silhouetteHintRow}>
            {labels.map((lab, i) => (
              <Text
                key={`sil-w-${i}`}
                style={[
                  styles.silhouetteLabelHint,
                  i === 0 ? { color: SET_B.sunday } : null,
                ]}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {lab}
              </Text>
            ))}
          </View>
        </View>
      </View>
    );
  } else if (tile.kind === 'day' && tile.dayIso) {
    const dayNum = String(Number(tile.dayIso.slice(8, 10)));
    body = (
      <View style={styles.hero} accessibilityLabel={label} accessibilityElementsHidden>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.silhouetteHeader} />
          <Text style={styles.silhouetteDayNumeral} numberOfLines={1} allowFontScaling={false}>
            {dayNum}
          </Text>
        </View>
      </View>
    );
  } else {
    const hint = tile.sideCaption || tile.centerCaption;
    body = (
      <View style={styles.hero} accessibilityLabel={label} accessibilityElementsHidden>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.silhouetteHeader} />
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
    const header = monthHeaderLabel(year, monthIndex0);
    return (
      <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthHeaderText} numberOfLines={2}>
              {header}
            </Text>
          </View>
          <View style={styles.monthStub} />
        </View>
      </View>
    );
  }

  if (tile.kind === 'week' && tile.fromIso && tile.toIso) {
    const header = weekHeaderYear(tile.fromIso);
    const body = weekBodyRange(tile.fromIso, tile.toIso);
    return (
      <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.wrapHeader}>
            <Text style={styles.wrapHeaderText} numberOfLines={1}>
              {header}
            </Text>
          </View>
          <Text style={styles.plateBodyLine} numberOfLines={2} allowFontScaling={false}>
            {body}
          </Text>
        </View>
      </View>
    );
  }

  if (tile.kind === 'day' && tile.dayIso) {
    const header = dayHeaderLine(tile.dayIso);
    const dayNum = String(Number(tile.dayIso.slice(8, 10)));
    return (
      <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
        <MetalTabs />
        <View style={styles.page}>
          <View style={styles.wrapHeader}>
            <Text style={styles.wrapHeaderText} numberOfLines={1}>
              {header}
            </Text>
          </View>
          <Text style={styles.dayNumeral} numberOfLines={1} allowFontScaling={false}>
            {dayNum}
          </Text>
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
  dayNumeral: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 38,
    fontWeight: '700',
    color: SET_B.type,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
    paddingHorizontal: 0,
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
