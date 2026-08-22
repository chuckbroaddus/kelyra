import { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { HoverTip } from '@/components/ui/HoverTip';
import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  email: string;
  style?: StyleProp<TextStyle>;
};

export function EmailLink({ email, style }: Props) {
  const { colors, scheme } = useTheme();
  const [open, setOpen] = useState(false);
  const address = email.trim();

  const send = async () => {
    setOpen(false);
    const url = `mailto:${address}`;
    try {
      await Linking.openURL(url);
    } catch {
      // Browser or OS may still have opened a client.
    }
  };

  return (
    <>
      <HoverTip label="Opens your email app to write this address">
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Email ${address}`}
          onPress={() => setOpen(true)}
        >
          <Text style={[styles.address, { color: colors.brand }, style]} numberOfLines={3}>
            {address}
          </Text>
        </Pressable>
      </HoverTip>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View
          style={[
            styles.modal,
            { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Cancel" />
          <View style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.line }]}>
            <Text style={[styles.title, { color: colors.ink }]}>Send an email?</Text>
            <Text style={[styles.body, { color: colors.mute }]}>
              Open your mail app to write {address}?
            </Text>
            <PrimaryButton label="Send email" onPress={() => void send()} />
            <GhostButton label="Cancel" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  address: {
    ...type.body,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  title: type.title,
  body: type.body,
});
