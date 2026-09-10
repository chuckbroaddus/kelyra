import { StyleSheet, Text, View } from 'react-native';

import { type } from '@/constants/theme';
import type { MissingUpcomingItem } from '@/lib/grade/syllabusAverage';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  missing: MissingUpcomingItem[];
  upcoming?: MissingUpcomingItem[];
  /** Home P-H2: Missing:N only when N>0; no full lists. */
  compact?: boolean;
};

/** P-M1: Missing (due) vs Not due / Upcoming. Not-due never labeled Missing. */
export function MissingUpcomingStrip({ missing, upcoming = [], compact = false }: Props) {
  const { colors } = useTheme();

  if (compact) {
    if (!missing.length) return null;
    return (
      <Text style={[type.meta, { color: colors.warn, marginTop: 4 }]}>
        Missing: {missing.length}
      </Text>
    );
  }

  if (!missing.length && !upcoming.length) return null;

  return (
    <View style={styles.block}>
      {missing.length ? (
        <View style={styles.group}>
          <Text style={[type.meta, { color: colors.warn }]}>Missing ({missing.length})</Text>
          {missing.map((row) => (
            <Text key={row.assignmentId} style={[type.body, { color: colors.ink }]}>
              {row.title}
            </Text>
          ))}
        </View>
      ) : null}
      {upcoming.length ? (
        <View style={styles.group}>
          <Text style={[type.meta, { color: colors.mute }]}>Not due yet ({upcoming.length})</Text>
          {upcoming.map((row) => (
            <Text key={row.assignmentId} style={[type.body, { color: colors.ink }]}>
              {row.title}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 8,
    gap: 8,
  },
  group: {
    gap: 2,
  },
});
