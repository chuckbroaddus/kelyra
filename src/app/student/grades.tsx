import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { StudentGradeBook } from '@/components/ui/StudentGradeBook';
import { StudentClassTabs } from '@/components/ui/StudentWorkList';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { listStudentClasses, peekStudentClasses, type StudentClass } from '@/lib/student-session/api';
import { queryParam } from '@/lib/student-session/classes';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function StudentGradesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { class: classParam } = useLocalSearchParams<{ class?: string }>();
  const [classes, setClasses] = useState<StudentClass[]>(() => peekStudentClasses() ?? []);
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(() => peekStudentClasses() != null);
  const [classId, setClassId] = useState(() => queryParam(classParam) || 'all');

  const load = useCallback(async () => {
    const nextClasses = await listStudentClasses().catch(() => [] as StudentClass[]);
    setClasses(nextClasses);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void load()
        .then(() => {
          if (live) setStatus(null);
        })
        .catch((err) => {
          if (live) setStatus(err instanceof Error ? err.message : 'Could not load grades');
        })
        .finally(() => {
          if (live) setReady(true);
        });
      return () => {
        live = false;
      };
    }, [load]),
  );

  const setClass = (id: string) => {
    setClassId(id);
    router.setParams({ class: id } as never);
  };

  if (!ready && !classes.length) {
    return (
      <Screen>
        <WorkingLine />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} maxWidth={1100}>
      <StudentClassTabs
        classes={classes}
        value={classId}
        onChange={setClass}
        stacked
        all={{ key: 'all', label: 'All', icon: 'grades' }}
      />
      <StudentGradeBook classId={classId} />
      {status ? <Text style={[styles.error, { color: colors.danger }]}>{status}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.meta,
    marginTop: 12,
  },
});
