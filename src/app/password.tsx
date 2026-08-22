import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { updatePassword } from '@/lib/school/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function PasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { refresh } = useAuth();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (password.length < 8) {
      setMessage('Use at least 8 characters.');
      return;
    }
    if (password !== again) {
      setMessage('Those do not match.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await updatePassword(password);
      await refresh();
      router.replace('/');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen centered maxWidth={400} keyboard>
      <Text style={[type.title, { color: colors.ink }]}>Choose a new password</Text>
      <Text style={[styles.lead, { color: colors.mute }]}>
        The bootstrap password is only for first sign-in. Change it now.
      </Text>
      <TextField placeholder="New password" secureTextEntry value={password} onChangeText={setPassword} />
      <View style={styles.gap} />
      <TextField placeholder="Again" secureTextEntry value={again} onChangeText={setAgain} />
      {message ? <Text style={[styles.message, { color: colors.danger }]}>{message}</Text> : <View style={styles.gap} />}
      <PrimaryButton label={busy ? 'Saving…' : 'Save password'} disabled={busy} onPress={() => void save()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    ...type.body,
    marginTop: 8,
    marginBottom: 16,
  },
  gap: { height: 12 },
  message: {
    ...type.meta,
    marginVertical: 12,
  },
});
