import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';
import { messagesPathForHandle } from '@/lib/messages/go';
import { formatHandle } from '@/lib/school/roles';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  username: string;
  profileId?: string | null;
  style?: StyleProp<TextStyle>;
  /** Nest inside another Text (Activity log). */
  inline?: boolean;
  /** Full-width, centered (Profile hero). */
  center?: boolean;
};

export function HandleLink({ username, profileId, style, inline, center }: Props) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const chrome = useOptionalChrome();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const label = formatHandle(username);
  const tip = profileId && profile && profileId === profile.id ? 'Messages' : `Message ${label}`;

  const go = async () => {
    if (busy) return;
    setBusy(true);
    chrome?.setDrawerOpen(false);
    try {
      if (!profile) {
        router.push('/messages');
        return;
      }
      const path = await messagesPathForHandle({
        myId: profile.id,
        schoolId: profile.school_id,
        otherId: profileId,
        username,
      });
      router.push(path as never);
    } catch {
      router.push('/messages');
    } finally {
      setBusy(false);
    }
  };

  const text = (
    <Text
      onPress={inline ? () => void go() : undefined}
      style={[styles.handle, { color: colors.brand }, center && styles.center, style]}
      accessibilityRole="link"
      accessibilityLabel={tip}
    >
      {label}
    </Text>
  );

  if (inline) return text;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={tip}
      onPress={() => void go()}
      disabled={busy}
      style={center ? styles.centerHit : undefined}
    >
      {text}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  handle: {
    ...type.meta,
    fontWeight: '700',
  },
  center: {
    textAlign: 'center',
    width: '100%',
  },
  centerHit: {
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
});
