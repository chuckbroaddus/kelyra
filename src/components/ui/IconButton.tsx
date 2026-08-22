import { Pressable, StyleSheet, View } from 'react-native';

import { HoverTip, tipIfNew } from '@/components/ui/HoverTip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Tone = 'wash' | 'brand' | 'danger' | 'ghost';
type Size = 'md' | 'lg';

type Props = {
  name: IconName;
  /** Spoken name and hover tip. Keep the old sentence. */
  label: string;
  tooltip?: string;
  onPress: () => void;
  disabled?: boolean;
  size?: Size;
  tone?: Tone;
  /** Recording / live. Red dot on the icon. */
  live?: boolean;
};

const HIT: Record<Size, number> = { md: 44, lg: 64 };
const GLYPH: Record<Size, number> = { md: 22, lg: 28 };

/** Camera and mic hits. Same 44px header target, or a 64px shutter on Capture / Listen. */
export function IconButton({
  name,
  label,
  tooltip,
  onPress,
  disabled,
  size = 'md',
  tone = 'wash',
  live,
}: Props) {
  const { colors, scheme } = useTheme();
  const hit = HIT[size];
  const fill =
    tone === 'brand'
      ? colors.brand
      : tone === 'danger'
        ? colors.danger
        : tone === 'wash'
          ? colors.wash
          : 'transparent';
  const ink =
    tone === 'brand'
      ? colors.brandInk
      : tone === 'danger'
        ? scheme === 'dark'
          ? '#1A120C'
          : '#FFF8F3'
        : colors.ink;

  return (
    <HoverTip label={tipIfNew(label, tooltip)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(live) }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.hit,
          {
            width: hit,
            height: hit,
            borderRadius: hit / 2,
            backgroundColor: fill,
            opacity: disabled ? 0.4 : pressed ? 0.78 : 1,
          },
        ]}
      >
        <Icon name={name} color={ink} size={GLYPH[size]} />
        {live ? <View style={[styles.live, { backgroundColor: colors.danger }]} /> : null}
      </Pressable>
    </HoverTip>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  live: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
