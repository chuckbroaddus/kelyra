import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FeedPane } from '@/components/ui/FeedPane';
import { ListRow } from '@/components/ui/ListRow';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { Screen } from '@/components/ui/Screen';
import { StudentPersonSheet } from '@/components/ui/StudentPersonSheet';
import { StudentGradeBook } from '@/components/ui/StudentGradeBook';
import { StudentClassTabs, StudentWorkList } from '@/components/ui/StudentWorkList';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';
import { asFeedIcon, DEFAULT_CLASS_FEED_ICON } from '@/lib/feeds/icons';
import { listMessageableIds, openThread } from '@/lib/messages/api';
import { isMessageable } from '@/lib/messages/permission';
import { queryParam } from '@/lib/student-session/classes';
import {
  listStudentClasses,
  listStudentPeople,
  listStudentTodo,
  peekStudentClasses,
  peekStudentPeople,
  peekStudentTodo,
  studentPhotoUrls,
  type StudentClass,
  type StudentPerson,
  type StudentTodo,
} from '@/lib/student-session/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Pane = 'feed' | 'students' | 'assignments' | 'grades';
type WorkPane = 'todo' | 'done';

function asPane(value: string): Pane {
  return value === 'students' || value === 'assignments' || value === 'grades' ? value : 'feed';
}

export default function StudentClassScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const chrome = useOptionalChrome();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ class?: string; pane?: string; work?: string }>();
  const [classes, setClasses] = useState<StudentClass[]>(() => peekStudentClasses() ?? []);
  const [items, setItems] = useState<StudentTodo[]>(() => peekStudentTodo() ?? []);
  const [people, setPeople] = useState<StudentPerson[]>(() => peekStudentPeople() ?? []);
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [peer, setPeer] = useState<StudentPerson | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(() => peekStudentClasses() != null);
  const [classId, setClassId] = useState(() => queryParam(params.class));
  const [pane, setPane] = useState<Pane>(() => asPane(queryParam(params.pane)));
  const [workPane, setWorkPane] = useState<WorkPane>(() => (queryParam(params.work) === 'done' ? 'done' : 'todo'));
  const [feedOpened, setFeedOpened] = useState(() => asPane(queryParam(params.pane)) === 'feed');
  const [messageable, setMessageable] = useState<Set<string>>(() => new Set());
  const current = classes.find((row) => row.classId === classId) ?? classes[0] ?? null;

  const load = useCallback(async () => {
    const [rooms, todo, roster, allowed] = await Promise.all([
      listStudentClasses(),
      listStudentTodo(),
      listStudentPeople(),
      listMessageableIds().catch(() => new Set<string>()),
    ]);
    setClasses(rooms);
    setItems(todo);
    setPeople(roster);
    setMessageable(allowed);
    setPhotos(await studentPhotoUrls(roster));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void load()
        .then(() => {
          if (live) setStatus(null);
        })
        .catch((err) => {
          if (live) setStatus(err instanceof Error ? err.message : 'Could not load class');
        })
        .finally(() => {
          if (live) setReady(true);
        });
      return () => {
        live = false;
      };
    }, [load]),
  );

  const go = (next: { class?: string; pane?: Pane; work?: WorkPane }) => {
    const room = next.class ?? current?.classId ?? classId;
    const view = next.pane ?? pane;
    const work = next.work ?? workPane;
    if (next.class != null) setClassId(next.class);
    if (next.pane != null) {
      setPane(next.pane);
      if (next.pane === 'feed') setFeedOpened(true);
    }
    if (next.work != null) setWorkPane(next.work);
    router.setParams({ class: room, pane: view, work } as never);
  };

  const students = useMemo(
    () => people.filter((row) => row.kind === 'classmate' && row.classId === (current?.classId ?? classId)),
    [people, current?.classId, classId],
  );

  const openWork = (item: StudentTodo) => {
    if (item.kind === 'lesson') router.push(`/lesson/${item.assignmentId}` as never);
    else if (item.kind === 'practice') router.push(`/todo/${item.submissionId}` as never);
  };

  const message = async (person: StudentPerson) => {
    if (!profile?.id || !isMessageable(person.profileId, messageable)) return;
    try {
      const threadId = await openThread(profile.id, person.profileId);
      setPeer(null);
      router.push(`/messages/${threadId}` as never);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not open a message');
    }
  };

  if (!ready && !classes.length) {
    return (
      <Screen>
        <WorkingLine />
      </Screen>
    );
  }

  if (!classes.length) {
    return (
      <Screen maxWidth={640} centered>
        <Text style={[type.body, { color: colors.mute }]}>You are not in a class yet.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} maxWidth={720}>
      <View style={styles.tabs}>
        <StudentClassTabs
          classes={classes}
          value={current?.classId ?? classId}
          onChange={(id) => go({ class: id })}
          stacked
        />
        <PersonTabs
          stacked={pane === 'assignments' || pane === 'grades'}
          tabs={[
            { key: 'feed', label: 'Feed', icon: asFeedIcon(current?.feedIcon, DEFAULT_CLASS_FEED_ICON) },
            { key: 'students', label: 'Students', icon: 'setup' },
            { key: 'assignments', label: 'Assignments', icon: 'work' },
            { key: 'grades', label: 'Grades', icon: 'grades' },
          ]}
          value={pane}
          onChange={(key) => go({ pane: key as Pane })}
        />
        {pane === 'assignments' ? (
          <PersonTabs
            tabs={[
              { key: 'todo', label: 'To Do', icon: 'practice' },
              { key: 'done', label: 'Done', icon: 'statusCompleted' },
            ]}
            value={workPane}
            onChange={(key) => go({ work: key as WorkPane })}
          />
        ) : null}
      </View>
      <View
        style={pane === 'feed' ? styles.feedOn : styles.feedOff}
        pointerEvents={pane === 'feed' ? 'auto' : 'none'}
      >
        {feedOpened && current ? <FeedPane fill classId={current.classId} scope="class" /> : null}
      </View>
      {pane === 'grades' && current ? (
        <View style={styles.pane}>
          <StudentGradeBook classId={current.classId} />
        </View>
      ) : pane !== 'feed' ? (
        <ScrollView
          style={styles.pane}
          contentContainerStyle={styles.paneBody}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={chrome?.onScroll}
        >
          {pane === 'students' ? (
            students.length ? (
              students.map((person) => (
                <ListRow
                  key={`${person.id}:${person.classId}`}
                  title={person.displayName}
                  status={person.className ?? undefined}
                  avatarName={person.displayName}
                  photoUrl={photos[person.id]}
                  onPress={() => setPeer(person)}
                />
              ))
            ) : (
              <Text style={[styles.empty, { color: colors.mute }]}>No classmates in this class yet.</Text>
            )
          ) : null}
          {pane === 'assignments' && current ? (
            <StudentWorkList
              items={items}
              classes={classes}
              pane={workPane}
              classId={current.classId}
              onClassId={() => {}}
              onOpen={openWork}
              hideClassChips
              empty={workPane === 'done' ? 'Nothing turned in yet.' : 'Nothing to do in this class.'}
            />
          ) : null}
          {status ? <Text style={[type.meta, { color: colors.danger }]}>{status}</Text> : null}
        </ScrollView>
      ) : null}
      {pane === 'feed' && status ? <Text style={[type.meta, { color: colors.danger }]}>{status}</Text> : null}
      <StudentPersonSheet
        name={peer?.displayName ?? null}
        photoUrl={peer ? photos[peer.id] : null}
        detail={peer?.className ? `In ${peer.className}.` : ''}
        canMessage={isMessageable(peer?.profileId, messageable)}
        onMessage={() => peer && void message(peer)}
        onClose={() => setPeer(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexShrink: 0,
  },
  empty: {
    ...type.body,
    marginTop: 16,
  },
  feedOn: {
    flex: 1,
    minHeight: 0,
  },
  feedOff: {
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  pane: {
    flex: 1,
    minHeight: 0,
  },
  paneBody: {
    paddingBottom: 24,
  },
});
