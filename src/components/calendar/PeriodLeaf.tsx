/**
 * Runtime-composed Set B period tiles (View/Text only — no PNG atlas / build-icons).
 * Year / Month / Week / Day icon tiles; multiday/agenda keep wrap chrome.
 * Light + dark via theme. Supersedes PR 149 full-danger pink-pill year leaf.
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

/** Tiny year glyph: stacked bars suggesting a year block. */
function YearIcon({ accent, ink }: { accent: string; ink: string }) {
  return (
    <View style={styles.iconBox} accessibilityElementsHidden>
      <View style={[styles.yearBar, { backgroundColor: accent }]} />
      <View style={[styles.yearBar, styles.yearBarMid, { backgroundColor: ink }]} />
      <View style={[styles.yearBar, { backgroundColor: accent }]} />
    </View>
  );
}

/** Week glyph: 7 dots. */
function WeekIcon({ accent, mute }: { accent: string; mute: string }) {
  return (
    <View style={styles.weekDots} accessibilityElementsHidden>
      {Array.from({ length: 7 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.weekDot,
            { backgroundColor: i === 0 || i === 6 ? accent : mute },
          ]}
        />
      ))}
    </View>
  );
}

/** Day glyph: circled day number fragment. */
function DayIcon({
  label,
  accent,
  ink,
  elevated,
}: {
  label: string;
  accent: string;
  ink: string;
  elevated: string;
}) {
  return (
    <View
      style={[styles.dayCircle, { borderColor: accent, backgroundColor: elevated }]}
      accessibilityElementsHidden
    >
      <Text style={[styles.dayCircleText, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function PeriodLeafImpl({ tile, role, showCenterExtras, width }: Props) {
  const { colors } = useTheme();
  const isCenter = role === 'current';
  const caption = isCenter && showCenterExtras ? tile.centerCaption : tile.sideCaption;
  const leafWidth = Math.max(72, width - 8);
  const cardStyle = [
    styles.leaf,
    styles.card,
    {
      width: leafWidth,
      backgroundColor: colors.elevated,
      borderColor: colors.line,
    },
  ];

  if (tile.kind === 'year') {
    return (
      <View style={cardStyle} accessibilityLabel={tile.centerCaption}>
        <YearIcon accent={colors.danger} ink={colors.ink} />
        <Text
          style={[
            styles.caption,
            isCenter && showCenterExtras ? styles.captionCenter : styles.captionSide,
            { color: colors.ink },
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
      <View style={cardStyle} accessibilityLabel={tile.centerCaption}>
        <View style={[styles.accentStrip, { backgroundColor: colors.danger }]} />
        <Text style={[styles.caption, styles.captionSide, { color: colors.ink }]} numberOfLines={1}>
          {caption}
        </Text>
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

  if (tile.kind === 'week') {
    return (
      <View style={cardStyle} accessibilityLabel={tile.centerCaption}>
        <WeekIcon accent={colors.danger} mute={colors.mute} />
        <Text
          style={[
            styles.caption,
            isCenter && showCenterExtras ? styles.captionCenter : styles.captionSide,
            { color: colors.ink },
          ]}
          numberOfLines={isCenter && showCenterExtras ? 2 : 1}
        >
          {caption}
        </Text>
      </View>
    );
  }

  if (tile.kind === 'day') {
    const dayNum = tile.dayIso ? String(Number(tile.dayIso.slice(8, 10))) : caption;
    return (
      <View style={cardStyle} accessibilityLabel={tile.centerCaption}>
        <DayIcon
          label={dayNum}
          accent={colors.danger}
          ink={colors.ink}
          elevated={colors.bg}
        />
        {isCenter && showCenterExtras ? (
          <Text style={[styles.caption, styles.captionCenter, { color: colors.ink }]} numberOfLines={2}>
            {tile.centerCaption}
          </Text>
        ) : (
          <Text style={[styles.caption, styles.captionSide, { color: colors.mute }]} numberOfLines={1}>
            {tile.sideCaption}
          </Text>
        )}
      </View>
    );
  }

  // multiday / agenda — wrap card (no full-bleed pink pill)
  return (
    <View style={cardStyle} accessibilityLabel={tile.centerCaption}>
      <View style={[styles.accentStrip, { backgroundColor: colors.danger }]} />
      <Text
        style={[
          styles.caption,
          isCenter && showCenterExtras ? styles.captionCenter : styles.captionSide,
          { color: colors.ink },
        ]}
        numberOfLines={isCenter && showCenterExtras ? 2 : 1}
      >
        {caption}
      </Text>
      {isCenter && showCenterExtras ? (
        <Text style={[styles.meta, { color: colors.mute }]} numberOfLines={1}>
          {tile.kind === 'agenda' ? 'Agenda' : 'Range'}
        </Text>
      ) : null}
    </View>
  );
}

export const PeriodLeaf = memo(PeriodLeafImpl);

const styles = StyleSheet.create({
  leaf: {
    borderRadius: 14,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  accentStrip: {
    alignSelf: 'stretch',
    height: 3,
    borderRadius: 2,
    marginBottom: 2,
  },
  caption: {
    ...type.meta,
    fontWeight: '700',
    textAlign: 'center',
  },
  captionSide: {
    fontSize: 13,
  },
  captionCenter: {
    fontSize: 15,
  },
  meta: {
    ...type.meta,
    fontSize: 11,
  },
  iconBox: {
    width: 28,
    height: 22,
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  yearBar: {
    height: 5,
    borderRadius: 2,
    width: '100%',
  },
  yearBarMid: {
    width: '72%',
    alignSelf: 'center',
  },
  weekDots: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 2,
  },
  weekDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dayCircleText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  monthStub: {
    height: 20,
  },
  hangGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 2,
    paddingBottom: 2,
    paddingTop: 2,
    alignSelf: 'stretch',
  },
  hangDay: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 8,
    lineHeight: 11,
    fontVariant: ['tabular-nums'],
  },
});
