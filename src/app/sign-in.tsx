import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { signInWithPassword, signUpWithPassword } from '@/lib/auth/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function SignInScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { configured, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (mode: 'in' | 'up') => {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'in') {
        await signInWithPassword(email, password);
      } else {
        const result = await signUpWithPassword(email, password);
        if (!result.session) {
          setMessage('Account created. If email confirmation is on, confirm it, then sign in.');
          return;
        }
      }
      await refresh();
      router.replace('/');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <Screen centered maxWidth={400}>
        <Text style={[type.title, { color: colors.ink }]}>Supabase is not configured</Text>
        <Text style={[styles.lead, { color: colors.mute }]}>Copy .env.example to .env and add your project URL and anon key.</Text>
      </Screen>
    );
  }

  return (
    <Screen centered maxWidth={400} keyboard>
      <Text style={[styles.wordmark, { color: colors.ink }]}>Kelyra</Text>
      <Text style={[styles.kicker, { color: colors.mute }]}>Teacher sign in</Text>
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <View style={styles.gap} />
      <TextField
        placeholder="Password (6+ characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {message ? <Text style={[styles.message, { color: colors.danger }]}>{message}</Text> : <View style={styles.gap} />}
      <PrimaryButton
        label={busy ? 'Signing in…' : 'Sign in'}
        disabled={busy}
        onPress={() => void run('in')}
      />
      <GhostButton label="Create account" disabled={busy} onPress={() => void run('up')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    ...type.display,
    textAlign: 'center',
  },
  kicker: {
    ...type.meta,
    textAlign: 'center',
    marginBottom: 24,
  },
  lead: {
    ...type.body,
    marginTop: 8,
  },
  message: {
    ...type.body,
    marginVertical: 12,
  },
  gap: {
    height: 12,
  },
});
