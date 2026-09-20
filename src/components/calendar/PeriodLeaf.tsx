/**
 * Runtime-composed period leaf (Set B). View/Text only — no PNG atlas / build-icons.
 */
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type } from '@/constants/theme';
import { monthGridDays } from '@/lib/calendar/month';
import type { PeriodTileModel } from '@/lib/calendar/periodPager';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  tile: PeriodTileModel;
  /** Side tiles stay abbreviated; center shows full caption after snap. */
  role: 'prev' | 'current' | 'next';
  /** Extra center caption / hanging grid after finger-up snap. */
  showCenterExtras: boolean;
  width: number;
};

function MonthHangingGrid({
  year,
  monthIndex0,
  sundayRed,
  ink,
  mute,
}: {
  year: number;
  monthIndex0: number;
  sundayRed: string;
  ink: string;
  mute: string;
}) {
  const days = useMemo(() => monthGridDays(year, monthIndex0, 0), [year, monthIndex0]);
  const cells = days.slice(0, 42);
  return (
    <View style={styles.hangGrid} accessibilityElementsHidden>
      {cells.map((iso, i) => {
        const dow = i % 7;
        const dayNum = Number(iso.slice(8, 10));
        const inMonth =
          Number(iso.slice(0, 4)) === year && Number(iso.slice(5, 7)) - 1 === monthIndex0;
        const color = !inMonth ? mute : dow === 0 ? sundayRed : ink;
        return (
          <Text key={`${iso}-${i}`} style={[styles.hangDay, { color }]}>
            {inMonth ? dayNum : ''}
          </Text>
        );
      })}
    </View>
  );
}

function PeriodLeafImpl({ tile, role, showCenterExtras, width }: Props) {
  const { colors } = useTheme();
  const isCenter = role === 'current';
  const caption = isCenter && showCenterExtras ? tile.centerCaption : tile.sideCaption;
  const leafWidth = Math.max(72, width - 8);

  if (tile.kind === 'year') {
    return (
      <View
        style={[
          styles.leaf,
          styles.yearLeaf,
          { width: leafWidth, backgroundColor: colors.danger },
        ]}
        accessibilityLabel={tile.centerCaption}
      >
        <Text
          style={[
            styles.yearText,
            isCenter && showCenterExtras ? styles.yearTextCenter : styles.yearTextSide,
            { color: '#FFF8F3' },
          ]}
          numberOfLines={1}
        >
          {caption}
        </Text>
      </View>
    );
  }

  if (tile.kind === 'month') {
    return (
      <View
        style={[
          styles.leaf,
          styles.monthLeaf,
          { width: leafWidth, backgroundColor: colors.elevated, borderColor: colors.line },
        ]}
        accessibilityLabel={tile.centerCaption}
      >
        <View style={[styles.monthHeader, { backgroundColor: colors.danger }]}>
          <Text style={[styles.monthHeaderText, { color: '#FFF8F3' }]} numberOfLines={1}>
            {caption}
          </Text>
        </View>
        {isCenter && showCenterExtras && tile.monthYear != null && tile.monthIndex0 != null ? (
          <MonthHangingGrid
            year={tile.monthYear}
            monthIndex0={tile.monthIndex0}
            sundayRed={colors.danger}
            ink={colors.ink}
            mute={colors.mute}
          />
        ) : (
          <View style={styles.monthStub} />
        )}
      </View>
    );
  }

  // week / multiday / day / agenda — double-height red header wrap
  return (
    <View
      style={[
        styles.leaf,
        styles.wrapLeaf,
        { width: leafWidth, backgroundColor: colors.elevated, borderColor: colors.line },
      ]}
      accessibilityLabel={tile.centerCaption}
    >
      <View style={[styles.wrapHeader, { backgroundColor: colors.danger }]}>
        <Text
          style={[styles.wrapHeaderText, { color: '#FFF8F3' }]}
          numberOfLines={isCenter && showCenterExtras ? 2 : 1}
        >
          {caption}
        </Text>
      </View>
      <View style={styles.wrapBody}>
        {isCenter && showCenterExtras ? (
          <Text style={[styles.wrapBodyText, { color: colors.mute }]} numberOfLines={2}>
            {tile.kind === 'agenda' ? 'Agenda' : tile.kind === 'day' ? 'Day' : 'Range'}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const PeriodLeaf = memo(PeriodLeafImpl);

const styles = StyleSheet.create({
  leaf: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  yearLeaf: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  yearText: {
    ...type.section,
    fontWeight: '700',
  },
  yearTextSide: {
    fontSize: 18,
  },
  yearTextCenter: {
    fontSize: 22,
  },
  monthLeaf: {
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  monthHeader: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  monthHeaderText: {
    ...type.meta,
    fontWeight: '700',
  },
  monthStub: {
    height: 28,
  },
  hangGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    paddingBottom: 6,
    paddingTop: 2,
  },
  hangDay: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 8,
    lineHeight: 11,
    fontVariant: ['tabular-nums'],
  },
  wrapLeaf: {
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  wrapHeader: {
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  wrapHeaderText: {
    ...type.meta,
    fontWeight: '700',
    textAlign: 'center',
  },
  wrapBody: {
    minHeight: 18,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  wrapBodyText: {
    ...type.meta,
    fontSize: 11,
  },
});
