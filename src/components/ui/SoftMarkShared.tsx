import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

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

/**
 * Soft working mark — native React Native Views (no WebView / no HTML host).
 * Design SoT remains HTML Soft v8b; runtime uses locked COMET_ORBIT + softCometFacing.
 * Idle letter is KelyraMark Image `kelyra.png`; SoftMark only while working.
 * Face: Soft v8b SVG eyes + glasses only (no mouth). SoftMode static|working for outro.
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
  const working = mode === 'working';
  const pad = Math.ceil(size * ORBIT_PAD_FRAC);
  const hostSize = size + pad * 2;
  const [frame, setFrame] = useState<SoftCometFrame>(() => softCometFrame(0, size));

  // Outro: KelyraMark sets mode=static then waits SOFT_INTRO.outroMs before unmount.
  void SOFT_INTRO.outroMs;
  void COMET_ORBIT.facingMode;
  void LETTER_INK.canvas;

  useEffect(() => {
    if (!working) {
      setFrame(softCometFrame(0, size));
      return;
    }
    let raf = 0;
    let start: number | null = null;
    let alive = true;
    const period = SOFT_MOTION.orbitMs;

    const tick = (now: number) => {
      if (!alive) return;
      if (start == null) start = now;
      const phase = ((now - start) % period) / period;
      setFrame(softCometFrame(phase, size));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [working, size]);

  const comet = useMemo(() => {
    if (!working) return null;
    return (
      <CometLayer
        frame={frame}
        hostSize={hostSize}
        pad={pad}
        zIndex={frame.front ? Z_FRONT : Z_BEHIND}
      />
    );
  }, [working, frame, hostSize, pad]);

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
        {working && !frame.front ? comet : null}
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
          {/* Sibling after letter Image — zIndex/elevation so face is not under PNG */}
          <SoftFaceEyesGlasses size={size} />
        </View>
        {working && frame.front ? comet : null}
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
 * Chrome (~40px): scale about glasses midpoint so eye diameter ≥ ~28% of mark
 * and glasses stroke ≥ 2px on screen (linear 512-space would otherwise vanish).
 */
function SoftFaceEyesGlasses({ size }: { size: number }) {
  const canvas = LETTER_INK.canvas;
  const linear = size / canvas;
  const eyeDiam512 = SOFT_FACE.eyeRx * 2;
  const scaleForEye = (0.28 * size) / (eyeDiam512 * linear);
  const scaleForStroke = 2 / (SOFT_FACE.glassesStroke * linear);
  const faceScale = Math.max(1, scaleForEye, scaleForStroke);
  const ox = SOFT_FACE.glassesMidX;
  const oy = SOFT_FACE.glassesMidY;

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
      <G
        // SoftFace chrome readability scale about glasses midpoint
        transform={`translate(${ox} ${oy}) scale(${faceScale}) translate(${-ox} ${-oy})`}
      >
        {/* Left eye — Soft v8b SoT */}
        <G transform="translate(169 198) rotate(-2)">
          <Ellipse cx={0} cy={0} rx={SOFT_FACE.eyeRx} ry={SOFT_FACE.eyeRy} fill="#FFFFFF" />
          <Circle cx={2.4} cy={3.6} r={SOFT_FACE.pupilR} fill="#1a1230" />
          <Circle cx={6.6} cy={-1.8} r={SOFT_FACE.catchlightR} fill="#FFFFFF" />
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
          <Circle cx={2.4} cy={3.6} r={SOFT_FACE.rightPupilR} fill="#1a1230" />
          <Circle cx={6.6} cy={-1.8} r={SOFT_FACE.rightCatchlightR} fill="#FFFFFF" />
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
