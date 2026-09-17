import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import brandMark from '../../../assets/brand/kelyra.png';

import { SoftMark, type SoftMode } from '@/components/ui/SoftMark';
import { useChromeKWorking } from '@/lib/chrome/globalProcessing';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

/** Idle chrome brand source — original K (no Soft face). Never tint. */
export const kelyraMarkSource = brandMark;

const TX_MS = 200;

/**
 * Chrome brand K (K1/K3/K4/K5).
 * Idle: original `kelyra.png`. Working (`globalProcessingCount > 0`): Soft + comet.
 * Forced `mode` overrides chrome SoT (tests).
 */
export function KelyraMark({
  size,
  style,
  accessibilityLabel = 'Kelyra',
  mode,
}: {
  size: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  mode?: SoftMode;
}) {
  const chromeWorking = useChromeKWorking();
  const reduce = useReducedMotion();
  const effective: SoftMode = mode ?? (chromeWorking ? 'working' : 'static');
  const working = effective === 'working';

  const softOpacity = useRef(new Animated.Value(working ? 1 : 0)).current;
  const idleOpacity = useRef(new Animated.Value(working ? 0 : 1)).current;

  useEffect(() => {
    const softTo = working ? 1 : 0;
    const idleTo = working ? 0 : 1;
    if (reduce) {
      softOpacity.setValue(softTo);
      idleOpacity.setValue(idleTo);
      return;
    }
    const softAnim = Animated.timing(softOpacity, {
      toValue: softTo,
      duration: TX_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const idleAnim = Animated.timing(idleOpacity, {
      toValue: idleTo,
      duration: TX_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    softAnim.start();
    idleAnim.start();
    return () => {
      softAnim.stop();
      idleAnim.stop();
    };
  }, [working, reduce, softOpacity, idleOpacity]);

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel || undefined}
      accessibilityRole={working ? 'progressbar' : undefined}
      accessibilityState={working ? { busy: true } : undefined}
      style={[{ width: size, height: size }, style]}
    >
      <Animated.View style={[styles.layer, { opacity: idleOpacity }]} pointerEvents="none">
        <Image
          source={brandMark}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          style={{ width: size, height: size }}
        />
      </Animated.View>
      <Animated.View style={[styles.layer, { opacity: softOpacity }]} pointerEvents="none">
        <SoftMark
          size={size}
          mode={working ? 'working' : 'static'}
          accessible={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
