import { useEffect, useState } from 'react';
import { Platform, Share, StyleSheet, Text } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { FormSheet } from '@/components/ui/FormSheet';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import {
  generatePronounceableTemp,
  hasLoginUsername,
  RESET_PASSWORD_COPY,
} from '@/lib/school/resetPassword';
import { formatHandle } from '@/lib/school/roles';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  visible: boolean;
  username: string | null | undefined;
  onClose: () => void;
  onReset: (password: string) => Promise<void>;
};

async function copyText(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through
  }
  if (Platform.OS === 'web') return false;
  try {
    await Share.share({ message: value });
    return true;
  } catch {
    return false;
  }
}

export function ResetPasswordSheet({ visible, username, onClose, onReset }: Props) {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = hasLoginUsername(username);
  const handle = login ? formatHandle(username ?? '') : '';

  useEffect(() => {
    if (visible) return;
    setPassword('');
    setBusy(false);
    setDone(false);
    setCopied(false);
    setError(null);
  }, [visible]);

  const save = async () => {
    if (!login) {
      setError(RESET_PASSWORD_COPY.noLogin);
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onReset(password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormSheet visible={visible} title={RESET_PASSWORD_COPY.title} onClose={onClose}>
      {login ? (
        <Text style={[styles.lead, { color: colors.mute }]}>{RESET_PASSWORD_COPY.lead(handle)}</Text>
      ) : (
        <Text style={[styles.lead, { color: colors.mute }]}>{RESET_PASSWORD_COPY.noLogin}</Text>
      )}
      {login ? (
        <>
          <TextField
            label="Temporary password"
            value={password}
            editable={!done}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              if (done) return;
              setPassword(value);
            }}
          />
          {done ? null : (
            <GhostButton
              align="left"
              label="Generate"
              onPress={() => {
                setError(null);
                setPassword(generatePronounceableTemp());
              }}
            />
          )}
        </>
      ) : null}
      {error ? <Text style={[styles.message, { color: colors.danger }]}>{error}</Text> : null}
      {done ? <Text style={[styles.message, { color: colors.ink }]}>{RESET_PASSWORD_COPY.success}</Text> : null}
      {login && done ? (
        <GhostButton
          align="left"
          label={copied ? 'Copied' : 'Copy'}
          onPress={() => {
            void copyText(password).then((ok) => {
              if (ok) setCopied(true);
            });
          }}
        />
      ) : null}
      {login && !done ? (
        <GhostButton align="left" label={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={() => void save()} />
      ) : null}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  lead: {
    ...type.body,
    marginBottom: 8,
  },
  message: {
    ...type.meta,
    marginTop: 4,
  },
});
