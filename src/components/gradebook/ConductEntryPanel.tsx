/**
 * GB-17 FR-SYL-17 / FR-POST-01 — teacher conduct marks per student (non-GPA).
 * Parent persists each tap to class_conduct_marks; postMarkingPeriod merges them at store.
 *
 * Term label stays pinned with the period filter (parent chrome). Help copy lives above the
 * filter row in gradebook.tsx collapsing chrome — not here.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { gradebookStudentAvatarSize } from '@/constants/table';
import { type } from '@/constants/theme';
import { DEFAULT_CONDUCT_MARKS } from '@/lib/grade/posting';
import { firstName } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type ConductStudent = {
  id: string;
  display_name: string;
  photoUrl?: string | null;
};

type Props = {
  students: ConductStudent[];
  /** Current marks by student_id. */
  marks: Record<string, string | null>;
  onChange: (studentId: string, mark: string | null) => void;
  /** Configured grading-term name only (no "Conduct" prefix). */
  periodLabel?: string | null;
  /** When false, hide (conduct_scale_id null / off). Default true for prototype entry. */
  enabled?: boolean;
};

/** Landscape gradebook column-header avatar size (PR #377). Shared with Gradebook + Heatmap heads. */
export const CONDUCT_STUDENT_AVATAR_SIZE = gradebookStudentAvatarSize;

export function ConductEntryPanel({
  students,
  marks,
  onChange,
  periodLabel,
  enabled = true,
}: Props) {
  const { colors } = useTheme();
  const options = useMemo(() => [...DEFAULT_CONDUCT_MARKS], []);
  const term = periodLabel?.trim() ? periodLabel.trim() : null;

  if (!enabled || students.length === 0) return null;

  return (
    <View style={[styles.wrap, { borderColor: colors.line }]} testID="conduct-entry-panel">
      {term ? (
        <Text
          style={[type.meta, styles.term, { color: colors.ink }]}
          testID="conduct-period-label"
          accessibilityRole="header"
        >
          {term}
        </Text>
      ) : null}
      {students.map((s) => {
        const cur = marks[s.id] ?? null;
        const name = firstName(s.display_name);
        return (
          <View key={s.id} style={styles.row} testID={`conduct-student-row-${s.id}`}>
            <View style={styles.identity}>
              <Avatar
                name={s.display_name}
                photoUrl={s.photoUrl}
                size={CONDUCT_STUDENT_AVATAR_SIZE}
                recyclingKey={`conduct:${s.id}:${s.photoUrl ?? ''}`}
              />
              <Text style={[type.meta, styles.name, { color: colors.ink }]} numberOfLines={1}>
                {name}
              </Text>
            </View>
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
  term: {
    fontWeight: '700',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 96,
    flexShrink: 1,
  },
  name: {
    minWidth: 48,
    flexShrink: 1,
  },
});
