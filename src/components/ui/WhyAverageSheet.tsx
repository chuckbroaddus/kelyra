import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { radius, type } from '@/constants/theme';
import type { SyllabusAverageResult } from '@/lib/grade/syllabusAverage';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  visible: boolean;
  average: SyllabusAverageResult | null;
  childName?: string | null;
  className?: string | null;
  termLabel?: string | null;
  onClose: () => void;
};

export function WhyAverageSheet({
  visible,
  average,
  childName,
  className,
  termLabel,
  onClose,
}: Props) {
  const { colors, scheme } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={[
          styles.scrim,
          { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.line }]}>
          <ScrollView contentContainerStyle={styles.content}>
            {!average || average.overall == null ? (
              <Text style={[type.body, { color: colors.mute }]}>
                No approved scores yet — there isn’t an average to explain.
              </Text>
            ) : (
              <>
                <Text style={[type.title, { color: colors.ink }]}>
                  Current average: {average.overall}%
                </Text>
                <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>
                  {childName ? `${childName}’s ` : ''}
                  {className ? `${className}` : 'class'}
                  {termLabel ? ` · ${termLabel}` : ''}
                </Text>
                <Text style={[type.body, { color: colors.ink, marginTop: 12 }]}>
                  Each category is averaged, then combined using the class weights.
                </Text>
                {average.renormalized ? (
                  <Text style={[type.meta, { color: colors.warn, marginTop: 8 }]}>
                    Categories with no graded work yet are left out and the other weights are scaled so
                    they still add to 100%.
                  </Text>
                ) : null}
                <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>Contribution</Text>
                {average.categories
                  .filter((c) => c.average != null)
                  .map((c) => (
                    <Text key={c.key} style={[type.body, { color: colors.ink, marginTop: 4 }]}>
                      {c.label} · weight{' '}
                      {c.renormalizedWeightPercent != null
                        ? `${Math.round(c.renormalizedWeightPercent * 10) / 10}%`
                        : `${c.weightPercent}%`}{' '}
                      · avg {Math.round((c.average ?? 0) * 10) / 10}%
                    </Text>
                  ))}
                {average.adjustedNotes.length ? (
                  <>
                    <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>
                      Adjusted by rules
                    </Text>
                    {average.adjustedNotes.map((line) => (
                      <Text key={line} style={[type.body, { color: colors.ink, marginTop: 4 }]}>
                        {line}
                      </Text>
                    ))}
                  </>
                ) : null}
                <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>Counted scores</Text>
                {average.categories.flatMap((c) =>
                  c.contributions
                    .filter((row) => row.role === 'counted')
                    .map((row) => (
                      <Text key={row.assignmentId} style={[type.body, { color: colors.ink, marginTop: 4 }]}>
                        {row.title} · {row.score}% · {c.label}
                      </Text>
                    )),
                )}
                {average.notCounted.length ? (
                  <>
                    <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>Not counted</Text>
                    {average.notCounted.slice(0, 12).map((row) => (
                      <Text key={`${row.assignmentId}-${row.reason}`} style={[type.meta, { color: colors.mute, marginTop: 4 }]}>
                        {row.title} — {row.reason}
                      </Text>
                    ))}
                  </>
                ) : null}
              </>
            )}
            <GhostButton align="left" label="See all work" onPress={onClose} />
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
    maxHeight: '85%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    paddingBottom: 24,
  },
  content: {
    padding: 16,
    gap: 2,
  },
});
