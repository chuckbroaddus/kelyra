import type { IconName } from '@/components/ui/Icon';
import { PersonTabs, type PersonTab } from '@/components/ui/PersonTabs';
import { GRADE_TERM_FILTERS } from '@/lib/grade/marks';

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
};

/** All + Counts toward. Pie-slice glyphs; selected name marquees. */
export function GradeTermTabs({ value, onChange, stacked }: Props) {
  return <PersonTabs tabs={TABS} value={value} onChange={onChange} stacked={stacked} />;
}
