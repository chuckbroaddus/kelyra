import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  listening: boolean;
  onTakePhoto: () => void;
  onVoiceOnly: () => void;
  onCancel: () => void;
};

export function ListenSheet({ listening, onTakePhoto, onVoiceOnly, onCancel }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <Text style={[type.section, { color: colors.ink }]}>Listening</Text>
      <Text style={[type.body, { color: colors.mute }]}>
        Say the grade, the name, and the mark. “This is homework for Mateo.” “Give Jamal an 88 for class
        participation.” “No need to grade.”
      </Text>
      {listening ? <WorkingLine text="Listening…" /> : <Text style={[type.meta, { color: colors.mute }]}>Mic is off. You can still take a photo.</Text>}
      <View style={styles.actions}>
        <PrimaryButton label="Take photo" onPress={onTakePhoto} />
        <SecondaryButton label="Voice only" onPress={onVoiceOnly} />
        <GhostButton align="left" label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
});
