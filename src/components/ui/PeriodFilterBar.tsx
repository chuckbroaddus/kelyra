/**
 * PeriodFilterBar.tsx (GB-04 skeleton)
 * Renders All + glyphs. 44pt, tab roles, scroll keep-selected.
 */
import React, { useRef, useEffect } from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { PeriodGlyph, type GlyphState } from './PeriodGlyph';
import { glyphsForCalendar, type GradingCalendar, type GlyphSpec } from './periodGlyphs';

const HIT = 44;

export type PeriodFilterBarProps = {
  calendar: GradingCalendar;
  selectedPeriodId: string;
  showInterims?: boolean;
  onSelect: (periodId: string) => void;
  stacked?: boolean;
};

export function PeriodFilterBar({ calendar, selectedPeriodId = 'all', onSelect, stacked }: PeriodFilterBarProps) {
  const { colors } = useTheme();
  const glyphs = glyphsForCalendar(calendar);
  const scroller = useRef<ScrollView>(null);
  const xRef = useRef<Record<string,number>>({});
  const sel = selectedPeriodId;

  useEffect(() => {
    const x = xRef.current[sel];
    if (x != null && scroller.current) {
      // keep selected in view on narrow (proto; full logic in PersonTabs)
      scroller.current.scrollTo({ x: Math.max(0, x - HIT), animated: true });
    }
  }, [sel]);

  return (
    <View style={[styles.wrap, stacked ? styles.stacked : styles.solo, { borderBottomColor: colors.line }]}>
      <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroller}>
        {glyphs.map((g: GlyphSpec) => {
          const isSel = g.id === sel;
          const st: GlyphState = isSel ? 'selected' : 'idle';
          return (
            <Pressable
              key={g.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={g.dateRange ? `${g.label}, ${g.dateRange}` : g.label}
              onPress={() => onSelect(g.id)}
              onLayout={e => { xRef.current[g.id] = e.nativeEvent.layout.x; }}
              style={isSel ? [styles.hit, { backgroundColor: colors.brandSoft }] : styles.hit}
            >
              <View style={{width:22,height:22,alignItems:'center',justifyContent:'center'}}>
                <PeriodGlyph id={g.id} startDeg={g.startDeg} sweepDeg={g.sweepDeg} state={st} size={22} />
              </View>
              {isSel && <Text style={{fontSize:14,fontWeight:'600',color:colors.brand}}>{g.label}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: -4, flexDirection: 'row', alignItems: 'center' },
  solo: { marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  stacked: { marginBottom: 0, borderBottomWidth: 0 },
  scroller: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingRight: 8 },
  hit: { minWidth: HIT, minHeight: HIT, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
