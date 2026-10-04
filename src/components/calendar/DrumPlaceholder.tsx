/**
 * CAL-DRUM-PH: shared drum placeholder card (variant C) for PeriodPager — Calendar + Diary.
 * SoT: notes/company/prototypes/drum-placeholder-card/index.html (variant C).
 *
 * - useDrumPlaceholderDriver: UI-thread drum speed (periods/s) → mode
 *   (real · placeholder · focusing). No JS hop per frame; no idle frame loop.
 * - DrumFocusProvider: per-card focus progress k (center first, 40ms rings, 200ms).
 * - DrumFocusText: a plate label that hides into the placeholder and focuses back in.
 * - DrumBlob: pre-blurred blob image (no live blur) + LinearGradient shimmer band
 *   (transform only). Reduce Motion: no shimmer, plain cross-fade.
 *
 * iPhone cost: no BlurView / CSS filter. Blobs are two tiny static PNGs; the sweep
 * is a translateX on a gradient; the focus pass is opacity + scale only.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View, type TextProps } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  DRUM_PH_BLUR_OUT_MS,
  DRUM_PH_ENTER_SPEED,
  DRUM_PH_EXIT_SPEED,
  DRUM_PH_FOCUS_MS,
  DRUM_PH_FOCUS_TOTAL_MS,
  DRUM_PH_IDLE_MS,
  DRUM_PH_SHIMMER_MS,
  DRUM_PH_SPEED_TAU_MS,
  DRUM_PH_STAGGER_MAX,
  DRUM_PH_STAGGER_MS,
  DRUM_PH_TELEPORT,
  drumPhCardK,
  drumPhLayers,
  drumPhNextMode,
  drumPhShimmerX,
  drumPhSpeedStep,
} from '@/lib/calendar/drumPlaceholder';

/* Pre-rendered blur (variant C): body 46×30 r12 rgba(26,26,26,.18) blur 4px;
 * month band 30×6 r3 rgba(255,255,255,.45) blur 1.5px. Image box = shape + 3σ pad. */
const BLOB_BODY = require('../../../assets/images/drum/drum-blob-body.png');
const BLOB_BAND = require('../../../assets/images/drum/drum-blob-band.png');

export type DrumPlaceholderDriver = {
  /** 0 real · 1 placeholder · 2 focusing (UI thread). */
  mode: SharedValue<number>;
  /** 0→1 over 70ms when entering placeholder (real label blurs out). */
  blurOut: SharedValue<number>;
  /** ms since focus began (animates 0 → 320). */
  clock: SharedValue<number>;
  /** Drum position when focus began — center-first origin. */
  focusCenter: SharedValue<number>;
  /** Shimmer phase 0→1 every 1.1s while not real (also the idle watchdog tick). */
  tick: SharedValue<number>;
  reduceMotion: boolean;
};

/**
 * Drum speed → placeholder mode, all on the UI thread. Speed samples ride the
 * drum position reaction (fires only when the drum moves); while a placeholder is
 * up, the shimmer tick doubles as a watchdog so a finger that stops dead still
 * brings the cards into focus.
 */
export function useDrumPlaceholderDriver({
  anchorPos,
  drag,
  pitch,
  reduceMotion,
}: {
  anchorPos: SharedValue<number>;
  drag: SharedValue<number>;
  pitch: number;
  reduceMotion: boolean;
}): DrumPlaceholderDriver {
  const mode = useSharedValue(0);
  const blurOut = useSharedValue(0);
  const clock = useSharedValue(DRUM_PH_FOCUS_TOTAL_MS);
  const focusCenter = useSharedValue(0);
  const tick = useSharedValue(0);
  const lastPos = useSharedValue(Number.NaN);
  const lastAt = useSharedValue(0);
  const speed = useSharedValue(0);

  useAnimatedReaction(
    () => anchorPos.value - drag.value / (pitch > 0 ? pitch : 1),
    (pos) => {
      'worklet';
      const now = performance.now();
      const s = drumPhSpeedStep(
        lastPos.value,
        pos,
        now - lastAt.value,
        speed.value,
        DRUM_PH_SPEED_TAU_MS,
        DRUM_PH_TELEPORT,
      );
      lastPos.value = pos;
      lastAt.value = now;
      speed.value = s;
      const prev = mode.value;
      const next = drumPhNextMode(prev, s, DRUM_PH_ENTER_SPEED, DRUM_PH_EXIT_SPEED);
      if (next === prev) return;
      if (next === 1) {
        // Spinning fast: real labels blur out (70ms) into the placeholder.
        cancelAnimation(clock);
        mode.value = 1;
        if (prev === 2) {
          blurOut.value = 1;
        } else {
          blurOut.value = 0;
          blurOut.value = withTiming(1, { duration: DRUM_PH_BLUR_OUT_MS, easing: Easing.linear });
          tick.value = 0;
          tick.value = withRepeat(
            withTiming(1, { duration: DRUM_PH_SHIMMER_MS, easing: Easing.linear }),
            -1,
            false,
          );
        }
        return;
      }
      // next === 2: slowed under ~6/s — focus in, center first.
      mode.value = 2;
      focusCenter.value = pos;
      clock.value = 0;
      clock.value = withTiming(
        DRUM_PH_FOCUS_TOTAL_MS,
        { duration: DRUM_PH_FOCUS_TOTAL_MS, easing: Easing.linear },
        (finished) => {
          'worklet';
          if (finished && mode.value === 2) {
            mode.value = 0;
            cancelAnimation(tick);
          }
        },
      );
    },
    [pitch],
  );

  // Watchdog: placeholder up but the drum stopped moving (finger parked) → focus.
  useAnimatedReaction(
    () => tick.value,
    () => {
      'worklet';
      if (mode.value !== 1) return;
      if (performance.now() - lastAt.value < DRUM_PH_IDLE_MS) return;
      speed.value = 0;
      mode.value = 2;
      focusCenter.value = lastPos.value;
      clock.value = 0;
      clock.value = withTiming(
        DRUM_PH_FOCUS_TOTAL_MS,
        { duration: DRUM_PH_FOCUS_TOTAL_MS, easing: Easing.linear },
        (finished) => {
          'worklet';
          if (finished && mode.value === 2) {
            mode.value = 0;
            cancelAnimation(tick);
          }
        },
      );
    },
  );

  return useMemo(
    () => ({ mode, blurOut, clock, focusCenter, tick, reduceMotion }),
    [mode, blurOut, clock, focusCenter, tick, reduceMotion],
  );
}

type CardFocus = {
  /** 1 = real card, 0 = placeholder. */
  k: SharedValue<number>;
  tick: SharedValue<number>;
  reduceMotion: boolean;
};

const DrumFocusContext = createContext<CardFocus | null>(null);

/** Per-card focus progress for the drum card at absolute period `index`. */
export function DrumFocusProvider({
  driver,
  index,
  children,
}: {
  driver: DrumPlaceholderDriver;
  index: number;
  children: ReactNode;
}) {
  const { mode, blurOut, clock, focusCenter, tick, reduceMotion } = driver;
  const k = useDerivedValue(
    () =>
      drumPhCardK(
        mode.value,
        blurOut.value,
        clock.value,
        focusCenter.value,
        index,
        DRUM_PH_FOCUS_MS,
        DRUM_PH_STAGGER_MS,
        DRUM_PH_STAGGER_MAX,
      ),
    [index],
  );
  const value = useMemo(() => ({ k, tick, reduceMotion }), [k, tick, reduceMotion]);
  return <DrumFocusContext.Provider value={value}>{children}</DrumFocusContext.Provider>;
}

function FocusText({ focus, style, ...rest }: TextProps & { focus: CardFocus }) {
  const { k, reduceMotion } = focus;
  const anim = useAnimatedStyle(() => {
    const [opacity, scale] = drumPhLayers(k.value, reduceMotion);
    return { opacity, transform: [{ scale }] };
  }, [k, reduceMotion]);
  return <Reanimated.Text {...rest} style={[style, anim]} />;
}

/** Plate label: plain Text off the drum; hides/focuses with the card on the drum. */
export function DrumFocusText(props: TextProps) {
  const focus = useContext(DrumFocusContext);
  if (!focus) return <Text {...props} />;
  return <FocusText {...props} focus={focus} />;
}

type BlobVariant = 'body' | 'band' | 'year';

/** Variant C geometry. `w×h` = shape; image = shape + 3σ pad (pre-blurred). */
const BLOB = {
  body: { w: 46, h: 30, r: 12, imgW: 70, imgH: 54, src: 'body', peak: 0.72 },
  band: { w: 30, h: 6, r: 3, imgW: 40, imgH: 16, src: 'band', peak: 0.91 },
  // Year plate is all red: a wider white band blob (band image stretched).
  year: { w: 54, h: 14, r: 6, imgW: 72, imgH: 37, src: 'band', peak: 0.91 },
} as const;

/**
 * Light sweep: white band 0.88w wide over the blob. Body: white over the .18 gray
 * blob → .05 at the peak (mockup 18/5/18). Band: white over .45 → .95 (45/95/45).
 */
function Shimmer({ variant, tick }: { variant: BlobVariant; tick: SharedValue<number> }) {
  const g = BLOB[variant];
  const bandW = g.w * 0.88;
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: drumPhShimmerX(tick.value, g.w) }],
  }), [tick, g.w]);
  return (
    <View style={[styles.shimClip, { width: g.w, height: g.h, borderRadius: g.r }]}>
      <Reanimated.View style={[{ width: bandW, height: g.h }, anim]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', `rgba(255,255,255,${g.peak})`, 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Reanimated.View>
    </View>
  );
}

function Blob({ variant, focus }: { variant: BlobVariant; focus: CardFocus }) {
  const g = BLOB[variant];
  const { k, tick, reduceMotion } = focus;
  const anim = useAnimatedStyle(() => {
    const layers = drumPhLayers(k.value, reduceMotion);
    return { opacity: layers[2], transform: [{ scale: layers[3] }] };
  }, [k, reduceMotion]);
  return (
    <Reanimated.View pointerEvents="none" style={[styles.blobFill, anim]} accessibilityElementsHidden>
      <Image
        source={g.src === 'body' ? BLOB_BODY : BLOB_BAND}
        style={{ width: g.imgW, height: g.imgH, position: 'absolute' }}
        resizeMode="stretch"
        fadeDuration={0}
      />
      {/* RM: no shimmer — the placeholder just fades. */}
      {reduceMotion ? null : <Shimmer variant={variant} tick={tick} />}
    </Reanimated.View>
  );
}

/** Placeholder blob slot (renders nothing off the drum). Place inside the band/body view. */
export function DrumBlob({ variant }: { variant: BlobVariant }) {
  const focus = useContext(DrumFocusContext);
  if (!focus) return null;
  return <Blob variant={variant} focus={focus} />;
}

const styles = StyleSheet.create({
  blobFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimClip: {
    overflow: 'hidden',
  },
});
