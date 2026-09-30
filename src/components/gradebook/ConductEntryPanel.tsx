/**
 * GB-17 FR-SYL-17 / FR-POST-01 — teacher conduct marks per student (non-GPA).
 * Marks ride on the next period store via postPeriod / postMarkingPeriod.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { type } from '@/constants/theme';
import { DEFAULT_CONDUCT_MARKS } from '@/lib/grade/posting';
import { getBundledHelpTopic } from '@/lib/help/helpTopics';
import { firstName } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type ConductStudent = { id: string; display_name: string };

type Props = {
  students: ConductStudent[];
  /** Current marks by student_id. */
  marks: Record<string, string | null>;
  onChange: (studentId: string, mark: string | null) => void;
  periodLabel?: string | null;
  /** When false, hide (conduct_scale_id null / off). Default true for prototype entry. */
  enabled?: boolean;
};

export function ConductEntryPanel({
  students,
  marks,
  onChange,
  periodLabel,
  enabled = true,
}: Props) {
  const { colors } = useTheme();
  const help = getBundledHelpTopic('help.conduct_mark');
  const options = useMemo(() => [...DEFAULT_CONDUCT_MARKS], []);

  if (!enabled || students.length === 0) return null;

  return (
    <View style={[styles.wrap, { borderColor: colors.line }]}>
      <Text style={[type.meta, { color: colors.ink, fontWeight: '700' }]}>
        Conduct{periodLabel ? ` · ${periodLabel}` : ''}
      </Text>
      {help ? (
        <Text style={[type.meta, { color: colors.mute, marginBottom: 6 }]}>{help.meaning}</Text>
      ) : null}
      {students.map((s) => {
        const cur = marks[s.id] ?? null;
        return (
          <View key={s.id} style={styles.row}>
            <Text style={[type.meta, { color: colors.ink, minWidth: 72 }]} numberOfLines={1}>
              {firstName(s.display_name)}
            </Text>
            <ChipRow>
              {options.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  selected={cur === m}
                  onPress={() => onChange(s.id, cur === m ? null : m)}
                />
              ))}
            </ChipRow>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
});
