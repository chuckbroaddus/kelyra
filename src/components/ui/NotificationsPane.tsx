import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { listInbox, listTurnedIn } from '@/lib/captures/api';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { formatWhen } from '@/lib/format';
import { loadParentProgress } from '@/lib/parents/api';
import { touchParentLastSeen } from '@/lib/parents/session';
import { dismissAlert, listAlertsForMe } from '@/lib/posts/api';
import { isOfficeRole } from '@/lib/school/roles';
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
  dismissable?: boolean;
};

export function NotificationsPane() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const { profile } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Note[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const alerts = await listAlertsForMe();
    const alertRows: Note[] = alerts.map((item) => ({
      id: item.id,
      title: item.title,
      status: `${item.status} · ${formatWhen(item.createdAt)}`,
      avatar: 'Alert',
      href: `/notifications/${item.id}`,
      dismissable: true,
    }));

    const classId = chrome.classId;
    const classroomBell = chrome.role === 'teacher' && !isOfficeRole(profile) && Boolean(classId);
    if (classroomBell && classId) {
      const [inbox, turned, roster] = await Promise.all([
        listInbox(classId),
        listTurnedIn(classId),
        listRoster(classId),
      ]);
      const photoByStudent = new Map(roster.map((row) => [row.id, row.photoUrl]));
      const work: Note[] = [
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
          href: `/class/${classId}/student/${item.studentId}`,
        })),
      ];
      return [...alertRows, ...work];
    }

    if (chrome.role === 'student' && chrome.studentSession) {
      const todo = await listStudentTodo();
      const practice = todo
        .filter((item) => item.status === 'assigned')
        .map((item) => ({
          id: item.submissionId,
          title: 'New practice',
          status: item.focusLabel ?? item.title,
          avatar: chrome.studentSession!.displayName,
          href: '/todo',
        }));
      return [...alertRows, ...practice];
    }

    if (chrome.role === 'parent') {
      await touchParentLastSeen();
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
      return [...alertRows, ...notes];
    }

    return alertRows;
  }, [chrome.role, chrome.classId, chrome.studentSession, chrome.parentTokens, profile]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void load()
        .then((next) => {
          if (!cancelled) setRows(next);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load');
        });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const onDismiss = async (id: string) => {
    setRows((current) => current?.filter((row) => row.id !== id) ?? current);
    try {
      await dismissAlert(id);
      chrome.refreshChrome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not dismiss');
      void load()
        .then(setRows)
        .catch(() => undefined);
    }
  };

  return (
    <>
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
          onPress={() => {
            if (row.dismissable) chrome.acknowledgeAlert(row.id);
            router.push(row.href as never);
          }}
          trailing={
            row.dismissable
              ? [
                  {
                    key: 'dismiss',
                    label: 'Dismiss',
                    tone: 'wash',
                    autoCommit: true,
                    onPress: () => void onDismiss(row.id),
                  },
                ]
              : []
          }
        />
      ))}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    marginTop: 12,
  },
});
