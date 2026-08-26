import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PersonTabs } from '@/components/ui/PersonTabs';
import { Screen } from '@/components/ui/Screen';
import { StudentWorkList } from '@/components/ui/StudentWorkList';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import {
  listStudentClasses,
  listStudentTodo,
  loadStudentSession,
  peekStudentClasses,
  peekStudentTodo,
  type StudentClass,
  type StudentSession,
  type StudentTodo,
} from '@/lib/student-session/api';
import { queryParam } from '@/lib/student-session/classes';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function TodoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { contextTab, setContextTab } = useChrome();
  const { profile } = useAuth();
  const { class: classParam } = useLocalSearchParams<{ class?: string }>();
  const [classId, setClassId] = useState(() => queryParam(classParam) || 'all');
  const [session, setSession] = useState<StudentSession | null>(null);
  const [items, setItems] = useState<StudentTodo[]>(() => peekStudentTodo() ?? []);
  const [classes, setClasses] = useState<StudentClass[]>(() => peekStudentClasses() ?? []);
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const pane = contextTab === 'done' ? 'done' : 'todo';

  const load = useCallback(async () => {
    const next = await loadStudentSession();
    setSession(next);
    if (!next) {
      setItems([]);
      setClasses([]);
      return;
    }
    const [todo, rooms] = await Promise.all([listStudentTodo(), listStudentClasses().catch(() => [])]);
    setItems(todo);
    setClasses(rooms);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void load()
        .then(() => {
          if (live) setStatus(null);
        })
        .catch((err) => {
          if (live) setStatus(err instanceof Error ? err.message : 'Could not load assignments');
        })
        .finally(() => {
          if (live) setReady(true);
        });
      return () => {
        live = false;
      };
    }, [load]),
  );

  const open = (item: StudentTodo) => {
    if (item.kind === 'lesson') {
      router.push(`/lesson/${item.assignmentId}` as never);
      return;
    }
    if (item.kind === 'practice') {
      router.push(`/todo/${item.submissionId}` as never);
    }
  };

  const setClass = (id: string | 'all') => {
    setClassId(id);
    router.setParams({ class: id } as never);
  };

  if (!ready && !items.length) {
    return (
      <Screen maxWidth={640} centered>
        <WorkingLine />
      </Screen>
    );
  }

  if (!session && !items.length) {
    return (
      <Screen maxWidth={640} centered>
        {status ? (
          <Text style={[styles.lead, { color: colors.danger }]}>{status}</Text>
        ) : (
          <Text style={[styles.lead, { color: colors.mute }]}>
            {profile?.role === 'student'
              ? 'This login is not assigned to a roster name yet. Ask your teacher to assign it on your student page.'
              : 'Sign in with the login your school assigned.'}
          </Text>
        )}
      </Screen>
    );
  }

  return (
    <Screen maxWidth={720}>
      <PersonTabs
        stacked={classes.length > 1 || classId !== 'all'}
        tabs={[
          { key: 'todo', label: 'To Do', icon: 'practice' },
          { key: 'done', label: 'Done', icon: 'statusCompleted' },
        ]}
        value={pane}
        onChange={(key) => setContextTab(key)}
      />
      <StudentWorkList
        items={items}
        classes={classes}
        pane={pane}
        classId={classId}
        onClassId={setClass}
        onOpen={open}
        empty={
          pane === 'done'
            ? 'Nothing turned in yet.'
            : 'Nothing to do yet. Your teacher will assign work here.'
        }
      />
      {status ? <Text style={[styles.error, { color: colors.danger }]}>{status}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    ...type.body,
    textAlign: 'center',
  },
  error: {
    ...type.meta,
    marginTop: 12,
  },
});
