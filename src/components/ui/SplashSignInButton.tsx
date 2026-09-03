import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';

/** Neon violet→cyan CTA fill matching the splash wordmark (not app terracotta). */
export const splashCtaGradient = ['#6B4CFF', '#2EC6F0'] as const;
export const splashCtaLabel = '#F5FBFF';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/** Shared neon Sign in CTA for the unified splash auth screen. */
export function SplashSignInButton({ label, onPress, disabled }: Props) {
  return (
    <View style={styles.cta}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.ctaPressable,
          disabled && styles.ctaDisabled,
          pressed && !disabled && styles.ctaPressed,
        ]}
      >
        <LinearGradient
          colors={[...splashCtaGradient]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaLabel}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cta: {
    width: '100%',
    maxWidth: 360,
    shadowColor: '#2EC6F0',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  ctaPressable: {
    width: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(120, 200, 255, 0.35)',
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaGradient: {
    minHeight: 52,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    ...type.button,
    color: splashCtaLabel,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
