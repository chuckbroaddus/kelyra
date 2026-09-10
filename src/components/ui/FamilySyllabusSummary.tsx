import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { type } from '@/constants/theme';
import type { PublishedFamilySyllabus } from '@/lib/syllabus/api';
import type { SyllabusAverageResult } from '@/lib/grade/syllabusAverage';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  syllabus: PublishedFamilySyllabus;
  average?: SyllabusAverageResult | null;
  ruleLines?: string[];
  childName?: string | null;
  className?: string | null;
  /** Home / P-H2: category labels + weights only. */
  compact?: boolean;
};

export function FamilySyllabusSummary({
  syllabus,
  average,
  ruleLines = [],
  childName,
  className,
  compact = false,
}: Props) {
  const { colors } = useTheme();

  if (!syllabus.published) {
    if (compact) return null;
    return (
      <Card>
        <Text style={[type.body, { color: colors.ink }]}>How grades work</Text>
        <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>
          Your teacher has not published how categories count yet.
        </Text>
      </Card>
    );
  }

  const categories = syllabus.categories ?? [];

  if (compact) {
    if (!categories.length) return null;
    return (
      <View style={styles.compact}>
        <Text style={[type.meta, { color: colors.mute }]}>How grades work</Text>
        {categories.map((row) => (
          <Text key={row.key} style={[type.meta, { color: colors.ink }]}>
            {row.label} · {row.weight_percent}%
          </Text>
        ))}
      </View>
    );
  }

  return (
    <Card>
      <Text style={[type.body, { color: colors.ink }]}>
        {className ? `${className} · How grades work` : 'How grades work'}
      </Text>
      {childName ? (
        <Text style={[type.meta, { color: colors.mute }]}>Showing {childName}</Text>
      ) : null}
      <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>Categories</Text>
      {categories.map((row) => {
        const catAvg = average?.categories.find((c) => c.key === row.key);
        return (
          <View key={row.key} style={styles.row}>
            <Text style={[type.body, { color: colors.ink, flex: 1 }]}>{row.label}</Text>
            <Text style={[type.meta, { color: colors.mute }]}>
              {row.weight_percent}% of the class grade
              {catAvg?.average != null ? ` · avg ${Math.round(catAvg.average * 10) / 10}%` : ' · —'}
            </Text>
          </View>
        );
      })}
      {ruleLines.length ? (
        <>
          <Text style={[type.meta, { color: colors.mute, marginTop: 10 }]}>Special rules</Text>
          {ruleLines.map((line) => (
            <Text key={line} style={[type.meta, { color: colors.ink }]}>
              {line}
            </Text>
          ))}
        </>
      ) : null}
      <Text style={[type.meta, { color: colors.mute, marginTop: 10 }]}>
        Only scores your teacher has approved appear here.
      </Text>
      {average?.disclosures.map((line) => (
        <Text key={line} style={[type.meta, { color: colors.warn, marginTop: 4 }]}>
          {line}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 6,
    gap: 2,
  },
  compact: {
    marginTop: 6,
    gap: 2,
  },
});
