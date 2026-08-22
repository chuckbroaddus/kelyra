import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AssignmentMark } from '@/components/ui/AssignmentMark';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { WorkRow } from '@/components/ui/WorkRow';
import { type } from '@/constants/theme';
import { captureBadge } from '@/components/ui/Badge';
import { listInbox, type InboxItem } from '@/lib/captures/api';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { formatWhen } from '@/lib/format';
import { loadGradebook } from '@/lib/gradebook/api';
import { loadParentProgress } from '@/lib/parents/api';
import { listStudentTodo } from '@/lib/student-session/api';
import { listParentsForClass, type ClassParent } from '@/lib/parents/api';
import { listDirectory, type DirectoryPerson } from '@/lib/school/api';
import { formatHandle, isOfficeRole, isStaffRole, roleLabel } from '@/lib/school/roles';
import { listRoster, type RosterStudent } from '@/lib/students/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

const RECENT_KEY = 'kelyra.search.recent';

function haystack(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const { profile } = useAuth();
  const router = useRouter();
  const query = chrome.searchQuery.trim().toLowerCase();
  const office = isOfficeRole(profile);
  const staff = isStaffRole(profile);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [assignments, setAssignments] = useState<string[]>([]);
  const [practice, setPractice] = useState<string[]>([]);
  const [parentLines, setParentLines] = useState<string[]>([]);
  const [classParents, setClassParents] = useState<ClassParent[]>([]);
  const [directory, setDirectory] = useState<DirectoryPerson[]>([]);
  const [recents, setRecents] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const stored = await AsyncStorage.getItem(RECENT_KEY);
        if (!cancelled && stored) {
          try {
            setRecents(JSON.parse(stored) as string[]);
          } catch {
            setRecents([]);
          }
        }
        try {
          if (office || (staff && !chrome.classId)) {
            const people = await listDirectory().catch(() => []);
            if (cancelled) return;
            setDirectory(people);
          }
          if ((chrome.role === 'teacher' || staff) && chrome.classId) {
            const [names, items, book, people] = await Promise.all([
              listRoster(chrome.classId),
              listInbox(chrome.classId),
              loadGradebook(chrome.classId).catch(() => null),
              listParentsForClass(chrome.classId).catch(() => ({ linked: [], unlinked: [] })),
            ]);
            if (cancelled) return;
            setRoster(names);
            setInbox(items);
            setAssignments((book?.assignments ?? []).map((row) => row.title));
            setClassParents([...people.linked, ...people.unlinked]);
          }
          if (chrome.role === 'student' && chrome.studentSession) {
            const todo = await listStudentTodo();
            if (!cancelled) setPractice(todo.map((item) => item.title));
          }
          if (chrome.role === 'parent' && chrome.parentTokens[0]) {
            const progress = await loadParentProgress(chrome.parentTokens[0].token);
            if (!cancelled && progress) {
              const first = progress.children[0];
              setParentLines(
                [first?.parent_sentence, first?.focus_label, first?.practice_status].filter(
                  (value): value is string => Boolean(value),
                ),
              );
            }
          }
        } catch {
          // Empty corpus is fine.
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [chrome.role, chrome.classId, chrome.studentSession, chrome.parentTokens, office, staff]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!query) return;
      const next = [chrome.searchQuery.trim(), ...recents.filter((item) => item !== chrome.searchQuery.trim())].slice(0, 5);
      void AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
    }, [query, chrome.searchQuery, recents]),
  );

  const directoryHits = useMemo(() => {
    if (!query) return [];
    return directory.filter((row) =>
      haystack([row.display_name, row.username, formatHandle(row.username), row.email]).includes(query),
    );
  }, [directory, query]);
  const people = useMemo(() => {
    if (!query) return [];
    const named = new Set(directoryHits.map((row) => row.student_id).filter(Boolean));
    return roster.filter((student) => {
      if (named.has(student.id)) return false;
      return student.display_name.toLowerCase().includes(query);
    });
  }, [roster, query, directoryHits]);
  const parentPeople = useMemo(() => {
    if (!query) return [];
    const named = new Set(directoryHits.map((row) => row.parent_id).filter(Boolean));
    return classParents.filter((parent) => {
      if (named.has(parent.id)) return false;
      return parent.display_name.toLowerCase().includes(query);
    });
  }, [classParents, query, directoryHits]);
  const captures = useMemo(
    () =>
      query
        ? inbox.filter((item) => haystack([item.matchedName, item.transcript]).includes(query))
        : [],
    [inbox, query],
  );
  const assignmentHits = useMemo(
    () => (query ? assignments.filter((title) => title.toLowerCase().includes(query)) : []),
    [assignments, query],
  );
  const practiceHits = useMemo(
    () => (query ? practice.filter((title) => title.toLowerCase().includes(query)) : []),
    [practice, query],
  );
  const parentHits = useMemo(
    () => (query ? parentLines.filter((line) => line.toLowerCase().includes(query)) : []),
    [parentLines, query],
  );

  const emptyFilter =
    Boolean(query) &&
    !directoryHits.length &&
    !people.length &&
    !parentPeople.length &&
    !captures.length &&
    !assignmentHits.length &&
    !practiceHits.length &&
    !parentHits.length;

  const openDirectoryPerson = (row: DirectoryPerson) => {
    const classId = row.classId ?? chrome.classId ?? chrome.classes[0]?.id ?? null;
    if (row.student_id && classId) {
      router.push(`/class/${classId}/student/${row.student_id}`);
      return;
    }
    if (row.parent_id && classId) {
      router.push(`/class/${classId}/parent/${row.parent_id}`);
      return;
    }
    router.push(`/profile?person=${row.id}` as never);
  };

  return (
    <Screen>
      {!query ? <Text style={[type.meta, { color: colors.mute }]}>Type a name.</Text> : null}
      {emptyFilter ? <Text style={[type.meta, { color: colors.mute }]}>No names match that search.</Text> : null}
      {directoryHits.map((row) => (
        <ListRow
          key={row.id}
          title={row.display_name || formatHandle(row.username)}
          status={roleLabel(row.role)}
          photoUrl={row.photoUrl}
          onPress={() => openDirectoryPerson(row)}
        />
      ))}
      {people.map((student) => (
        <ListRow
          key={student.id}
          title={student.display_name}
          photoUrl={student.photoUrl}
          onPress={() =>
            chrome.classId
              ? router.push(`/class/${chrome.classId}/student/${student.id}`)
              : undefined
          }
        />
      ))}
      {parentPeople.map((parent) => (
        <ListRow
          key={parent.id}
          title={parent.display_name}
          status="Parent"
          photoUrl={parent.photoUrl}
          onPress={() =>
            chrome.classId ? router.push(`/class/${chrome.classId}/parent/${parent.id}`) : undefined
          }
        />
      ))}
      {captures.map((item) => (
        <WorkRow
          key={item.id}
          title={item.matchedName ?? 'Needs a name'}
          status={item.transcript ? `Heard: ${item.transcript}` : undefined}
          meta={`${formatWhen(item.created_at)} · ${item.pageCount || 'Voice note'}`}
          photoUrl={item.photoUrl}
          unknown={!item.student_id && !item.photoUrl}
          badge={captureBadge(item.status)}
          onPress={() =>
            item.student_id
              ? router.push(`/class/${item.class_id}/student/${item.student_id}`)
              : router.push('/inbox')
          }
        />
      ))}
      {assignmentHits.map((title) => (
        <WorkRow
          key={title}
          title={title}
          lead={<AssignmentMark size={48} />}
          onPress={() => {
            if (!chrome.classId) return;
            chrome.setContextTab('book', `/class/${chrome.classId}/gradebook`);
            router.push(`/class/${chrome.classId}/gradebook`);
          }}
        />
      ))}
      {practiceHits.map((title) => (
        <ListRow key={title} title={title} onPress={() => router.push('/todo')} />
      ))}
      {parentHits.map((line) => (
        <ListRow key={line} title={line} chevron={false} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({});
