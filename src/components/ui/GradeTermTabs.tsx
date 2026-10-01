import type { IconName } from '@/components/ui/Icon';
import { PersonTabs, type PersonTab } from '@/components/ui/PersonTabs';
import { GRADE_TERM_FILTERS } from '@/lib/grade/marks';
import { PeriodFilterBar } from './PeriodFilterBar';
import type { GradingCalendar } from './periodGlyphs';

const TERM_ICONS: Record<(typeof GRADE_TERM_FILTERS)[number]['key'], IconName> = {
  all: 'termAll',
  q1: 'termQ1',
  q2: 'termQ2',
  q3: 'termQ3',
  q4: 'termQ4',
  s1: 'termS1',
  s2: 'termS2',
  year: 'termYear',
};

const TABS: PersonTab[] = GRADE_TERM_FILTERS.map((term) => ({
  key: term.key,
  label: term.label,
  icon: TERM_ICONS[term.key],
}));

type Props = {
  value: string;
  onChange: (key: string) => void;
  stacked?: boolean;
  /** When present (from class calendar), renders generated PeriodFilterBar per GB-04 / SRS §5.10.
   *  With no calendar, must emit exactly same keys+look as today (legacy path kept for compat).
   */
  calendar?: GradingCalendar;
  /** Phone landscape gradebook: equal-width period tabs span the full row. */
  distribute?: boolean;
};

/** All + Counts toward. When calendar, uses SVG glyphs; else legacy PNG icons via PersonTabs. */
export function GradeTermTabs({ value, onChange, stacked, calendar, distribute }: Props) {
  if (calendar) {
    return (
      <PeriodFilterBar
        calendar={calendar}
        selectedPeriodId={value}
        onSelect={onChange}
        stacked={stacked}
        distribute={distribute}
      />
    );
  }
  return <PersonTabs tabs={TABS} value={value} onChange={onChange} stacked={stacked} distribute={distribute} />;
}
