import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { listInbox, listTurnedIn } from '@/lib/captures/api';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { formatWhen } from '@/lib/format';
import { loadParentProgress } from '@/lib/parents/api';
import { touchParentLastSeen } from '@/lib/parents/session';
import { listRoster } from '@/lib/students/api';
import { listStudentTodo } from '@/lib/student-session/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Note = {
  id: string;
  title: string;
  status: string;
  avatar: string;
  photoUrl?: string | null;
  href: string;
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const router = useRouter();
  const [rows, setRows] = useState<Note[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          if (chrome.role === 'teacher' && chrome.classId) {
            const [inbox, turned, roster] = await Promise.all([
              listInbox(chrome.classId),
              listTurnedIn(chrome.classId),
              listRoster(chrome.classId),
            ]);
            const photoByStudent = new Map(roster.map((row) => [row.id, row.photoUrl]));
            const next: Note[] = [
              ...inbox.map((item) =>
                item.student_id
                  ? {
                      id: item.id,
                      title: item.matchedName ?? 'Student',
                      status: 'Ready to review',
                      avatar: item.matchedName ?? 'Student',
                      photoUrl: photoByStudent.get(item.student_id) ?? item.photoUrl,
                      href: `/class/${item.class_id}/student/${item.student_id}`,
                    }
                  : {
                      id: item.id,
                      title: 'Needs a name',
                      status: formatWhen(item.created_at),
                      avatar: '?',
                      photoUrl: item.photoUrl,
                      href: '/inbox',
                    },
              ),
              ...turned.map((item) => ({
                id: item.id,
                title: item.studentName,
                status: `Turned in ${item.title.replace(/^Practice:\s*/i, '')}`,
                avatar: item.studentName,
                photoUrl: photoByStudent.get(item.studentId) ?? null,
                href: `/class/${chrome.classId}/student/${item.studentId}`,
              })),
            ];
            if (!cancelled) setRows(next);
            return;
          }
          if (chrome.role === 'student' && chrome.studentSession) {
            const todo = await listStudentTodo(
              chrome.studentSession.joinCode,
              chrome.studentSession.studentId,
            );
            if (!cancelled) {
              setRows(
                todo
                  .filter((item) => item.status === 'assigned')
                  .map((item) => ({
                    id: item.submissionId,
                    title: 'New practice',
                    status: item.focusLabel ?? item.title,
                    avatar: chrome.studentSession!.displayName,
                    href: '/todo',
                  })),
              );
            }
            return;
          }
          if (chrome.role === 'parent') {
            await touchParentLastSeen();
            chrome.refreshChrome();
            const notes: Note[] = [];
            for (const child of chrome.parentTokens) {
              const progress = await loadParentProgress(child.token);
              const sentence = progress?.children.find((item) => item.parent_sentence)?.parent_sentence;
              if (sentence) {
                notes.push({
                  id: child.token,
                  title: 'From the teacher',
                  status: sentence.slice(0, 40),
                  avatar: child.displayName,
                  href: `/parent?t=${child.token}`,
                });
              }
            }
            if (!cancelled) setRows(notes);
            return;
          }
          if (!cancelled) setRows([]);
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load');
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [chrome]),
  );

  return (
    <Screen maxWidth={640}>
      {rows === null ? <WorkingLine /> : null}
      {rows && rows.length === 0 ? (
        <Text style={[type.body, { color: colors.mute }]}>Nothing waiting.</Text>
      ) : null}
      {rows?.map((row) => (
        <ListRow
          key={row.id}
          title={row.title}
          status={row.status}
          avatarName={row.avatar}
          photoUrl={row.photoUrl}
          onPress={() => router.push(row.href as never)}
        />
      ))}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    marginTop: 12,
  },
});
