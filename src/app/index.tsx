import { Link, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, theme } from '@/constants/theme';
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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Your classes</Text>
      <Text style={styles.body}>{teacher.email}</Text>
      <Link href="/capture" style={styles.link}>
        <Text style={styles.linkText}>Capture homework</Text>
      </Link>
      <Link href="/inbox" style={styles.link}>
        <Text style={styles.linkText}>Unassigned inbox</Text>
      </Link>
      <Link href="/join" style={styles.link}>
        <Text style={styles.linkText}>Student join</Text>
      </Link>
      {classes.map((item) => (
        <Link key={item.id} href={`/class/${item.id}`} style={styles.link}>
          <Text style={styles.linkText}>{item.name}</Text>
        </Link>
      ))}
      <TextInput
        placeholder="Room 14 math"
        placeholderTextColor={colors.muted}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: theme.scroll,
  title: {
    ...theme.title,
    fontSize: 28,
  },
  body: theme.body,
  error: theme.error,
  input: theme.input,
  button: theme.button,
  buttonText: theme.buttonText,
  link: {
    paddingVertical: 4,
  },
  linkText: {
    ...theme.linkText,
    fontSize: 17,
  },
  signOut: {
    marginTop: 12,
    color: colors.muted,
  },
});
