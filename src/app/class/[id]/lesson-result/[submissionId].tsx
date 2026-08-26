import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { GhostButton } from '@/components/ui/Button';
import { LessonWorkView } from '@/components/ui/LessonWork';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { getLessonAttempt, lessonDueText } from '@/lib/lessons/api';
import { useAssignmentHeaderChrome } from '@/lib/lessons/chrome';
import { asLessonResult } from '@/lib/lessons/protocol';
import { lessonWorkFromResult, type LessonWork } from '@/lib/lessons/work';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function LessonAttemptScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { submissionId } = useLocalSearchParams<{ id: string; submissionId: string }>();
  useAssignmentHeaderChrome();
  const [title, setTitle] = useState('Lesson');
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [work, setWork] = useState<LessonWork | null>(null);
  const [meta, setMeta] = useState<{ due: string | null; work: string; assignmentId: string | null }>({
    due: null,
    work: 'Assigned',
    assignmentId: null,
  });
  usePushedTitle(title);

  const load = useCallback(() => {
    if (!submissionId) return;
    void getLessonAttempt(submissionId)
      .then((attempt) => {
        if (!attempt) {
          setStatus('That lesson is gone.');
          setReady(true);
          return;
        }
        setTitle(attempt.title);
        setMeta({
          due: lessonDueText(attempt.dueAt),
          work: attempt.workLabel,
          assignmentId: attempt.assignment_id,
        });
        setWork(lessonWorkFromResult(asLessonResult(attempt.answers)));
        setReady(true);
      })
      .catch((err) => {
        setStatus(err instanceof Error ? err.message : 'Could not load the lesson');
        setReady(true);
      });
  }, [submissionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen maxWidth={640}>
      <Text style={[type.meta, { color: colors.mute }]}>Lesson</Text>
      <Text style={[type.title, { color: colors.ink }]}>{title}</Text>
      <Text style={[type.meta, { color: colors.mute }]}>
        {[meta.work, meta.due ? `Due ${meta.due}` : null].filter(Boolean).join(' · ')}
      </Text>
      {status ? <Text style={[type.body, { color: colors.danger }]}>{status}</Text> : null}
      {!ready ? <WorkingLine /> : null}
      {work ? <LessonWorkView work={work} /> : ready && !status ? (
        <Text style={[type.meta, { color: colors.mute }]}>No lesson metrics yet.</Text>
      ) : null}
      {meta.assignmentId ? (
        <GhostButton
          align="left"
          label="Preview"
          onPress={() => router.push(`/lesson/${meta.assignmentId}?preview=1` as never)}
        />
      ) : null}
    </Screen>
  );
}
