import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/Button';
import { KelyraMark } from '@/components/ui/KelyraMark';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { signInWithPassword } from '@/lib/auth/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function SignInScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { configured, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const run = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await signInWithPassword(email, password);
      await refresh();
      router.replace('/');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      busyRef.current = false;
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
      <KelyraMark size={72} style={styles.mark} />
      <Text style={[styles.wordmark, { color: colors.ink }]}>Kelyra</Text>
      <Text style={[styles.kicker, { color: colors.mute }]}>Sign in with email or @username</Text>
      <TextField
        autoCapitalize="none"
        autoComplete="username"
        placeholder="Email or @username"
        value={email}
        onChangeText={setEmail}
        returnKeyType="next"
        enterKeyHint="next"
        blurOnSubmit={false}
      />
      <View style={styles.gap} />
      <TextField
        placeholder="Password (6+ characters)"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        enterKeyHint="go"
        blurOnSubmit
        onSubmitEditing={() => void run()}
        onKeyPress={(event) => {
          if (event.nativeEvent.key === 'Enter') void run();
        }}
      />
      {message ? <Text style={[styles.message, { color: colors.danger }]}>{message}</Text> : <View style={styles.gap} />}
      <PrimaryButton
        label={busy ? 'Signing in…' : 'Sign in'}
        disabled={busy}
        onPress={() => void run()}
      />
      <Text style={[styles.hint, { color: colors.mute }]}>
        Accounts come from the office, not this screen. First school only: create an auth user in
        Supabase, sign in here, then run school_claim_superintendent() in the SQL editor. Dev bootstrap
        password is only in that SQL file — never in this app.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignSelf: 'center',
    marginBottom: 14,
  },
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
  hint: {
    ...type.meta,
    marginTop: 16,
  },
});
