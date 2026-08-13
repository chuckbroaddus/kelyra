import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
    router.replace('/todo');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join class</Text>
      <Text style={styles.body}>Enter the join code from your teacher, then pick your name.</Text>
      <TextInput
        autoCapitalize="characters"
        placeholder="Join code"
        style={styles.input}
        value={code}
        onChangeText={setCode}
      />
      <Pressable style={styles.button} onPress={() => void onLookup()}>
        <Text style={styles.buttonText}>Find class</Text>
      </Pressable>
      {rows.map((row) => (
        <Pressable key={row.student_id} style={styles.secondary} onPress={() => void onPick(row)}>
          <Text style={styles.secondaryText}>
            {row.display_name} · {row.class_name}
          </Text>
        </Pressable>
      ))}
      {status ? <Text style={styles.error}>{status}</Text> : null}
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
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.75,
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
  secondary: {
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  error: {
    color: '#9b1c1c',
  },
});
