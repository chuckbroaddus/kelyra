import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarInitials } from '@/components/ui/AvatarInitials';
import { GhostButton } from '@/components/ui/Button';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  name: string | null;
  className: string;
  onClose: () => void;
};

export function ClassmateSheet({ name, className, onClose }: Props) {
  const { colors, scheme } = useTheme();
  return (
    <Modal visible={Boolean(name)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: scheme === 'dark' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(26, 22, 18, 0.40)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.elevated, borderColor: colors.line }]}>
          {name ? <AvatarInitials name={name} size={72} /> : null}
          {name ? (
            <MarqueeText
              text={name}
              align="center"
              accessible
              fadeColor={colors.elevated}
              style={[styles.name, { color: colors.ink }]}
            />
          ) : null}
          <Text style={[styles.meta, { color: colors.mute }]}>In {className}.</Text>
          <GhostButton label="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  name: {
    ...type.title,
    alignSelf: 'stretch',
  },
  meta: type.body,
});
