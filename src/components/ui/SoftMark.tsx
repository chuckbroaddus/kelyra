import { useEffect, useMemo, useRef } from 'react';
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
import {
  COMET_ORBIT,
  LETTER_INK,
  SOFT_FACE,
  SOFT_INTRO,
  SOFT_MOTION,
} from '@/components/ui/softLetterScale';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

export type SoftMode = 'static' | 'working';

const WEB_YAW_STYLE_ID = 'kelyra-soft-comet-yaw-css';

/** Inject SoT-style infinite yaw CSS once (web). Avoids RN-web Animated.loop hang. */
function ensureSoftCometYawCss(durationMs: number) {
  if (Platform.OS !== 'web') return;
  const doc = typeof document !== 'undefined' ? document : undefined;
  if (!doc?.head) return;
  let el = doc.getElementById(WEB_YAW_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = WEB_YAW_STYLE_ID;
    doc.head.appendChild(el);
  }
  // HTML SoT yaw-rev; target #nativeID (RN-web sets id). Never className on RN View.
  el.textContent =
    `@keyframes ${COMET_ORBIT.webYawKeyframes}{to{transform:rotate(${COMET_ORBIT.yawToDeg}deg)}}` +
    `#${COMET_ORBIT.webYawNativeId}{animation:${COMET_ORBIT.webYawKeyframes} ${durationMs}ms linear infinite;transform-origin:50% 50%}`;
}


const u = (size: number, n: number) => (size * n) / LETTER_INK.canvas;

/**
 * Soft v8b working mark — idle `kelyra.png` letter 1:1 + vector face + comet.
 * Morph (intro/outro) owns lids/smile/comet; look loop independent of blink;
 * wobble is rotate-only (no letter scale-up).
 * Comet: oval + yaw −360; web CSS via nativeID (no RN className); native Animated.
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

  const faceGrow = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;
  const faceOpacity = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;
  const lids = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;
  const mouth = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;
  const cometIn = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const lookX = useRef(new Animated.Value(0)).current;
  const lookY = useRef(new Animated.Value(0)).current;
  const pupilX = useRef(new Animated.Value(0)).current;
  const pupilY = useRef(new Animated.Value(0)).current;
  const yaw = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;

  // Intro / outro morph
  useEffect(() => {
    if (reduce) {
      faceGrow.setValue(working ? 1 : 0);
      faceOpacity.setValue(working ? 1 : 0);
      lids.setValue(working ? 1 : 0);
      mouth.setValue(working ? 1 : 0);
      cometIn.setValue(working ? 1 : 0);
      blink.setValue(1);
      return;
    }
    if (working) {
      faceGrow.setValue(0);
      faceOpacity.setValue(0);
      lids.setValue(0);
      mouth.setValue(0);
      cometIn.setValue(0);
      blink.setValue(0);
      const blinkOpen = Animated.sequence([
        Animated.timing(lids, {
          toValue: 1,
          duration: SOFT_INTRO.blinkMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blink, {
          toValue: 0.08,
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
      Animated.parallel([
        Animated.timing(faceGrow, {
          toValue: 1,
          duration: SOFT_INTRO.faceMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(faceOpacity, {
          toValue: 1,
          duration: SOFT_INTRO.faceMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(mouth, {
          toValue: 1,
          duration: SOFT_INTRO.faceMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        blinkOpen,
        Animated.timing(cometIn, {
          toValue: 1,
          duration: SOFT_INTRO.cometMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
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
      Animated.timing(mouth, {
        toValue: 0,
        duration: SOFT_INTRO.outroMs,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lids, {
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
  }, [working, reduce, faceGrow, faceOpacity, lids, mouth, cometIn, blink]);

  // Blink loop (independent of look) — 4.4s
  useEffect(() => {
    if (!showMotion) {
      blink.stopAnimation();
      blink.setValue(1);
      return;
    }
    const closeMs = 90;
    const openMs = 110;
    const hold = Math.max(400, SOFT_MOTION.blinkPeriodMs - closeMs - openMs);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(hold),
        Animated.timing(blink, {
          toValue: 0.06,
          duration: closeMs,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blink, {
          toValue: 1,
          duration: openMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      blink.setValue(1);
    };
  }, [showMotion, blink]);

  // Glance / look loop (~8s), independent of blink.
  // Path: right → pause → center → pause → upper-left → pause → right → pause → center → pause
  useEffect(() => {
    if (!showMotion) {
      lookX.stopAnimation();
      lookY.stopAnimation();
      pupilX.stopAnimation();
      pupilY.stopAnimation();
      lookX.setValue(0);
      lookY.setValue(0);
      pupilX.setValue(0);
      pupilY.setValue(0);
      return;
    }
    const move = 220;
    const pause = 580;
    // Normalized look targets (group); pupils exaggerate ~1.7×
    const right = { x: 1, y: 0.05 };
    const center = { x: 0, y: 0 };
    const upperLeft = { x: -0.85, y: -0.7 };
    const go = (t: { x: number; y: number }) =>
      Animated.parallel([
        Animated.timing(lookX, {
          toValue: t.x,
          duration: move,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(lookY, {
          toValue: t.y,
          duration: move,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pupilX, {
          toValue: t.x * 1.7,
          duration: move,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pupilY, {
          toValue: t.y * 1.7,
          duration: move,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
    const loop = Animated.loop(
      Animated.sequence([
        go(right),
        Animated.delay(pause),
        go(center),
        Animated.delay(pause),
        go(upperLeft),
        Animated.delay(pause),
        go(right),
        Animated.delay(pause),
        go(center),
        Animated.delay(pause),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [showMotion, lookX, lookY, pupilX, pupilY]);

  // Yaw orbit 2.45s — native Animated only. Web uses CSS (SoT); RN-web loop hangs ~2 orbits.
  useEffect(() => {
    if (Platform.OS === 'web') {
      ensureSoftCometYawCss(SOFT_MOTION.orbitMs);
      return;
    }
    if (!showMotion) {
      yaw.stopAnimation();
      yaw.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(yaw, {
        toValue: 1,
        duration: SOFT_MOTION.orbitMs,
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

  // Wobble: rotate only (no letter scale grow)
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
          duration: SOFT_MOTION.wobbleMs / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wobble, {
          toValue: 0,
          duration: SOFT_MOTION.wobbleMs / 2,
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

  const letterH = size * (LETTER_INK.height / LETTER_INK.canvas);
  const letterCx = u(size, LETTER_INK.cx);
  const letterCy = u(size, LETTER_INK.cy);
  const ball = Math.max(2, letterH * COMET_ORBIT.ballOfLetter);
  const orbitR = letterH * COMET_ORBIT.radiusOfLetter;
  const gimbal = letterH * COMET_ORBIT.gimbalOfLetter;
  const ovalY = COMET_ORBIT.ovalY;

  // Screen-plane yaw — +360 matches HTML yaw-rev on iPhone (not Z −360 circle).
  const rotate = yaw.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${COMET_ORBIT.yawToDeg}deg`],
  });
  // Near/far: larger in front, smaller in back (fake translateZ).
  const ballDepthScale = yaw.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1.22, 0.92, 0.72, 0.92, 1.22],
  });
  const wobbleRotate = wobble.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2.2deg', '2.6deg'],
  });
  const cometScale = cometIn.interpolate({
    inputRange: [0, 1],
    outputRange: [2.35, 1],
  });
  const faceScale = faceGrow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });
  const lidsOpen = Animated.multiply(
    Animated.multiply(lids, blink),
    faceOpacity,
  );
  const lookTX = lookX.interpolate({
    inputRange: [-1, 1],
    outputRange: [-u(size, 7), u(size, 7)],
  });
  const lookTY = lookY.interpolate({
    inputRange: [-1, 1],
    outputRange: [-u(size, 6), u(size, 6)],
  });
  const pupilTX = pupilX.interpolate({
    inputRange: [-1.7, 1.7],
    outputRange: [-u(size, 5.5), u(size, 5.5)],
  });
  const pupilTY = pupilY.interpolate({
    inputRange: [-1.7, 1.7],
    outputRange: [-u(size, 4.5), u(size, 4.5)],
  });

  // Trail covers ~75% of orbit (taper) — denser near ball
  const trail = useMemo(
    () => [
      { angle: 0, scale: 1, opacity: 1 },
      { angle: -22, scale: 0.82, opacity: 0.72 },
      { angle: -44, scale: 0.64, opacity: 0.52 },
      { angle: -68, scale: 0.48, opacity: 0.36 },
      { angle: -96, scale: 0.34, opacity: 0.24 },
      { angle: -128, scale: 0.22, opacity: 0.14 },
      { angle: -168, scale: 0.14, opacity: 0.08 },
      { angle: -210, scale: 0.08, opacity: 0.04 },
    ],
    [],
  );

  const eyeR = u(size, SOFT_FACE.eyeR);
  const pupilR = u(size, SOFT_FACE.pupilR);
  const gL = u(size, SOFT_FACE.glassesLeftR);
  const gR = u(size, SOFT_FACE.glassesRightR);
  const mouthW = u(size, SOFT_FACE.mouth.halfW * 2);
  const mouthH = u(size, 12);

  const placeEye = (ex: number, ey: number) => ({
    position: 'absolute' as const,
    left: u(size, ex) - eyeR,
    top: u(size, ey) - eyeR,
    width: eyeR * 2,
    height: eyeR * 2,
    borderRadius: eyeR,
  });

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
            transform: [{ rotate: wobbleRotate }],
          },
        ]}
      >
        {/* Letter = idle kelyra.png 1:1 (same contain as chrome idle). */}
        <Image
          source={brandMark}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          style={{ width: size, height: size }}
        />

        <Animated.View
          pointerEvents="none"
          collapsable={false}
          style={[
            styles.layer,
            {
              opacity: faceOpacity,
              transform: [{ scale: faceScale }],
            },
          ]}
        >
          {/* Look group: eyes + glasses share glance path */}
          <Animated.View
            collapsable={false}
            style={[
              styles.layer,
              {
                transform: [{ translateX: lookTX }, { translateY: lookTY }],
              },
            ]}
          >
            {/* Left eye */}
            <View style={[placeEye(SOFT_FACE.leftEye.x, SOFT_FACE.leftEye.y), styles.eyeWhite]}>
              <Animated.View
                style={{
                  position: 'absolute',
                  left: eyeR - pupilR,
                  top: eyeR - pupilR,
                  width: pupilR * 2,
                  height: pupilR * 2,
                  borderRadius: pupilR,
                  backgroundColor: '#1A1228',
                  transform: [{ translateX: pupilTX }, { translateY: pupilTY }],
                }}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: '#2A1E3A',
                    borderRadius: eyeR,
                    opacity: Animated.subtract(1, lidsOpen),
                    transform: [{ scaleY: Animated.subtract(1, lidsOpen) }],
                  },
                ]}
              />
            </View>

            {/* Right eye */}
            <View style={[placeEye(SOFT_FACE.rightEye.x, SOFT_FACE.rightEye.y), styles.eyeWhite]}>
              <Animated.View
                style={{
                  position: 'absolute',
                  left: eyeR - pupilR,
                  top: eyeR - pupilR,
                  width: pupilR * 2,
                  height: pupilR * 2,
                  borderRadius: pupilR,
                  backgroundColor: '#1A1228',
                  transform: [{ translateX: pupilTX }, { translateY: pupilTY }],
                }}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: '#2A1E3A',
                    borderRadius: eyeR,
                    opacity: Animated.subtract(1, lidsOpen),
                    transform: [{ scaleY: Animated.subtract(1, lidsOpen) }],
                  },
                ]}
              />
            </View>

            {/* Glasses — left / right rings + shortened arch bridge */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: u(size, SOFT_FACE.leftEye.x) - gL,
                top: u(size, SOFT_FACE.leftEye.y) - gL,
                width: gL * 2,
                height: gL * 2,
                borderRadius: gL,
                borderWidth: Math.max(1.2, u(size, 2.4)),
                borderColor: 'rgba(30, 22, 48, 0.92)',
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: u(size, SOFT_FACE.rightEye.x) - gR,
                top: u(size, SOFT_FACE.rightEye.y) - gR,
                width: gR * 2,
                height: gR * 2,
                borderRadius: gR,
                borderWidth: Math.max(1.2, u(size, 2.4)),
                borderColor: 'rgba(30, 22, 48, 0.92)',
              }}
            />
            {/* Shortened arch bridge */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: u(size, (SOFT_FACE.leftEye.x + SOFT_FACE.rightEye.x) / 2) - u(size, 14),
                top: u(size, SOFT_FACE.leftEye.y) - u(size, 10),
                width: u(size, 28),
                height: u(size, 14),
                borderTopWidth: Math.max(1.2, u(size, 2.2)),
                borderLeftWidth: Math.max(1, u(size, 1.6)),
                borderRightWidth: Math.max(1, u(size, 1.6)),
                borderBottomWidth: 0,
                borderColor: 'rgba(30, 22, 48, 0.92)',
                borderTopLeftRadius: u(size, 16),
                borderTopRightRadius: u(size, 16),
                backgroundColor: 'transparent',
              }}
            />
          </Animated.View>

          {/* Mouth — grows into smile; no nose */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: u(size, SOFT_FACE.mouth.x) - mouthW / 2,
              top: u(size, SOFT_FACE.mouth.y) - mouthH / 2,
              width: mouthW,
              height: mouthH,
              borderRadius: mouthH,
              backgroundColor: 'rgba(40, 30, 50, 0.55)',
              opacity: mouth,
              transform: [
                {
                  scaleX: mouth.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.12, 1],
                  }),
                },
                {
                  scaleY: mouth.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.15, 1],
                  }),
                },
              ],
            }}
          />
        </Animated.View>
      </Animated.View>

      {/* Comet: oval beads + yaw-rev. Web = CSS infinite; native = Animated (no rotateX). */}
      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={{
          position: 'absolute',
          left: letterCx - gimbal / 2,
          top: letterCy - gimbal / 2,
          width: gimbal,
          height: gimbal,
          opacity: cometIn,
          transform: [{ rotateZ: `${COMET_ORBIT.cantZDeg}deg` }, { scale: cometScale }],
        }}
      >
        {/* Web: CSS yaw via nativeID → #id selector. Zero className on RN View/Animated.View. */}
        {Platform.OS === 'web' ? (
          <View
            pointerEvents="none"
            collapsable={false}
            nativeID={showMotion ? COMET_ORBIT.webYawNativeId : undefined}
            style={{ width: gimbal, height: gimbal }}
          >
            {trail.map((bit) => {
              const rad = (bit.angle * Math.PI) / 180;
              const ox = orbitR * Math.cos(rad);
              const oy = orbitR * Math.sin(rad) * ovalY;
              const isLead = bit.angle === 0;
              return (
                <View
                  key={bit.angle}
                  style={{
                    position: 'absolute',
                    left: gimbal / 2 + ox - (ball * bit.scale) / 2,
                    top: gimbal / 2 + oy - (ball * bit.scale) / 2,
                    width: ball * bit.scale,
                    height: ball * bit.scale,
                    borderRadius: (ball * bit.scale) / 2,
                    opacity: bit.opacity,
                    backgroundColor: isLead ? '#9AF7FF' : 'rgba(154,247,255,0.85)',
                    borderWidth: isLead ? StyleSheet.hairlineWidth : 0,
                    borderColor: '#E8FFFF',
                  }}
                />
              );
            })}
          </View>
        ) : (
          <Animated.View
            pointerEvents="none"
            collapsable={false}
            style={{
              width: gimbal,
              height: gimbal,
              transform: [{ rotate: showMotion ? rotate : '0deg' }],
            }}
          >
            {trail.map((bit) => {
              const rad = (bit.angle * Math.PI) / 180;
              const ox = orbitR * Math.cos(rad);
              const oy = orbitR * Math.sin(rad) * ovalY;
              const isLead = bit.angle === 0;
              const bead = (
                <View
                  style={{
                    position: 'absolute',
                    left: gimbal / 2 + ox - (ball * bit.scale) / 2,
                    top: gimbal / 2 + oy - (ball * bit.scale) / 2,
                    width: ball * bit.scale,
                    height: ball * bit.scale,
                    borderRadius: (ball * bit.scale) / 2,
                    opacity: bit.opacity,
                    backgroundColor: isLead ? '#9AF7FF' : 'rgba(154,247,255,0.85)',
                    borderWidth: isLead ? StyleSheet.hairlineWidth : 0,
                    borderColor: '#E8FFFF',
                  }}
                />
              );
              if (isLead) {
                return (
                  <Animated.View key={bit.angle} style={{ transform: [{ scale: ballDepthScale }] }}>
                    {bead}
                  </Animated.View>
                );
              }
              return <View key={bit.angle}>{bead}</View>;
            })}
          </Animated.View>
        )}
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
  eyeWhite: {
    backgroundColor: '#F7F4FF',
    overflow: 'hidden',
  },
});
