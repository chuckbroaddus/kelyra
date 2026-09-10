import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AvatarTray } from '@/components/ui/AvatarTray';
import { Screen } from '@/components/ui/Screen';
import { StudentGradeBook } from '@/components/ui/StudentGradeBook';
import { StudentClassTabs } from '@/components/ui/StudentWorkList';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { setAskParentChildId } from '@/lib/ask/assignmentGround';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { loadParentProgressMine, type ParentProgress } from '@/lib/parents/api';
import { queryParam } from '@/lib/student-session/classes';
import type { StudentClass } from '@/lib/student-session/classes';
import { listParentChildClasses } from '@/lib/syllabus/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ParentGradesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { child: childParam, class: classParam } = useLocalSearchParams<{
    child?: string;
    class?: string;
  }>();
  const childFromRoute = queryParam(childParam);
  const [progress, setProgress] = useState<ParentProgress | null>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(childFromRoute || null);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [classId, setClassId] = useState(() => queryParam(classParam) || 'all');
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  usePushedTitle('Grades');

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void loadParentProgressMine()
        .then((next) => {
          if (!live) return;
          if (!next) {
            setStatus('No children are linked to this login yet.');
            setProgress(null);
            setReady(true);
            return;
          }
          setProgress(next);
          setActiveChildId((current) => {
            const fromRoute = childFromRoute || null;
            const pick =
              (fromRoute && next.children.some((c) => c.student_id === fromRoute) ? fromRoute : null) ??
              (current && next.children.some((c) => c.student_id === current) ? current : null) ??
              next.children[0]?.student_id ??
              null;
            setAskParentChildId(pick);
            return pick;
          });
          setStatus(null);
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
    }, [childFromRoute]),
  );

  useEffect(() => {
    if (childFromRoute) setActiveChildId(childFromRoute);
  }, [childFromRoute]);

  useEffect(() => {
    let live = true;
    if (!activeChildId) {
      setClasses([]);
      return;
    }
    // F-06: drop prior child's class chips immediately on sibling switch.
    setClasses([]);
    void listParentChildClasses(activeChildId)
      .then((rows) => {
        if (!live) return;
        setClasses(rows.map((row) => ({ classId: row.classId, className: row.className, feedIcon: null })));
      })
      .catch(() => {
        if (live) setClasses([]);
      });
    return () => {
      live = false;
    };
  }, [activeChildId]);

  const child = useMemo(() => {
    if (!progress) return null;
    return (
      progress.children.find((item) => item.student_id === activeChildId) ??
      progress.children[0] ??
      null
    );
  }, [progress, activeChildId]);

  const shownName = child ? child.preferred_name || child.display_name : null;

  const setClass = (id: string) => {
    setClassId(id);
    router.setParams({
      class: id,
      child: activeChildId ?? childFromRoute ?? undefined,
    } as never);
  };

  const switchChild = (id: string) => {
    setActiveChildId(id);
    setAskParentChildId(id);
    setClassId('all');
    router.setParams({ child: id, class: 'all' } as never);
  };

  if (!ready && !progress) {
    return (
      <Screen>
        <WorkingLine />
      </Screen>
    );
  }

  if (!progress || !child || !activeChildId) {
    return (
      <Screen centered maxWidth={480}>
        <Text style={[type.title, { color: colors.ink }]}>Grades</Text>
        <Text style={[styles.lead, { color: colors.mute }]}>
          {status ?? 'No children are linked yet.'}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} maxWidth={1100}>
      {progress.children.length > 1 ? (
        <View style={styles.tray}>
          <AvatarTray
            people={progress.children.map((item) => ({
              id: item.student_id,
              name: item.preferred_name || item.display_name,
              photoUrl: item.photoUrl,
            }))}
            selectedId={activeChildId}
            onPress={(person) => switchChild(person.id)}
          />
        </View>
      ) : null}
      <StudentClassTabs
        classes={classes}
        value={classId}
        onChange={setClass}
        stacked
        all={{ key: 'all', label: 'All', icon: 'grades' }}
      />
      <StudentGradeBook
        key={activeChildId}
        classId={classId}
        studentId={activeChildId}
        childName={shownName}
        photoUrl={child.photoUrl}
      />
      {status ? <Text style={[styles.error, { color: colors.danger }]}>{status}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tray: {
    marginBottom: 8,
    alignItems: 'center',
  },
  lead: {
    ...type.body,
    marginTop: 8,
    textAlign: 'center',
  },
  error: {
    ...type.meta,
    marginTop: 12,
  },
});
