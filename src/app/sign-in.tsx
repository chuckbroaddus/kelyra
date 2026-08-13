import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, theme } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { signInWithPassword, signUpWithPassword } from '@/lib/auth/api';

export default function SignInScreen() {
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
      <View style={styles.container}>
        <Text style={styles.title}>Supabase is not configured</Text>
        <Text style={styles.body}>Copy .env.example to .env and add your project URL and anon key.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teacher sign in</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password (6+ characters)"
        placeholderTextColor={colors.muted}
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable disabled={busy} style={styles.button} onPress={() => void run('in')}>
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
      <Pressable disabled={busy} style={styles.secondary} onPress={() => void run('up')}>
        <Text style={styles.secondaryText}>Create account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...theme.screen,
    justifyContent: 'center',
  },
  title: theme.title,
  body: theme.body,
  input: theme.input,
  message: theme.error,
  button: theme.button,
  buttonText: theme.buttonText,
  secondary: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryText: theme.secondaryText,
});
