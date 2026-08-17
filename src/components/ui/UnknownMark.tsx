import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  size?: number;
  /** Stroke color. Defaults to `mute`. */
  color?: string;
  /** Wash circle that matches `Avatar`. Tray and photoless rows use this. */
  framed?: boolean;
};

/**
 * Vacant seat: a hollow head + open shoulders in a wash disk.
 * Not a “?”, not a delete X, not initials of a real name.
 */
export function UnknownMark({ size = 56, color, framed = true }: Props) {
  const { colors } = useTheme();
  const ink = color ?? colors.mute;
  const s = size / 56;
  const stroke = Math.max(1.5, 2 * s);
  const head = 14 * s;
  const gap = 4 * s;
  const bustW = 26 * s;
  const bustH = 12 * s;

  const face = (
    <View style={styles.stack}>
      <View
        style={{
          width: head,
          height: head,
          borderRadius: head / 2,
          borderWidth: stroke,
          borderColor: ink,
        }}
      />
      <View style={{ height: gap }} />
      <View
        style={{
          width: bustW,
          height: bustH,
          borderTopLeftRadius: bustW / 2,
          borderTopRightRadius: bustW / 2,
          borderWidth: stroke,
          borderBottomWidth: 0,
          borderColor: ink,
        }}
      />
    </View>
  );

  if (!framed) {
    return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{face}</View>;
  }

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.wash,
          borderColor: colors.line,
        },
      ]}
    >
      {face}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'visible',
  },
  stack: {
    alignItems: 'center',
  },
});
