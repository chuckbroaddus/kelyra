import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { formatJoinCode, normalizeJoinCode } from '@/lib/classes/joinCode';
import { signedProfileUrl } from '@/lib/people/photos';
import { openClassByJoinCode, saveStudentSession } from '@/lib/student-session/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function JoinScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { code: queryCode } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (typeof queryCode === 'string' && queryCode.trim()) {
      setCode(formatJoinCode(queryCode));
    }
  }, [queryCode]);
  const [rows, setRows] = useState<
    Array<{
      class_id: string;
      class_name: string;
      student_id: string;
      display_name: string;
      photo_path: string | null;
      photoUrl?: string | null;
    }>
  >([]);
  const [status, setStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const onLookup = async () => {
    setStatus(null);
    setFailed(false);
    try {
      const next = await openClassByJoinCode(normalizeJoinCode(code));
      if (!next.length) {
        setStatus('No class matches that code.');
        setFailed(false);
        setRows([]);
        return;
      }
      const withPhotos = await Promise.all(
        next.map(async (row) => ({
          ...row,
          photoUrl: await signedProfileUrl(row.photo_path),
        })),
      );
      setRows(withPhotos);
    } catch (err) {
      setFailed(true);
      setStatus(err instanceof Error ? err.message : 'Could not open class');
    }
  };

  const onPick = async (row: (typeof rows)[0]) => {
    await saveStudentSession({
      joinCode: normalizeJoinCode(code),
      classId: row.class_id,
      className: row.class_name,
      studentId: row.student_id,
      displayName: row.display_name,
      photoPath: row.photo_path,
    });
    router.push('/todo');
  };

  return (
    <Screen maxWidth={400} centered={!rows.length} keyboard>
      <Text style={[styles.brand, { color: colors.mute }]}>Kelyra</Text>
      <Text style={[styles.title, { color: colors.ink }]}>Join your class</Text>
      <Text style={[styles.meta, { color: colors.mute }]}>
        Type the two words your teacher said, like {formatJoinCode('GENTLE-MAPLE')}.
      </Text>
      <TextField
        variant="join"
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="Gentle Maple"
        value={code}
        onChangeText={setCode}
        onSubmitEditing={() => void onLookup()}
      />
      <View style={styles.gap} />
      <PrimaryButton label="Find class" onPress={() => void onLookup()} />
      {rows.length ? <SectionHeader label="Pick your name" /> : null}
      {rows.map((row) => (
        <ListRow
          key={row.student_id}
          title={row.display_name}
          status={row.class_name}
          photoUrl={row.photoUrl}
          onPress={() => void onPick(row)}
        />
      ))}
      {status ? (
        <Text style={[type.body, { color: failed ? colors.danger : colors.mute, marginTop: 12 }]}>
          {status}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    ...type.meta,
    textAlign: 'center',
  },
  title: {
    ...type.title,
    textAlign: 'center',
  },
  meta: {
    ...type.meta,
    textAlign: 'center',
    marginBottom: 16,
  },
  gap: {
    height: 12,
  },
});
