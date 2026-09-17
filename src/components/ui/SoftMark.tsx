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
import { SOFT_INTRO, SOFT_LETTER_SCALE } from '@/components/ui/softLetterScale';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

export type SoftMode = 'static' | 'working';

const ORBIT_MS = 2450;
const WOBBLE_MS = 1700;

/**
 * Soft brand avatar — working look for chrome Soft (CEO Soft peek).
 * Letter scaled by SOFT_LETTER_SCALE to match idle kelyra.png optical size.
 * Intro: blink-open + face/mouth grow + comet zoom into orbit (no larger Soft pop).
 */
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
  const faceGrow = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;
  const faceOpacity = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const cometIn = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) {
      faceGrow.setValue(working ? 1 : 0);
      faceOpacity.setValue(working ? 1 : 0);
      blink.setValue(1);
      cometIn.setValue(working ? 1 : 0);
      return;
    }
    if (working) {
      faceGrow.setValue(0);
      faceOpacity.setValue(0);
      blink.setValue(0);
      cometIn.setValue(0);
      const grow = Animated.timing(faceGrow, {
        toValue: 1,
        duration: SOFT_INTRO.faceMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      const show = Animated.timing(faceOpacity, {
        toValue: 1,
        duration: SOFT_INTRO.faceMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      const blinkOpen = Animated.sequence([
        Animated.timing(blink, {
          toValue: 1,
          duration: SOFT_INTRO.blinkMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blink, {
          toValue: 0.12,
          duration: SOFT_INTRO.blinkMs,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blink, {
          toValue: 1,
          duration: SOFT_INTRO.blinkMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
      const cometZoom = Animated.timing(cometIn, {
        toValue: 1,
        duration: SOFT_INTRO.cometMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      Animated.parallel([grow, show, blinkOpen, cometZoom]).start();
      return;
    }
    const outro = Animated.parallel([
      Animated.timing(faceGrow, {
        toValue: 0,
        duration: SOFT_INTRO.outroMs,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(faceOpacity, {
        toValue: 0,
        duration: SOFT_INTRO.outroMs,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cometIn, {
        toValue: 0,
        duration: SOFT_INTRO.outroMs,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    outro.start();
    return () => {
      outro.stop();
    };
  }, [working, reduce, faceGrow, faceOpacity, blink, cometIn]);

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
    outputRange: [1, 1.01, 0.99, 1],
  });
  const faceScaleY = wobble.interpolate({
    inputRange: [0, 0.35, 0.68, 1],
    outputRange: [1, 0.995, 1.008, 1],
  });

  const growScale = faceGrow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, SOFT_LETTER_SCALE],
  });
  const eyesOpen = Animated.multiply(faceOpacity, blink);
  // Comet zooms from large → rest (falls into orbit).
  const cometScale = cometIn.interpolate({
    inputRange: [0, 1],
    outputRange: [2.35, 1],
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
      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={[
          styles.layer,
          {
            opacity: eyesOpen,
            transform: [
              { rotate: faceRotate },
              { scale: growScale },
              { scaleX: faceScaleX },
              { scaleY: faceScaleY },
            ],
          },
        ]}
      >
        <Image
          source={softFace}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          style={{ width: size, height: size }}
        />
        {/* Mouth grows into smile with faceGrow (scaleX/Y from nothing). */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.mouth,
            {
              width: size * 0.2,
              height: size * 0.07,
              borderRadius: size * 0.07,
              bottom: size * 0.27,
              opacity: faceGrow,
              transform: [
                {
                  scaleX: faceGrow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.12, 1],
                  }),
                },
                {
                  scaleY: faceGrow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.15, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={[
          styles.gimbal,
          {
            width: orbit,
            height: orbit,
            opacity: cometIn,
            transform: [{ rotateZ: '14deg' }, { scale: cometScale }, { rotate }],
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
    overflow: Platform.OS === 'web' ? 'visible' : 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mouth: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(40, 30, 50, 0.5)',
  },
  gimbal: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
