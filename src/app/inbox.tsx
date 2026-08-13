import { Link, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth/AuthProvider';
import { attachCapture, listInbox, type InboxItem } from '@/lib/captures/api';
import { resolveCaptureClass } from '@/lib/classes/api';
import { listRoster, type RosterStudent } from '@/lib/students/api';
import { useFocusEffect } from 'expo-router';

export default function InboxScreen() {
  const router = useRouter();
  const { teacher } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [classId, setClassId] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!teacher) return;
    try {
      const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id);
      setClassId(klass.id);
      setClassName(klass.name);
      setRoster(await listRoster(klass.id));
      setItems(await listInbox(klass.id));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load inbox');
    }
  }, [teacher]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onAssign = async (captureId: string, studentId: string) => {
    setBusyId(captureId);
    setStatus(null);
    try {
      await attachCapture(captureId, studentId);
      if (classId) {
        router.push(`/class/${classId}/student/${studentId}`);
        return;
      }
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not assign student');
    } finally {
      setBusyId(null);
    }
  };

  if (!teacher) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Sign in to see Unassigned captures.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Inbox</Text>
      <Text style={styles.body}>
        {className ? `${className}. ` : ''}
        Unassigned items need a student. Matching never creates a new student.
      </Text>
      <Link href="/capture" style={styles.link}>
        <Text style={styles.linkText}>Capture another</Text>
      </Link>
      {items.length === 0 ? (
        <Text style={styles.meta}>Inbox is empty.</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.preview} />
            ) : (
              <Text style={styles.meta}>No photo</Text>
            )}
            <Text style={styles.meta}>
              {new Date(item.created_at).toLocaleString()}
              {item.audio_asset_id ? ' · voice note' : ' · photo only'}
            </Text>
            {item.transcript ? <Text style={styles.meta}>Heard: {item.transcript}</Text> : null}
            {item.matchedName ? (
              <Link href={`/class/${item.class_id}/student/${item.student_id}`}>
                <Text style={styles.filed}>
                  {item.status === 'draft' ? 'Review gaps for' : 'Filed on'} {item.matchedName}
                </Text>
              </Link>
            ) : (
              <Text style={styles.meta}>Unassigned — pick a student</Text>
            )}
            <View style={styles.names}>
              {roster.map((student) => (
                <Pressable
                  key={student.id}
                  disabled={busyId === item.id}
                  style={[
                    styles.nameChip,
                    item.student_id === student.id ? styles.nameChipOn : null,
                  ]}
                  onPress={() => void onAssign(item.id, student.id)}
                >
                  <Text
                    style={[
                      styles.nameChipText,
                      item.student_id === student.id ? styles.nameChipTextOn : null,
                    ]}
                  >
                    {student.display_name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}
      {status ? <Text style={styles.error}>{status}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.75,
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
  },
  filed: {
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    paddingVertical: 4,
  },
  linkText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  card: {
    gap: 8,
    marginBottom: 16,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  names: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nameChip: {
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nameChipOn: {
    backgroundColor: '#1d4ed8',
  },
  nameChipText: {
    color: '#1d4ed8',
  },
  nameChipTextOn: {
    color: '#fff',
  },
  error: {
    color: '#9b1c1c',
  },
});
