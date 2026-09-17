import { StyleSheet, Text, View } from 'react-native';

import { SoftMark } from '@/components/ui/SoftMark';
import { type } from '@/constants/theme';
import { useGlobalProcessingActive } from '@/lib/chrome/globalProcessing';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Size = 20 | 36;

/** Soft working glyph (CEO Soft). Pencil retired. Sizes 20 | 36 only. */
export function WorkingMark({ size = 20, accessible = true }: { size?: Size; accessible?: boolean }) {
  return (
    <SoftMark
      size={size}
      mode="working"
      accessible={accessible}
      accessibilityLabel={accessible ? 'Working' : undefined}
    />
  );
}

/**
 * Busy line. Soft glyph always.
 * `driveChromeK` (default true): mounts hold one globalProcessing slot so chrome K
 * goes Soft. Pass false for Opening Kelyra / instant waits that must not Soft chrome.
 */
export function WorkingLine({
  size = 20,
  text = 'Working…',
  driveChromeK = true,
}: {
  size?: Size;
  text?: string;
  /** When false, Soft glyph only — chrome K stays original (Opening Kelyra). */
  driveChromeK?: boolean;
}) {
  const { colors } = useTheme();
  const label = text.replace(/…$/, '').trim() || 'Working';
  useGlobalProcessingActive(driveChromeK);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={styles.line}
    >
      <WorkingMark size={size} accessible={false} />
      <Text style={[type.meta, { color: colors.mute, flexShrink: 1 }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
