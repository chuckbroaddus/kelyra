import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { studentRoomTabs } from '@/components/ui/StudentWorkList';
import { Screen } from '@/components/ui/Screen';
import { StudentPersonSheet } from '@/components/ui/StudentPersonSheet';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { listMessageableIds, openThread } from '@/lib/messages/api';
import { isMessageable } from '@/lib/messages/permission';
import { queryParam } from '@/lib/student-session/classes';
import {
  listStudentClasses,
  listStudentPeople,
  peekStudentClasses,
  peekStudentPeople,
  studentPhotoUrls,
  type StudentClass,
  type StudentPerson,
} from '@/lib/student-session/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function StudentPeopleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [classes, setClasses] = useState<StudentClass[]>(() => peekStudentClasses() ?? []);
  const [people, setPeople] = useState<StudentPerson[]>(() => peekStudentPeople() ?? []);
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [peer, setPeer] = useState<StudentPerson | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(() => peekStudentPeople() != null);
  const [tab, setTab] = useState(() => queryParam(tabParam) || 'all');
  const [messageable, setMessageable] = useState<Set<string>>(() => new Set());

  const load = useCallback(async () => {
    const [rooms, roster, allowed] = await Promise.all([
      listStudentClasses().catch(() => []),
      listStudentPeople(),
      listMessageableIds().catch(() => new Set<string>()),
    ]);
    setClasses(rooms);
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
          if (live) setStatus(err instanceof Error ? err.message : 'Could not load people');
        })
        .finally(() => {
          if (live) setReady(true);
        });
      return () => {
        live = false;
      };
    }, [load]),
  );

  const visible = useMemo(() => {
    if (tab === 'teachers') return uniquePeople(people.filter((row) => row.kind === 'teacher'));
    if (tab === 'parents') return uniquePeople(people.filter((row) => row.kind === 'parent'));
    if (tab === 'all') return uniquePeople(people.filter((row) => row.kind === 'classmate'));
    return uniquePeople(people.filter((row) => row.kind === 'classmate' && row.classId === tab));
  }, [people, tab]);

  const go = (next: string) => {
    setTab(next);
    router.setParams({ tab: next } as never);
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

  const detailFor = (person: StudentPerson) => {
    if (person.kind === 'parent') return 'Your parent or guardian.';
    if (person.kind === 'teacher') {
      const rooms = people.filter((row) => row.kind === 'teacher' && row.id === person.id && row.className);
      const names = [...new Set(rooms.map((row) => row.className).filter(Boolean))];
      return names.length ? `Teaches ${names.join(', ')}.` : 'Your teacher.';
    }
    return person.className ? `In ${person.className}.` : 'Classmate.';
  };

  if (!ready && !people.length && !classes.length) {
    return (
      <Screen>
        <WorkingLine />
      </Screen>
    );
  }

  return (
    <Screen maxWidth={720}>
      <PersonTabs
        tabs={[
          ...studentRoomTabs(classes, { key: 'all', label: 'All', icon: 'setup' }),
          { key: 'teachers', label: 'Teachers', icon: 'person' },
          { key: 'parents', label: 'Parents', icon: 'parents' },
        ]}
        value={tab}
        onChange={go}
      />
      {visible.length ? (
        visible.map((person) => (
          <ListRow
            key={person.id}
            title={person.displayName}
            status={detailFor(person)}
            avatarName={person.displayName}
            photoUrl={photos[person.id]}
            onPress={() => setPeer(person)}
          />
        ))
      ) : (
        <Text style={[styles.empty, { color: colors.mute }]}>
          {tab === 'parents' ? 'No parents linked yet.' : tab === 'teachers' ? 'No teachers listed yet.' : 'No classmates yet.'}
        </Text>
      )}
      {status ? <Text style={[type.meta, { color: colors.danger }]}>{status}</Text> : null}
      <StudentPersonSheet
        name={peer?.displayName ?? null}
        photoUrl={peer ? photos[peer.id] : null}
        detail={peer ? detailFor(peer) : ''}
        canMessage={isMessageable(peer?.profileId, messageable)}
        onMessage={() => peer && void message(peer)}
        onClose={() => setPeer(null)}
      />
    </Screen>
  );
}

function uniquePeople(rows: StudentPerson[]): StudentPerson[] {
  const seen = new Map<string, StudentPerson>();
  for (const row of rows) {
    if (!seen.has(row.id)) seen.set(row.id, row);
  }
  return [...seen.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

const styles = StyleSheet.create({
  empty: {
    ...type.body,
    marginTop: 16,
  },
});
