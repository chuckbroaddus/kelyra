import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { radius, type } from '@/constants/theme';
import { formatCell, type GradeCell } from '@/lib/gradebook/api';
import {
  familyAssignmentRoleLabels,
  type AverageAssignment,
  type SyllabusAverageResult,
} from '@/lib/grade/syllabusAverage';
import { submissionStatusLabel } from '@/lib/assignments/status';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type FamilyAssignmentDetailModel = {
  title: string;
  className?: string | null;
  categoryLabel?: string | null;
  dueAt?: string | null;
  submittedAt?: string | null;
  /** Family-published note only — never Glow/Grow private notes. */
  familyComment?: string | null;
  assignment?: Pick<AverageAssignment, 'id' | 'include_in_average' | 'category'> | null;
  cell: GradeCell;
};

type Props = {
  visible: boolean;
  detail: FamilyAssignmentDetailModel | null;
  average?: SyllabusAverageResult | null;
  onClose: () => void;
};

function formatWhen(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

/** S-G4 / P-G4 own-cell detail. Approved marks only; own work only. */
export function FamilyAssignmentDetail({ visible, detail, average, onClose }: Props) {
  const { colors, scheme } = useTheme();
  if (!detail) return null;

  const roles = familyAssignmentRoleLabels(average, detail.assignment, detail.categoryLabel);
  const status =
    submissionStatusLabel(detail.cell.status) ||
    (detail.cell.status ? String(detail.cell.status) : 'No work yet');
  const mark = formatCell(detail.cell);
  const due = formatWhen(detail.dueAt);
  const submitted = formatWhen(detail.submittedAt);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={[
          styles.scrim,
          { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.line }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[type.title, { color: colors.ink }]}>{detail.title}</Text>
            {detail.className ? (
              <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>{detail.className}</Text>
            ) : null}
            {detail.categoryLabel ? (
              <Text style={[type.meta, { color: colors.mute, marginTop: 2 }]}>
                Category · {detail.categoryLabel}
              </Text>
            ) : null}
            {due ? (
              <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>Due {due}</Text>
            ) : null}
            {submitted ? (
              <Text style={[type.meta, { color: colors.mute }]}>Submitted {submitted}</Text>
            ) : null}
            <Text style={[type.body, { color: colors.ink, marginTop: 12 }]}>Status · {status}</Text>
            <Text style={[type.body, { color: colors.ink, marginTop: 4 }]}>
              Mark · {mark || '—'}
            </Text>
            {detail.familyComment?.trim() ? (
              <Text style={[type.body, { color: colors.ink, marginTop: 12 }]}>
                {detail.familyComment.trim()}
              </Text>
            ) : null}
            {roles.map((role, index) => {
              if (role.kind === 'counts') {
                return (
                  <Text key={`r${index}`} style={[type.meta, { color: colors.ink, marginTop: 12 }]}>
                    Counts toward {role.categoryLabel} average
                  </Text>
                );
              }
              if (role.kind === 'does_not_count') {
                return (
                  <Text key={`r${index}`} style={[type.meta, { color: colors.mute, marginTop: 12 }]}>
                    Does not count toward the class average
                  </Text>
                );
              }
              if (role.kind === 'dropped') {
                return (
                  <Text key={`r${index}`} style={[type.meta, { color: colors.warn, marginTop: 8 }]}>
                    Not counted (dropped as lowest score)
                  </Text>
                );
              }
              if (role.kind === 'replaced') {
                return (
                  <Text key={`r${index}`} style={[type.meta, { color: colors.warn, marginTop: 8 }]}>
                    Replaced by makeup
                  </Text>
                );
              }
              return (
                <Text key={`r${index}`} style={[type.meta, { color: colors.mute, marginTop: 8 }]}>
                  Makeup
                </Text>
              );
            })}
            <GhostButton align="left" label="Close" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 16,
  },
  content: {
    padding: 16,
    gap: 2,
  },
});
