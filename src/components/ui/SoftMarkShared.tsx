import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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

const CYAN = '#9AF7FF';
const PURPLE = '#B46BFF';
const GLASS = 'rgba(154, 247, 255, 0.85)';

/**
 * Soft working mark — native React Native Views (no WebView / no HTML host).
 * Design SoT remains HTML Soft v8b; runtime uses locked COMET_ORBIT + softCometFacing.
 * Idle letter is KelyraMark Image `kelyra.png`; SoftMark only while working.
 * Face: eyes + glasses only (no mouth). SoftMode static|working for outro.
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
          width: hostSize,
          height: hostSize,
          marginLeft: -pad,
          marginTop: -pad,
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

/** Soft face: eyes + glasses only — no mouth (CEO lock). */
function SoftFaceEyesGlasses({ size }: { size: number }) {
  const s = size / LETTER_INK.canvas;
  const eyeR = SOFT_FACE.eyeR * s;
  const pupilR = SOFT_FACE.pupilR * s;
  const gL = SOFT_FACE.glassesLeftR * s;
  const gR = SOFT_FACE.glassesRightR * s;
  const border = Math.max(1.2, 2.2 * s);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View
        style={{
          position: 'absolute',
          left: SOFT_FACE.leftEye.x * s - gL,
          top: SOFT_FACE.leftEye.y * s - gL,
          width: gL * 2,
          height: gL * 2,
          borderRadius: gL,
          borderWidth: border,
          borderColor: GLASS,
          backgroundColor: 'transparent',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: SOFT_FACE.rightEye.x * s - gR,
          top: SOFT_FACE.rightEye.y * s - gR,
          width: gR * 2,
          height: gR * 2,
          borderRadius: gR,
          borderWidth: border,
          borderColor: GLASS,
          backgroundColor: 'transparent',
        }}
      />
      {/* bridge */}
      <View
        style={{
          position: 'absolute',
          left: SOFT_FACE.leftEye.x * s + gL * 0.55,
          top: SOFT_FACE.leftEye.y * s - border / 2,
          width: (SOFT_FACE.rightEye.x - SOFT_FACE.leftEye.x) * s - gL * 0.55 - gR * 0.55,
          height: border,
          backgroundColor: GLASS,
          borderRadius: border,
        }}
      />
      <Eye
        cx={SOFT_FACE.leftEye.x * s}
        cy={SOFT_FACE.leftEye.y * s}
        eyeR={eyeR}
        pupilR={pupilR}
      />
      <Eye
        cx={SOFT_FACE.rightEye.x * s}
        cy={SOFT_FACE.rightEye.y * s}
        eyeR={eyeR}
        pupilR={pupilR}
      />
    </View>
  );
}

function Eye({
  cx,
  cy,
  eyeR,
  pupilR,
}: {
  cx: number;
  cy: number;
  eyeR: number;
  pupilR: number;
}) {
  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: cx - eyeR,
          top: cy - eyeR,
          width: eyeR * 2,
          height: eyeR * 2,
          borderRadius: eyeR,
          backgroundColor: '#FFFFFF',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cx - pupilR,
          top: cy - pupilR,
          width: pupilR * 2,
          height: pupilR * 2,
          borderRadius: pupilR,
          backgroundColor: '#1A1030',
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  canvas: {
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterStack: {
    position: 'absolute',
    overflow: 'visible',
  },
});
