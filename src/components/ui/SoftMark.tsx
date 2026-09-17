import { useEffect, useRef } from 'react';
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

import softFace from '../../../assets/brand/kelyra-soft.png';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

export type SoftMode = 'static' | 'working';

const TX_MS = 200;
const ORBIT_MS = 2450;
const WOBBLE_MS = 1700;

/** Soft brand avatar — modes static | working (CEO Soft peek). Never tint. */
export function SoftMark({
  size,
  mode = 'static',
  style,
  accessibilityLabel,
  accessible = true,
}: {
  size: number;
  mode?: SoftMode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessible?: boolean;
}) {
  const reduce = useReducedMotion();
  const working = mode === 'working';
  const showMotion = working && !reduce;

  const yaw = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const cometOpacity = useRef(new Animated.Value(working ? 1 : 0)).current;

  useEffect(() => {
    // Reduce-motion: comet off; face stays Soft (WK-TX-03).
    const to = working && !reduce ? 1 : 0;
    if (reduce) {
      cometOpacity.setValue(to);
      return;
    }
    const anim = Animated.timing(cometOpacity, {
      toValue: to,
      duration: TX_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => {
      anim.stop();
    };
  }, [working, reduce, cometOpacity]);

  useEffect(() => {
    if (!showMotion) {
      yaw.stopAnimation();
      yaw.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(yaw, {
        toValue: 1,
        duration: ORBIT_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    yaw.setValue(0);
    loop.start();
    return () => {
      loop.stop();
      yaw.setValue(0);
    };
  }, [showMotion, yaw]);

  useEffect(() => {
    if (!showMotion) {
      wobble.stopAnimation();
      wobble.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, {
          toValue: 1,
          duration: WOBBLE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wobble, {
          toValue: 0,
          duration: WOBBLE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    wobble.setValue(0);
    loop.start();
    return () => {
      loop.stop();
      wobble.setValue(0);
    };
  }, [showMotion, wobble]);

  const ball = Math.max(2, size * 0.08);
  const radius = size * 0.41;
  const orbit = size;
  const rotate = yaw.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });
  const faceRotate = wobble.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2.2deg', '2.6deg'],
  });
  const faceScaleX = wobble.interpolate({
    inputRange: [0, 0.35, 0.68, 1],
    outputRange: [1, 1.045, 0.97, 1],
  });
  const faceScaleY = wobble.interpolate({
    inputRange: [0, 0.35, 0.68, 1],
    outputRange: [1, 0.96, 1.03, 1],
  });

  const trail = [
    { angle: 0, scale: 1, opacity: 1 },
    { angle: -28, scale: 0.72, opacity: 0.55 },
    { angle: -56, scale: 0.48, opacity: 0.32 },
    { angle: -84, scale: 0.28, opacity: 0.16 },
  ];

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessible ? accessibilityLabel : undefined}
      accessibilityRole={accessible && working ? 'progressbar' : undefined}
      accessibilityState={accessible && working ? { busy: true } : undefined}
      collapsable={false}
      style={[styles.canvas, { width: size, height: size }, style]}
    >
      {/* Absolute face — transforms must not expand Yoga layout on iOS. */}
      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={[
          styles.layer,
          {
            transform: [{ rotate: faceRotate }, { scaleX: faceScaleX }, { scaleY: faceScaleY }],
          },
        ]}
      >
        <Image
          source={softFace}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          style={{ width: size, height: size }}
        />
      </Animated.View>

      {/* Comet: canted reverse-yaw orbit; trail trails the ball (WK-LOOK-04). */}
      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={[
          styles.gimbal,
          {
            width: orbit,
            height: orbit,
            opacity: cometOpacity,
            transform: [{ rotateZ: '14deg' }, { rotate }],
          },
        ]}
      >
        {trail.map((bit) => (
          <View
            key={bit.angle}
            collapsable={false}
            style={{
              position: 'absolute',
              left: size / 2,
              top: size / 2,
              width: 0,
              height: 0,
              transform: [{ rotate: `${bit.angle}deg` }],
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: radius - (ball * bit.scale) / 2,
                top: -(ball * bit.scale) / 2,
                width: ball * bit.scale,
                height: ball * bit.scale,
                borderRadius: (ball * bit.scale) / 2,
                opacity: bit.opacity,
                backgroundColor: bit.angle === 0 ? '#9AF7FF' : 'rgba(154,247,255,0.85)',
                borderWidth: bit.angle === 0 ? StyleSheet.hairlineWidth : 0,
                borderColor: '#E8FFFF',
              }}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    // Native: clip so Soft/comet never expand the header/tray row.
    // Web: allow slight comet bleed (already OK after PR 116).
    overflow: Platform.OS === 'web' ? 'visible' : 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gimbal: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
