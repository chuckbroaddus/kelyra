import { StyleSheet, Text, View } from 'react-native';

import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type TeacherPhase = 1 | 2 | 3 | 4;

const PHASES: Record<TeacherPhase, { kicker: string; title: string; body: string }> = {
  1: {
    kicker: 'Phase 1 · Setup',
    title: 'Class & students',
    body: 'Name the class so AI knows the subject. Add students. Share a join code.',
  },
  2: {
    kicker: 'Phase 2 · Daily',
    title: 'Photograph, review, assign',
    body: 'Capture work, put a name on it, approve the gap, then give a short practice set.',
  },
  3: {
    kicker: 'Phase 3 · Records',
    title: 'Grade book & progress',
    body: 'Approved work and assigned practice. Names stay put while you scan the grid.',
  },
  4: {
    kicker: 'Phase 4 · Family',
    title: 'A note home',
    body: 'Students and parents see the focus skill and whether practice is done. No grade book.',
  },
};

export function PhaseBanner({
  phase,
  compact,
  detail,
}: {
  phase: TeacherPhase;
  compact?: boolean;
  detail?: string;
}) {
  const { colors } = useTheme();
  const copy = PHASES[phase];
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <Text style={[styles.kicker, { color: colors.brand }]}>{copy.kicker}</Text>
      <Text style={[styles.body, { color: colors.mute }]}>{detail ?? copy.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
    marginBottom: 8,
    gap: 4,
  },
  compact: {
    marginTop: 20,
    marginBottom: 4,
  },
  kicker: {
    ...type.section,
    textTransform: 'uppercase',
  },
  body: type.meta,
});
