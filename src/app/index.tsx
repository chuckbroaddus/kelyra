import { Link, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/lib/auth/AuthProvider';
import { createClass, listClasses } from '@/lib/classes/api';
import type { ClassRow } from '@/lib/supabase/types';
import { useFocusEffect } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const { configured, loading, teacher, error, signOut } = useAuth();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!teacher) return;
    try {
      setClasses(await listClasses());
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load classes');
    }
  }, [teacher]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!configured) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Kelyra</Text>
        <Text style={styles.body}>
          Slice 01 needs a Supabase project. Copy .env.example to .env, then apply
          supabase/migrations/20260812000000_slice01_foundation.sql. See docs/slice-01.md.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Loading…</Text>
      </View>
    );
  }

  if (!teacher) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Kelyra</Text>
        <Text style={styles.body}>Sign in to create a class and type a roster.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Link href="/sign-in" style={styles.link}>
          <Text style={styles.linkText}>Sign in</Text>
        </Link>
      </View>
    );
  }

  const onCreate = async () => {
    setStatus(null);
    try {
      const created = await createClass(name, teacher.id);
      setName('');
      setClasses((current) => [...current, created]);
      router.push(`/class/${created.id}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create class');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your classes</Text>
      <Text style={styles.body}>{teacher.email}</Text>
      <Link href="/capture" style={styles.link}>
        <Text style={styles.linkText}>Capture homework</Text>
      </Link>
      <Link href="/inbox" style={styles.link}>
        <Text style={styles.linkText}>Unassigned inbox</Text>
      </Link>
      {classes.map((item) => (
        <Link key={item.id} href={`/class/${item.id}`} style={styles.link}>
          <Text style={styles.linkText}>{item.name}</Text>
        </Link>
      ))}
      <TextInput
        placeholder="Room 14 math"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />
      <Pressable style={styles.button} onPress={() => void onCreate()}>
        <Text style={styles.buttonText}>Create class</Text>
      </Pressable>
      {status ? <Text style={styles.error}>{status}</Text> : null}
      <Pressable onPress={() => void signOut()}>
        <Text style={styles.signOut}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.75,
  },
  error: {
    color: '#9b1c1c',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
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
  link: {
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 17,
    color: '#2e78b7',
  },
  signOut: {
    marginTop: 12,
    color: '#555',
  },
});
