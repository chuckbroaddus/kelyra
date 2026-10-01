/**
 * PeriodFilterBar.tsx (GB-04)
 * All + calendar period glyphs, rendered through the standard PersonTabs row so it
 * shares the app-wide tab motion (linear morph, slow scroll-to-selected) and
 * label clipping/marquee instead of a bespoke ScrollView.
 */
import React, { useMemo } from 'react';
import { PersonTabs, type PersonTab } from './PersonTabs';
import { PeriodGlyph } from './PeriodGlyph';
import { PERSON_TAB_GLYPH } from './personTabsLayout';
import { glyphsForCalendar, type GradingCalendar } from './periodGlyphs';

export type PeriodFilterBarProps = {
  calendar: GradingCalendar;
  selectedPeriodId: string;
  showInterims?: boolean;
  onSelect: (periodId: string) => void;
  stacked?: boolean;
};

export function PeriodFilterBar({ calendar, selectedPeriodId = 'all', onSelect, stacked }: PeriodFilterBarProps) {
  const tabs = useMemo<PersonTab[]>(
    () =>
      glyphsForCalendar(calendar).map((g) => ({
        key: g.id,
        label: g.label,
        glyph: (selected: boolean) => (
          <PeriodGlyph
            id={g.id}
            startDeg={g.startDeg}
            sweepDeg={g.sweepDeg}
            state={selected ? 'selected' : 'idle'}
            size={PERSON_TAB_GLYPH}
          />
        ),
      })),
    [calendar],
  );
  return <PersonTabs tabs={tabs} value={selectedPeriodId} onChange={onSelect} stacked={stacked} />;
}
