import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
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
 * Idle: original `kelyra.png` only — Soft face is never mounted at rest.
 * Busy (`globalProcessingCount > 0`): Soft + comet. Idle fades out; SoftMark
 * owns blink/grow/orbit intro (no pop of a larger Soft).
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
  const [softMounted, setSoftMounted] = useState(working);

  useEffect(() => {
    if (working) setSoftMounted(true);
    const softTo = working ? 1 : 0;
    const idleTo = working ? 0 : 1;
    if (reduce) {
      softOpacity.setValue(softTo);
      idleOpacity.setValue(idleTo);
      if (!working) setSoftMounted(false);
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
    let unmountTimer: ReturnType<typeof setTimeout> | undefined;
    if (!working) {
      // Let SoftMark outro finish before unmount (SOFT_INTRO.outroMs ≈ 220).
      unmountTimer = setTimeout(() => setSoftMounted(false), 260);
    }

    return () => {
      softAnim.stop();
      idleAnim.stop();
      if (unmountTimer) clearTimeout(unmountTimer);
    };
  }, [working, reduce, softOpacity, idleOpacity]);

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel || undefined}
      accessibilityRole={working ? 'progressbar' : undefined}
      accessibilityState={working ? { busy: true } : undefined}
      collapsable={false}
      style={[{ width: size, height: size, overflow: Platform.OS === 'web' ? 'visible' : 'hidden' }, style]}
    >
      <Animated.View style={[styles.layer, { opacity: idleOpacity }]} pointerEvents="none">
        <Image
          source={brandMark}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          style={{ width: size, height: size }}
        />
      </Animated.View>
      {softMounted ? (
        <View style={styles.layer} pointerEvents="none">
          {/* SoftMark owns intro/outro; wrapper stays fully opaque so Soft is not
              double-faded into a “bigger Soft pop”. */}
          <SoftMark size={size} mode={working ? 'working' : 'static'} accessible={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
