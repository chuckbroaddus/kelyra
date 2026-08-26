import { StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { asSubmissionStatus } from '@/lib/assignments/status';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type BadgeVariant =
  | 'draft'
  | 'approved'
  | 'focus'
  | 'unassigned'
  | 'note'
  | 'assigned'
  | 'started'
  | 'completed'
  | 'graded'
  | 'done'
  | 'turned';

const labels: Record<BadgeVariant, string> = {
  draft: 'Review',
  approved: 'Approved',
  focus: 'Focus',
  unassigned: 'Needs a name',
  note: 'Note',
  assigned: 'Assigned',
  started: 'Started',
  completed: 'Completed',
  graded: 'Graded',
  done: 'Done',
  turned: 'Turned in',
};

export function captureBadge(status: string): BadgeVariant {
  if (status === 'unassigned') return 'unassigned';
  if (status === 'approved') return 'approved';
  if (status === 'note_only') return 'note';
  return 'draft';
}

export function practiceBadge(status: string): BadgeVariant {
  const next = asSubmissionStatus(status);
  if (next === 'started') return 'started';
  if (next === 'completed') return 'completed';
  if (next === 'graded') return 'graded';
  return 'assigned';
}

export function Badge({ variant }: { variant: BadgeVariant }) {
  const { colors } = useTheme();
  const tones: Record<BadgeVariant, { backgroundColor: string; color: string }> = {
    draft: { backgroundColor: colors.warnSoft, color: colors.warn },
    approved: { backgroundColor: colors.goodSoft, color: colors.good },
    focus: { backgroundColor: colors.brandSoft, color: colors.focus },
    unassigned: { backgroundColor: colors.warnSoft, color: colors.warn },
    note: { backgroundColor: colors.wash, color: colors.mute },
    assigned: { backgroundColor: colors.warnSoft, color: colors.warn },
    started: { backgroundColor: colors.warnSoft, color: colors.warn },
    completed: { backgroundColor: colors.warnSoft, color: colors.warn },
    graded: { backgroundColor: colors.goodSoft, color: colors.good },
    done: { backgroundColor: colors.goodSoft, color: colors.good },
    turned: { backgroundColor: colors.warnSoft, color: colors.warn },
  };
  const tone = tones[variant];
  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.label, { color: tone.color }]} numberOfLines={1}>
        {labels[variant]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  label: type.badge,
});
