import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/lib/auth/AuthProvider';
import { getClass, setActiveClass } from '@/lib/classes/api';
import { loadClassOverview, type ClassOverview } from '@/lib/classes/overview';
import { addTypedStudent, listRoster, type RosterStudent } from '@/lib/students/api';
import type { ClassRow } from '@/lib/supabase/types';
import { useFocusEffect } from 'expo-router';

export default function ClassHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teacher } = useAuth();
  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [overview, setOverview] = useState<ClassOverview | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !teacher) return;
    try {
      const nextClass = await getClass(id);
      setKlass(nextClass);
      setRoster(await listRoster(id));
      setOverview(await loadClassOverview(id));
      await setActiveClass(teacher.id, id);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load class');
    }
  }, [id, teacher]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onAdd = async () => {
    if (!id || !teacher) return;
    setStatus(null);
    try {
      const student = await addTypedStudent(id, teacher.id, name);
      setRoster((current) => [...current, student]);
      setName('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not add student');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{klass?.name ?? 'Class'}</Text>
      {klass ? <Text style={styles.meta}>Join code {klass.join_code}</Text> : null}
      {overview ? (
        <View>
          <Text style={styles.section}>This week</Text>
          <Text style={styles.body}>
            Unassigned {overview.unassignedCount} · Drafts {overview.draftCount}
          </Text>
          {overview.commonGaps.length ? (
            <>
              <Text style={styles.meta}>Common gaps</Text>
              {overview.commonGaps.map((gap) => (
                <Text key={gap.label} style={styles.body}>
                  {gap.label} · {gap.count}
                </Text>
              ))}
            </>
          ) : null}
          {overview.focusStudents.length ? (
            <>
              <Text style={styles.meta}>Current focus</Text>
              {overview.focusStudents.map((row) => (
                <Link key={row.id} href={`/class/${id}/student/${row.id}`} style={styles.link}>
                  <Text style={styles.body}>
                    {row.displayName}: {row.focusLabel}
                  </Text>
                </Link>
              ))}
            </>
          ) : null}
        </View>
      ) : null}
      <Text style={styles.section}>Roster</Text>
      {roster.length === 0 ? (
        <Text style={styles.body}>No students yet. A student can be only a name.</Text>
      ) : (
        roster.map((student) => (
          <Link key={student.id} href={`/class/${id}/student/${student.id}`} style={styles.link}>
            <Text style={styles.row}>{student.display_name}</Text>
          </Link>
        ))
      )}
      <TextInput
        placeholder="Maya Chen"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />
      <Pressable style={styles.button} onPress={() => void onAdd()}>
        <Text style={styles.buttonText}>Add student</Text>
      </Pressable>
      {status ? <Text style={styles.error}>{status}</Text> : null}
      <Link href="/capture" style={styles.link}>
        <Text style={styles.linkText}>Capture homework</Text>
      </Link>
      <Link href="/inbox" style={styles.link}>
        <Text style={styles.linkText}>Unassigned inbox</Text>
      </Link>
      <Link href={`/class/${id}/gradebook`} style={styles.link}>
        <Text style={styles.linkText}>Grade book</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 10,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
    opacity: 0.65,
  },
  section: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    opacity: 0.75,
  },
  row: {
    fontSize: 17,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#9b1c1c',
  },
  link: {
    paddingVertical: 4,
  },
  linkText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
});
