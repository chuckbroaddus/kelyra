import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatPracticeStatus, loadParentProgress, type ParentProgress } from '@/lib/parents/api';
import { useFocusEffect } from 'expo-router';

export default function ParentScreen() {
  const { t } = useLocalSearchParams<{ t?: string }>();
  const [progress, setProgress] = useState<ParentProgress | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!t) {
        setStatus('This page needs an invite link from the teacher.');
        return;
      }
      void loadParentProgress(t)
        .then((next) => {
          setProgress(next);
          if (!next) setStatus('This invite is not valid.');
        })
        .catch((err) => {
          setStatus(err instanceof Error ? err.message : 'Could not load progress');
        });
    }, [t]),
  );

  if (!progress) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.body}>{status ?? 'Loading…'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{progress.displayName}</Text>
      <Text style={styles.body}>{progress.className}</Text>
      <Text style={styles.section}>Focus skill</Text>
      <Text style={styles.body}>{progress.focusLabel ?? 'None yet'}</Text>
      <Text style={styles.section}>Practice</Text>
      <Text style={styles.body}>{formatPracticeStatus(progress.practiceStatus)}</Text>
      {progress.sentence ? (
        <>
          <Text style={styles.section}>From the teacher</Text>
          <Text style={styles.body}>{progress.sentence}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 10,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.8,
  },
});
