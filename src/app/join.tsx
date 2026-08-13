import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { colors, theme } from '@/constants/theme';
import { openClassByJoinCode, saveStudentSession } from '@/lib/student-session/api';

export default function JoinScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [rows, setRows] = useState<
    Array<{ class_id: string; class_name: string; student_id: string; display_name: string }>
  >([]);
  const [status, setStatus] = useState<string | null>(null);

  const onLookup = async () => {
    setStatus(null);
    try {
      const next = await openClassByJoinCode(code);
      if (!next.length) {
        setStatus('No class matches that code.');
        setRows([]);
        return;
      }
      setRows(next);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not open class');
    }
  };

  const onPick = async (row: (typeof rows)[0]) => {
    await saveStudentSession({
      joinCode: code.trim().toUpperCase(),
      classId: row.class_id,
      className: row.class_name,
      studentId: row.student_id,
      displayName: row.display_name,
    });
    router.push('/todo');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Join class</Text>
      <Text style={styles.body}>Enter the join code from your teacher, then pick your name.</Text>
      <TextInput
        autoCapitalize="characters"
        placeholder="Join code"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={code}
        onChangeText={setCode}
      />
      <Pressable style={styles.button} onPress={() => void onLookup()}>
        <Text style={styles.buttonText}>Find class</Text>
      </Pressable>
      {rows.length ? <Text style={styles.section}>Pick your name</Text> : null}
      {rows.map((row) => (
        <Pressable key={row.student_id} style={styles.secondary} onPress={() => void onPick(row)}>
          <Text style={styles.secondaryText}>
            {row.display_name} · {row.class_name}
          </Text>
        </Pressable>
      ))}
      {status ? <Text style={styles.error}>{status}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: theme.scroll,
  title: theme.title,
  body: theme.body,
  section: {
    ...theme.section,
    marginTop: 8,
  },
  input: theme.input,
  button: theme.button,
  buttonText: theme.buttonText,
  secondary: theme.secondary,
  secondaryText: theme.secondaryText,
  error: theme.error,
});
