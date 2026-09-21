/**
 * Set B hanging-ledger period tiles (View/Text — no PNG atlas / build-icons).
 * Leaf hex fixed across themes (CAL-3DW-10). Chrome plate themes elsewhere.
 * SoT: calendar-3d-wheel-spec.md §3 · mockups/index.html · pm-lock CAL-3DW-16.
 */
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { monthGridDays } from '@/lib/calendar/month';
import type { PeriodTileModel } from '@/lib/calendar/periodPager';
import {
  SET_B,
  WHEEL_HERO_HEIGHT,
  WHEEL_HERO_WIDTH,
} from '@/lib/calendar/periodWheel';
import { addDaysISO } from '@/lib/date/iso';

type Props = {
  tile: PeriodTileModel;
  /** Side tiles stay abbreviated; center shows full caption after snap. */
  role: 'prev3' | 'prev2' | 'prev' | 'current' | 'next' | 'next2' | 'next3';
  /** Extra center caption / hanging grid after finger-up snap. */
  showCenterExtras: boolean;
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

const MONS_FULL = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
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

function MonthHangingGrid({
  year,
  monthIndex0,
}: {
  year: number;
  monthIndex0: number;
}) {
  const days = useMemo(() => monthGridDays(year, monthIndex0, 0), [year, monthIndex0]);
  const cells = days.slice(0, 35); // 5 rows — matches mockup density
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return (
    <View style={styles.hangGrid} accessibilityElementsHidden>
      {labels.map((lab, i) => (
        <Text
          key={`dow-${i}`}
          style={[styles.hangDow, { color: i === 0 ? SET_B.sunday : SET_B.type }]}
        >
          {lab}
        </Text>
      ))}
      {cells.map((iso, i) => {
        const dow = i % 7;
        const dayNum = Number(iso.slice(8, 10));
        const inMonth =
          Number(iso.slice(0, 4)) === year && Number(iso.slice(5, 7)) - 1 === monthIndex0;
        const color = !inMonth ? SET_B.grid : dow === 0 ? SET_B.sunday : SET_B.type;
        return (
          <Text
            key={`${iso}-${i}`}
            numberOfLines={1}
            allowFontScaling={false}
            style={[styles.hangDay, { color }]}
          >
            {inMonth ? dayNum : ''}
          </Text>
        );
      })}
    </View>
  );
}

function WeekDayStrip({ fromIso }: { fromIso: string }) {
  const days = useMemo(() => {
    const out: { n: number; sunday: boolean }[] = [];
    for (let i = 0; i < 7; i += 1) {
      const iso = addDaysISO(fromIso, i) ?? fromIso;
      out.push({ n: Number(iso.slice(8, 10)), sunday: i === 0 });
    }
    return out;
  }, [fromIso]);

  return (
    <View style={styles.weekStrip} accessibilityElementsHidden>
      {days.map((d, i) => (
        <View
          key={i}
          style={[
            styles.weekCell,
            { borderColor: d.sunday ? SET_B.sunday : SET_B.type },
          ]}
        >
          <Text
            style={[
              styles.weekCellText,
              { color: d.sunday ? SET_B.sunday : SET_B.type },
            ]}
          >
            {d.n}
          </Text>
        </View>
      ))}
    </View>
  );
}

function weekHeaderLines(fromIso: string, toIso: string, isCenter: boolean): string[] {
  const fy = Number(fromIso.slice(0, 4));
  const fm = Number(fromIso.slice(5, 7)) - 1;
  const fd = Number(fromIso.slice(8, 10));
  const tm = Number(toIso.slice(5, 7)) - 1;
  const td = Number(toIso.slice(8, 10));
  const fromMon = MONS_SHORT[fm] ?? '';
  const toMon = MONS_SHORT[tm] ?? '';
  const range =
    fm === tm ? `${fromMon} ${fd}–${td}` : `${fromMon} ${fd}–${toMon} ${td}`;
  if (isCenter) return [range, String(fy)];
  return [range];
}

function dayHeaderLines(dayIso: string, isCenter: boolean): string[] {
  const y = Number(dayIso.slice(0, 4));
  const m = Number(dayIso.slice(5, 7)) - 1;
  const mon = MONS_FULL[m] ?? '';
  if (isCenter) return [mon, String(y)];
  return [MONS_SHORT[m] ?? mon];
}

function monthHeaderLabel(year: number, monthIndex0: number): string {
  const mon = MONS_SHORT[monthIndex0] ?? '';
  const label = `${mon} ${year}`;
  return label.length > 12 ? `${mon}\n${year}` : label;
}

function PeriodLeafImpl({ tile, role, showCenterExtras }: Props) {
  const isCenter = role === 'current';
  const showExtras = isCenter && showCenterExtras;

  if (tile.kind === 'year') {
    const label = isCenter ? String(tile.year ?? tile.centerCaption) : tile.sideCaption;
    return (
      <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
        <MetalTabs />
        <View style={[styles.page, styles.yearPage]}>
          <Text
            style={[
              styles.yearText,
              isCenter ? styles.yearTextCenter : styles.yearTextSide,
            ]}
            numberOfLines={1}
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
          {year > 0 ? (
            <MonthHangingGrid year={year} monthIndex0={monthIndex0} />
          ) : (
            <View style={styles.monthStub} />
          )}
        </View>
      </View>
    );
  }

  if (tile.kind === 'week' && tile.fromIso && tile.toIso) {
    const lines = weekHeaderLines(tile.fromIso, tile.toIso, showExtras);
    return (
      <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
        <MetalTabs />
        <View style={styles.page}>
          <View style={[styles.wrapHeader, styles.wrapHeaderTall]}>
            {lines.map((line) => (
              <Text key={line} style={styles.wrapHeaderText} numberOfLines={1}>
                {line}
              </Text>
            ))}
          </View>
          <WeekDayStrip fromIso={tile.fromIso} />
        </View>
      </View>
    );
  }

  if (tile.kind === 'day' && tile.dayIso) {
    const lines = dayHeaderLines(tile.dayIso, showExtras);
    const dayNum = String(Number(tile.dayIso.slice(8, 10)));
    return (
      <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
        <MetalTabs />
        <View style={styles.page}>
          <View style={[styles.wrapHeader, styles.wrapHeaderTall]}>
            {lines.map((line) => (
              <Text key={line} style={styles.wrapHeaderText} numberOfLines={1}>
                {line}
              </Text>
            ))}
          </View>
          <Text
            style={styles.dayNumeral}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {dayNum}
          </Text>
        </View>
      </View>
    );
  }

  // multiday / agenda — hanging ledger shell (no generic body noun captions)
  const wrapLines = showExtras
    ? tile.centerCaption.split(/[–-]/).length > 1
      ? [tile.sideCaption]
      : [tile.centerCaption]
    : [tile.sideCaption];
  return (
    <View style={styles.hero} accessibilityLabel={tile.centerCaption}>
      <MetalTabs />
      <View style={styles.page}>
        <View style={[styles.wrapHeader, styles.wrapHeaderTall]}>
          {wrapLines.map((line) => (
            <Text key={line} style={styles.wrapHeaderText} numberOfLines={2}>
              {line}
            </Text>
          ))}
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
  yearTextCenter: {
    fontSize: 26,
  },
  yearTextSide: {
    fontSize: 28,
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
  monthStub: {
    flex: 1,
  },
  hangGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    paddingBottom: 4,
    paddingTop: 2,
    flex: 1,
  },
  hangDow: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 7,
    lineHeight: 10,
    fontWeight: '600',
  },
  hangDay: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 7.5,
    lineHeight: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 0,
  },
  wrapHeader: {
    backgroundColor: SET_B.header,
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapHeaderTall: {
    minHeight: 40,
  },
  wrapHeaderText: {
    color: SET_B.body,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  weekStrip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  weekCell: {
    width: 10,
    height: 36,
    borderRadius: 2.5,
    borderWidth: 1,
    alignItems: 'center',
    paddingTop: 4,
  },
  weekCellText: {
    fontSize: 7,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
});
