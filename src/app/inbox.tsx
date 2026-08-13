import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth/AuthProvider';
import { listUnassigned, type InboxItem } from '@/lib/captures/api';
import { resolveCaptureClass } from '@/lib/classes/api';
import { useFocusEffect } from 'expo-router';

export default function InboxScreen() {
  const { teacher } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [className, setClassName] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!teacher) return;
    try {
      const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id);
      setClassName(klass.name);
      setItems(await listUnassigned(klass.id));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load inbox');
    }
  }, [teacher]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!teacher) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Sign in to see Unassigned captures.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Unassigned</Text>
      <Text style={styles.body}>
        {className ? `${className}. ` : ''}
        These have no student yet. Matching comes next.
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
              {item.audio_asset_id ? ' · voice note attached' : ' · photo only'}
            </Text>
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
  link: {
    paddingVertical: 4,
  },
  linkText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  card: {
    gap: 8,
    marginBottom: 8,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  error: {
    color: '#9b1c1c',
  },
});
