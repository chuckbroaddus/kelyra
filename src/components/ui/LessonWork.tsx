import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';
import {
  outcomeLabel,
  type LessonItemOutcome,
  type LessonWork,
  type LessonWorkItem,
} from '@/lib/lessons/work';

export function LessonWorkView({ work }: { work: LessonWork }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stack}>
      <Card>
        <Text style={[type.title, { color: colors.ink }]}>{work.headline}</Text>
        {work.sessionLine ? (
          <Text style={[type.meta, { color: colors.mute }]}>{work.sessionLine}</Text>
        ) : null}
        {work.struggleSummary ? (
          <Text style={[type.body, { color: colors.ink }]}>{work.struggleSummary}</Text>
        ) : work.status === 'Done' && work.total > 0 ? (
          <Text style={[type.meta, { color: colors.mute }]}>
            No skips, extra tries, or hints recorded.
          </Text>
        ) : null}
        {work.practiceNote ? (
          <View style={[styles.callout, { backgroundColor: colors.warnSoft }]}>
            <Text style={[type.meta, { color: colors.warn }]}>{work.practiceNote}</Text>
          </View>
        ) : null}
      </Card>
      {work.items.map((item, index) => (
        <ItemCard key={item.id} item={item} index={index} />
      ))}
    </View>
  );
}

function ItemCard({ item, index }: { item: LessonWorkItem; index: number }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={styles.itemHead}>
        <Text style={[styles.gutter, { color: colors.mute }]}>{index + 1}.</Text>
        <Text style={[type.rowTitle, styles.prompt, { color: colors.ink }]}>{item.prompt}</Text>
        <ToneFlag label={outcomeLabel(item.outcome)} tone={outcomeTone(item.outcome)} />
      </View>
      <Text style={[type.body, { color: item.answer ? colors.ink : colors.mute }]}>
        {item.answer ? `Their answer: ${item.answer}` : 'No answer'}
      </Text>
      {item.guesses.length ? (
        <Text style={[type.meta, { color: colors.mute }]}>
          Earlier tries: {item.guesses.join(' · ')}
        </Text>
      ) : null}
      {itemFlags(item).length ? (
        <View style={styles.flags}>
          {itemFlags(item).map((flag) => (
            <ToneFlag key={flag.label} label={flag.label} tone={flag.tone} />
          ))}
        </View>
      ) : null}
      {item.note ? <Text style={[type.meta, { color: colors.mute }]}>{item.note}</Text> : null}
    </Card>
  );
}

function itemFlags(item: LessonWorkItem): Array<{ label: string; tone: Tone }> {
  const flags: Array<{ label: string; tone: Tone }> = [];
  if (item.tries > 1) flags.push({ label: `${item.tries} tries`, tone: 'warn' });
  if (item.laterCorrected) flags.push({ label: 'Corrected after a miss', tone: 'warn' });
  if (item.hints === 1) flags.push({ label: '1 hint', tone: 'warn' });
  else if (item.hints > 1) flags.push({ label: `${item.hints} hints`, tone: 'warn' });
  return flags;
}

type Tone = 'good' | 'warn' | 'danger' | 'mute';

function outcomeTone(outcome: LessonItemOutcome): Tone {
  if (outcome === 'correct') return 'good';
  if (outcome === 'incorrect') return 'danger';
  if (outcome === 'skipped') return 'warn';
  return 'mute';
}

function ToneFlag({ label, tone }: { label: string; tone: Tone }) {
  const { colors } = useTheme();
  const paint: Record<Tone, { backgroundColor: string; color: string }> = {
    good: { backgroundColor: colors.goodSoft, color: colors.good },
    warn: { backgroundColor: colors.warnSoft, color: colors.warn },
    danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
    mute: { backgroundColor: colors.wash, color: colors.mute },
  };
  const ink = paint[tone];
  return (
    <View style={[styles.flag, { backgroundColor: ink.backgroundColor }]}>
      <Text style={[styles.flagLabel, { color: ink.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  callout: {
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  gutter: {
    ...type.meta,
    width: 22,
    flexShrink: 0,
    paddingTop: 2,
  },
  prompt: {
    flex: 1,
    minWidth: 0,
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  flag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  flagLabel: {
    ...type.badge,
  },
});
