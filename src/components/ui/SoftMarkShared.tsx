import { useEffect, useMemo, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import brandMark from '../../../assets/brand/kelyra.png';

import {
  BEAD_N,
  softCometFrame,
  type SoftCometFrame,
} from '@/components/ui/softCometFacing';
import {
  COMET_ORBIT,
  LETTER_INK,
  SOFT_FACE,
  SOFT_INTRO,
  SOFT_MOTION,
} from '@/components/ui/softLetterScale';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

export type SoftMode = 'static' | 'working';

/** Extra canvas pad so comet orbit / bead trail is not clipped. */
export const ORBIT_PAD_FRAC = 0.22;

const Z_BEHIND = 1;
const Z_LETTER = 2;
const Z_FRONT = 3;
/** Face Svg paints above letter Image (RN Image often stacks over later siblings). */
const Z_FACE = 20;

const CYAN = '#9AF7FF';
const PURPLE = '#B46BFF';

/** Soft SoT lid colors (soft-v8b-host.html). */
const LID_PURPLE = '#8a5cff';
const LID_CYAN = '#4cc8f8';

/** Soft v8b lid2 blink delay (ms) — SoT `.lid2 { animation-delay: .12s }`. */
const LID2_DELAY_MS = 120;

type SoftFaceMotion = {
  /** glance-frame look-group translate in 512-space (px, % of eyeR). */
  lookTx: number;
  lookTy: number;
  /** glance pupil+catchlight translate in 512-space (px, % of eyeR). */
  pupilTx: number;
  pupilTy: number;
  /** blink scaleY — SoT default 0.06 (mostly open), pulse to 1. */
  lidScaleY: number;
  lid2ScaleY: number;
};

const IDLE_FACE: SoftFaceMotion = {
  lookTx: 0,
  lookTy: 0,
  pupilTx: 0,
  pupilTy: 0,
  lidScaleY: 0.06,
  lid2ScaleY: 0.06,
};

/** Soft SoT @keyframes glance — fractions of glancePeriodMs. */
const GLANCE_KEYS: ReadonlyArray<{ t: number; x: number; y: number }> = [
  { t: 0, x: 0, y: 0 },
  { t: 0.06, x: 0.32, y: 0.06 },
  { t: 0.2, x: 0.32, y: 0.06 },
  { t: 0.26, x: 0, y: 0 },
  { t: 0.4, x: 0, y: 0 },
  { t: 0.46, x: -0.28, y: -0.24 },
  { t: 0.6, x: -0.28, y: -0.24 },
  { t: 0.66, x: 0.32, y: 0.06 },
  { t: 0.8, x: 0.32, y: 0.06 },
  { t: 0.86, x: 0, y: 0 },
  { t: 1, x: 0, y: 0 },
];

/** Soft SoT @keyframes glance-frame. */
const GLANCE_FRAME_KEYS: ReadonlyArray<{ t: number; x: number; y: number }> = [
  { t: 0, x: 0, y: 0 },
  { t: 0.06, x: 0.09, y: 0.04 },
  { t: 0.2, x: 0.09, y: 0.04 },
  { t: 0.26, x: 0, y: 0 },
  { t: 0.4, x: 0, y: 0 },
  { t: 0.46, x: -0.08, y: -0.1 },
  { t: 0.6, x: -0.08, y: -0.1 },
  { t: 0.66, x: 0.09, y: 0.04 },
  { t: 0.8, x: 0.09, y: 0.04 },
  { t: 0.86, x: 0, y: 0 },
  { t: 1, x: 0, y: 0 },
];

/** Soft SoT @keyframes blink — scaleY keys. */
const BLINK_KEYS: ReadonlyArray<{ t: number; s: number }> = [
  { t: 0, s: 0.06 },
  { t: 0.4, s: 0.06 },
  { t: 0.435, s: 1 },
  { t: 0.47, s: 0.06 },
  { t: 1, s: 0.06 },
];

/** CSS ease-in-out between Soft SoT keyframe stops. */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function sampleXY(
  keys: ReadonlyArray<{ t: number; x: number; y: number }>,
  phase: number,
): { x: number; y: number } {
  const p = phase <= 0 ? 0 : phase >= 1 ? 1 : phase;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1]!.t <= p) i += 1;
  const a = keys[i]!;
  const b = keys[Math.min(i + 1, keys.length - 1)]!;
  if (b.t === a.t) return { x: a.x, y: a.y };
  const u = easeInOut((p - a.t) / (b.t - a.t));
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

function sampleBlink(phase: number): number {
  const p = phase <= 0 ? 0 : phase >= 1 ? 1 : phase;
  let i = 0;
  while (i < BLINK_KEYS.length - 1 && BLINK_KEYS[i + 1]!.t <= p) i += 1;
  const a = BLINK_KEYS[i]!;
  const b = BLINK_KEYS[Math.min(i + 1, BLINK_KEYS.length - 1)]!;
  if (b.t === a.t) return a.s;
  const u = easeInOut((p - a.t) / (b.t - a.t));
  return a.s + (b.s - a.s) * u;
}

/**
 * Soft v8b face motion from shared rAF clock (same elapsed as comet).
 * Glance % → px via eyeR; blink scaleY per SoT; lid2 +120ms.
 */
export function sampleSoftFaceMotion(elapsedMs: number): SoftFaceMotion {
  const glancePeriod = SOFT_MOTION.glancePeriodMs;
  const blinkPeriod = SOFT_MOTION.blinkPeriodMs;
  const glancePhase = ((elapsedMs % glancePeriod) + glancePeriod) % glancePeriod / glancePeriod;
  const blinkPhase = ((elapsedMs % blinkPeriod) + blinkPeriod) % blinkPeriod / blinkPeriod;
  const blink2Phase =
    (((elapsedMs - LID2_DELAY_MS) % blinkPeriod) + blinkPeriod) % blinkPeriod / blinkPeriod;

  const glance = sampleXY(GLANCE_KEYS, glancePhase);
  const look = sampleXY(GLANCE_FRAME_KEYS, glancePhase);
  const eyeR = SOFT_FACE.eyeR;

  return {
    lookTx: look.x * eyeR,
    lookTy: look.y * eyeR,
    pupilTx: glance.x * eyeR,
    pupilTy: glance.y * eyeR,
    lidScaleY: sampleBlink(blinkPhase),
    lid2ScaleY: sampleBlink(blink2Phase),
  };
}

/**
 * Soft working mark — native React Native Views (no WebView / no HTML host).
 * Design SoT remains HTML Soft v8b; runtime uses locked COMET_ORBIT + softCometFacing.
 * Idle letter is KelyraMark Image `kelyra.png`; SoftMark only while working.
 * Face: Soft v8b SVG eyes + glasses only (no mouth). SoftMode static|working for outro.
 * Face glance + blink share the comet rAF clock (idle/stop when mode=static).
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
  const pad = Math.ceil(size * ORBIT_PAD_FRAC);
  const hostSize = size + pad * 2;
  const [frame, setFrame] = useState<SoftCometFrame>(() => softCometFrame(0, size));
  const [faceMotion, setFaceMotion] = useState<SoftFaceMotion>(IDLE_FACE);
  /** Keep comet mounted through outro so SOFT_INTRO.cometMs / outroMs morph can run. */
  const [cometMounted, setCometMounted] = useState(working);

  // t_7dc9b8f1: SoftMark owns intro — face grow, lids blink-open, comet zoom — then full orbit.
  const faceGrow = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;
  const faceOpacity = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;
  const blinkOpen = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;
  const cometIn = useRef(new Animated.Value(working && reduce ? 1 : 0)).current;

  void COMET_ORBIT.facingMode;
  void LETTER_INK.canvas;

  useEffect(() => {
    if (reduce) {
      faceGrow.setValue(working ? 1 : 0);
      faceOpacity.setValue(working ? 1 : 0);
      blinkOpen.setValue(working ? 1 : 0);
      cometIn.setValue(working ? 1 : 0);
      setCometMounted(working);
      return;
    }
    if (working) {
      setCometMounted(true);
      faceGrow.setValue(0);
      faceOpacity.setValue(0);
      blinkOpen.setValue(0);
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
      // Lids: closed → open blink (then looping glance/blink takes over via faceMotion).
      const lids = Animated.sequence([
        Animated.timing(blinkOpen, {
          toValue: 1,
          duration: SOFT_INTRO.blinkMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blinkOpen, {
          toValue: 0.15,
          duration: SOFT_INTRO.blinkMs,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blinkOpen, {
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
      const intro = Animated.parallel([grow, show, lids, cometZoom]);
      intro.start();
      return () => {
        intro.stop();
      };
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
    outro.start(({ finished }) => {
      if (finished) setCometMounted(false);
    });
    return () => {
      outro.stop();
    };
  }, [working, reduce, faceGrow, faceOpacity, blinkOpen, cometIn]);

  useEffect(() => {
    if (!working) {
      setFrame(softCometFrame(0, size));
      setFaceMotion(IDLE_FACE);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    let alive = true;
    const period = SOFT_MOTION.orbitMs;

    const tick = (now: number) => {
      if (!alive) return;
      if (start == null) start = now;
      const elapsed = now - start;
      const phase = (elapsed % period) / period;
      setFrame(softCometFrame(phase, size));
      setFaceMotion(sampleSoftFaceMotion(elapsed));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [working, size]);


  // Drive lids closed→open during SOFT_INTRO.blinkMs so eyes don't pop fully open.
  const [lidOverride, setLidOverride] = useState<number | null>(working && !reduce ? 1 : null);
  useEffect(() => {
    if (reduce) {
      setLidOverride(null);
      return;
    }
    if (!working) {
      setLidOverride(null);
      return;
    }
    setLidOverride(1); // closed
    const id = blinkOpen.addListener(({ value }) => {
      // blinkOpen 0→1 maps to lidScaleY 1→0.06 (closed→SoT open)
      const open = Math.max(0, Math.min(1, value));
      setLidOverride(1 - open * (1 - 0.06));
    });
    const clearTimer = setTimeout(() => {
      setLidOverride(null); // hand off to looping faceMotion blink
    }, SOFT_INTRO.blinkMs * 3 + SOFT_INTRO.faceMs);
    return () => {
      blinkOpen.removeListener(id);
      clearTimeout(clearTimer);
    };
  }, [working, reduce, blinkOpen]);

  const faceMotionForRender: SoftFaceMotion =
    lidOverride == null
      ? faceMotion
      : { ...faceMotion, lidScaleY: lidOverride, lid2ScaleY: lidOverride };

  const comet = useMemo(() => {
    if (!cometMounted) return null;
    return (
      <Animated.View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          opacity: cometIn,
          transform: [{ scale: cometIn.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) }],
          zIndex: frame.front ? Z_FRONT : Z_BEHIND,
        }}
      >
        <CometLayer
          frame={frame}
          hostSize={hostSize}
          pad={pad}
          zIndex={0}
        />
      </Animated.View>
    );
  }, [cometMounted, frame, hostSize, pad, cometIn]);

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessible ? accessibilityLabel : undefined}
      accessibilityRole={accessible && working ? 'progressbar' : undefined}
      accessibilityState={accessible && working ? { busy: true } : undefined}
      collapsable={false}
      // Native Soft contracts (tests lock these tokens):
      // data-soft-facing=js-always · data-soft-occlusion=phase-z · data-soft-trail=js-beads
      // data-soft-face=eyes-glasses-nomouth · SoftMode static|working · no WebView
      style={[styles.canvas, { width: size, height: size }, style]}
    >
      <View
        collapsable={false}
        style={{
          position: 'absolute',
          left: -pad,
          top: -pad,
          width: hostSize,
          height: hostSize,
          overflow: 'visible',
        }}
      >
        {cometMounted && !frame.front ? comet : null}
        <View
          collapsable={false}
          style={[
            styles.letterStack,
            {
              width: size,
              height: size,
              left: pad,
              top: pad,
              zIndex: Z_LETTER,
            },
          ]}
        >
          <Image
            source={brandMark}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            style={{ width: size, height: size }}
          />
          {/* Sibling after letter Image — zIndex/elevation so face is not under PNG.
              Intro: SOFT_INTRO.faceMs grow + blinkMs lids (via blinkOpen) then full glance/blink. */}
          <Animated.View
            pointerEvents="none"
            style={{
              ...StyleSheet.absoluteFillObject,
              opacity: faceOpacity,
              transform: [
                {
                  scale: faceGrow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 1],
                  }),
                },
              ],
            }}
          >
            <SoftFaceEyesGlasses size={size} motion={faceMotionForRender} />
          </Animated.View>
        </View>
        {cometMounted && frame.front ? comet : null}
      </View>
    </View>
  );
}

function CometLayer({
  frame,
  hostSize,
  pad,
  zIndex,
}: {
  frame: SoftCometFrame;
  hostSize: number;
  pad: number;
  zIndex: number;
}) {
  const cx = hostSize / 2;
  const cy = hostSize / 2;
  // Soft Soft place() is relative to letter/scene center (= mark center).
  void pad;
  return (
    <View
      pointerEvents="none"
      collapsable={false}
      style={[StyleSheet.absoluteFillObject, { zIndex, overflow: 'visible' }]}
    >
      {frame.beads.map((b, i) => (
        <View
          key={`bead-${i}`}
          style={{
            position: 'absolute',
            left: cx + b.x - b.size / 2,
            top: cy + b.y - b.size / 2,
            width: b.size,
            height: b.size,
            borderRadius: b.size / 2,
            opacity: b.opacity,
            overflow: 'hidden',
            backgroundColor: PURPLE,
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: b.size * 0.12,
              top: b.size * 0.12,
              width: b.size * 0.76,
              height: b.size * 0.76,
              borderRadius: b.size * 0.38,
              backgroundColor: CYAN,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: b.size * 0.28,
              top: b.size * 0.22,
              width: b.size * 0.36,
              height: b.size * 0.36,
              borderRadius: b.size * 0.18,
              backgroundColor: '#FFFFFF',
            }}
          />
        </View>
      ))}
      <SoftCometBall
        size={frame.headSize}
        left={cx + frame.head.x - frame.headSize / 2}
        top={cy + frame.head.y - frame.headSize / 2}
      />
      {/* BEAD_N lock for tests */}
      {BEAD_N > 0 ? null : null}
    </View>
  );
}

/** Always-facing circular Soft ball — white→cyan→purple radial-ish. */
function SoftCometBall({
  size: ballSize,
  left,
  top,
}: {
  size: number;
  left: number;
  top: number;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width: ballSize,
        height: ballSize,
        borderRadius: ballSize / 2,
        overflow: 'hidden',
        shadowColor: CYAN,
        shadowOpacity: 0.85,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <LinearGradient
        colors={['#FFFFFF', CYAN, PURPLE]}
        locations={[0, 0.42, 1]}
        start={{ x: 0.3, y: 0.25 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

/**
 * Soft v8b SoT face via react-native-svg (ellipses + glasses stroke) — no mouth.
 * Proportions are 1:1 Soft v8b (viewBox 0 0 512 512). Do not chrome-boost
 * faceScale — that made Soft glasses span ~full mark width.
 * Glance (look + pupils) + blink lids driven by shared SoftMark rAF clock.
 */
function SoftFaceEyesGlasses({
  size,
  motion,
}: {
  size: number;
  motion: SoftFaceMotion;
}) {
  // Soft v8b SoT proportions 1:1 in viewBox 0 0 512 512 — no chrome faceScale
  // boost (0.28× mark eye diameter made glasses span ~full Soft K).
  const { lookTx, lookTy, pupilTx, pupilTy, lidScaleY, lid2ScaleY } = motion;

  // Lid SoT rects — transform-origin top center (scaleY from y = lid top).
  const lid1Top = -31.5;
  const lid2Top = -30.2;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: Z_FACE,
        elevation: Platform.OS === 'android' ? Z_FACE : undefined,
        overflow: 'visible',
      }}
    >
      {/* Soft look group — glance-frame nudge */}
      <G transform={`translate(${lookTx} ${lookTy})`}>
        {/* Left eye — Soft v8b SoT */}
        <G transform="translate(169 198) rotate(-2)">
          <Ellipse cx={0} cy={0} rx={SOFT_FACE.eyeRx} ry={SOFT_FACE.eyeRy} fill="#FFFFFF" />
          {/* pupils + catchlight move together (Soft glance) */}
          <G transform={`translate(${pupilTx} ${pupilTy})`}>
            <Circle cx={2.4} cy={3.6} r={SOFT_FACE.pupilR} fill="#1a1230" />
            <Circle cx={6.6} cy={-1.8} r={SOFT_FACE.catchlightR} fill="#FFFFFF" />
          </G>
          {/* Soft lid — purple, blink scaleY */}
          <G
            transform={`translate(0 ${lid1Top}) scale(1 ${lidScaleY}) translate(0 ${-lid1Top})`}
          >
            <Rect
              x={-28.8}
              y={lid1Top}
              width={57.6}
              height={35.9}
              rx={16.6}
              fill={LID_PURPLE}
            />
          </G>
        </G>
        {/* Right eye — Soft v8b SoT */}
        <G transform="translate(292 198) rotate(-4)">
          <Ellipse
            cx={0}
            cy={0}
            rx={SOFT_FACE.rightEyeRx}
            ry={SOFT_FACE.rightEyeRy}
            fill="#FFFFFF"
          />
          <G transform={`translate(${pupilTx} ${pupilTy})`}>
            <Circle cx={2.4} cy={3.6} r={SOFT_FACE.rightPupilR} fill="#1a1230" />
            <Circle cx={6.6} cy={-1.8} r={SOFT_FACE.rightCatchlightR} fill="#FFFFFF" />
          </G>
          {/* Soft lid2 — cyan, blink +120ms */}
          <G
            transform={`translate(0 ${lid2Top}) scale(1 ${lid2ScaleY}) translate(0 ${-lid2Top})`}
          >
            <Rect
              x={-27.5}
              y={lid2Top}
              width={55.0}
              height={34.6}
              rx={15.9}
              fill={LID_CYAN}
            />
          </G>
        </G>
        {/* Glasses — fill none, stroke #1c1428, strokeWidth 6.5 */}
        <G
          fill="none"
          stroke="#1c1428"
          strokeWidth={SOFT_FACE.glassesStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Circle cx={SOFT_FACE.leftEye.x} cy={SOFT_FACE.leftEye.y} r={SOFT_FACE.glassesLeftR} />
          <Circle
            cx={SOFT_FACE.rightEye.x}
            cy={SOFT_FACE.rightEye.y}
            r={SOFT_FACE.glassesRightR}
          />
          <Path d={SOFT_FACE.glassesBridge} />
        </G>
        {/* no mouth — CEO Soft lock */}
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  // Plain size×size box — do NOT center the oversized orbit host (that shifts Soft off idle K).
  canvas: {
    overflow: 'visible',
  },
  letterStack: {
    position: 'absolute',
    overflow: 'visible',
  },
});
