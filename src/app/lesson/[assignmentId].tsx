import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { LessonClose } from '@/components/ui/LessonClose';
import { LessonWebView, type LessonWebViewHandle } from '@/components/ui/LessonWebView';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { openStudentLesson, openTeacherPreview, reportLesson } from '@/lib/lessons/api';
import { EXPIRY_COPY, OFF_ALLOWLIST_COPY } from '@/lib/lessons/allowlist';
import { LESSON_PLAYER_STACK_OPTIONS, useLessonPlayerChrome } from '@/lib/lessons/chrome';
import { isThisVisitComplete, resultFromEvent, type LessonIdentity, type LessonPageEvent } from '@/lib/lessons/protocol';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function LessonPlayerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { profile } = useAuth();
  const { role, setHeaderCloseHandler } = useChrome();
  const { assignmentId, preview } = useLocalSearchParams<{ assignmentId: string; preview?: string }>();
  const isPreview = preview === '1' && profile?.role !== 'student';
  useLessonPlayerChrome();
  const [title, setTitle] = useState('Lesson');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [identity, setIdentity] = useState<LessonIdentity | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [retry, setRetry] = useState<'open' | 'keep' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const resigned = useRef(false);
  const completeLock = useRef(false);
  const leaving = useRef(false);
  const lastEvent = useRef<LessonPageEvent | null>(null);
  const player = useRef<LessonWebViewHandle>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  usePushedTitle(title);

  useLayoutEffect(() => {
    navigation.setOptions({ ...LESSON_PLAYER_STACK_OPTIONS });
  }, [navigation]);

  const load = useCallback(async () => {
    if (!assignmentId) return;
    setStatus(null);
    setRetry(null);
    try {
      const opened = isPreview ? await openTeacherPreview(assignmentId) : await openStudentLesson(assignmentId);
      setDocumentUrl(opened.documentUrl);
      setIdentity(opened.identity);
      setTitle(opened.identity.assignment.title || 'Lesson');
    } catch (err) {
      setDocumentUrl(null);
      setIdentity(null);
      setStatus(err instanceof Error ? err.message : 'Could not open the lesson.');
      setRetry('open');
    }
  }, [assignmentId, isPreview]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistHalt = useCallback(async () => {
    if (isPreview || !assignmentId || completeLock.current) return;
    const event = lastEvent.current;
    if (!event || event.state === 'complete') return;
    try {
      await reportLesson(assignmentId, resultFromEvent({ ...event, state: 'in_progress' }));
    } catch {
      // Leaving anyway; the next Open overwrites the same cell.
    }
  }, [assignmentId, isPreview]);

  const leavePlayer = useCallback(() => {
    if (leaving.current || completeLock.current) return;
    leaving.current = true;
    if (!documentUrl) {
      router.back();
      return;
    }
    player.current?.flushProgress();
    leaveTimer.current = setTimeout(() => {
      leaveTimer.current = null;
      if (completeLock.current) return;
      void persistHalt();
      router.back();
    }, 80);
  }, [documentUrl, persistHalt, router]);

  useEffect(() => {
    setHeaderCloseHandler(leavePlayer);
    return () => setHeaderCloseHandler(null);
  }, [leavePlayer, setHeaderCloseHandler]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      if (completeLock.current) return;
      player.current?.flushProgress();
      void persistHalt();
    });
    return () => {
      unsub();
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, [navigation, persistHalt]);

  const onEvent = async (event: LessonPageEvent) => {
    lastEvent.current = event;
    if (isPreview || !assignmentId) return;
    if (event.state === 'complete') {
      if (!isThisVisitComplete(event)) return;
      if (completeLock.current) return;
      completeLock.current = true;
      try {
        await reportLesson(assignmentId, resultFromEvent(event));
        router.replace('/todo');
      } catch (err) {
        completeLock.current = false;
        leaving.current = false;
        setStatus(err instanceof Error ? err.message : 'Could not save the lesson');
      }
      return;
    }
    try {
      await reportLesson(assignmentId, resultFromEvent(event));
    } catch {
      // In-progress write can wait for the next emit.
    }
  };

  const onBlocked = () => {
    setToast(OFF_ALLOWLIST_COPY);
    setTimeout(() => setToast(null), 3200);
  };

  const onExpired = () => {
    if (!resigned.current) {
      resigned.current = true;
      void load();
      return;
    }
    setStatus(EXPIRY_COPY);
    setRetry('keep');
    setDocumentUrl(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]} collapsable={false}>
      <Stack.Screen options={LESSON_PLAYER_STACK_OPTIONS} />
      {!documentUrl || !identity ? (
        <View style={styles.center}>
          {status ? <Text style={[type.body, { color: colors.danger, textAlign: 'center' }]}>{status}</Text> : <WorkingLine />}
          {retry ? (
            <PrimaryButton
              label="Try again"
              onPress={() => {
                resigned.current = retry === 'open';
                void load();
              }}
            />
          ) : null}
          <GhostButton label="Back" onPress={leavePlayer} />
        </View>
      ) : (
        <LessonWebView
          ref={player}
          documentUrl={documentUrl}
          identity={identity}
          onEvent={(event) => void onEvent(event)}
          onBlocked={onBlocked}
          onExpired={onExpired}
        />
      )}
      {role === 'none' ? <LessonClose onPress={leavePlayer} /> : null}
      {toast ? (
        <View style={[styles.toast, { backgroundColor: colors.elevated, borderColor: colors.line }]}>
          <Text style={[type.body, { color: colors.ink }]}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, maxWidth: 480, alignSelf: 'center', width: '100%' },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 22,
  },
});
