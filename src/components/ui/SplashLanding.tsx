import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SplashSignInButton } from '@/components/ui/SplashSignInButton';
import { SplashVideo, type SplashPlaybackStatus, type SplashVideoHandle } from '@/components/ui/SplashVideo';
import { splashAspectForSize, splashSources, splashStillSources } from '@/components/ui/splashBrand';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { signInWithPassword } from '@/lib/auth/api';
import { isNativePhone, lockPreAuthPortrait, unlockAppOrientation } from '@/lib/theme/screenOrientation';

export {
  splashAspectForSize,
  splashSources,
  splashStillSources,
  type SplashAspectKey,
} from '@/components/ui/splashBrand';
export { splashCtaGradient, splashCtaLabel } from '@/components/ui/SplashSignInButton';

export const splashOfficeFooter =
  "Account creation is performed by the school office. Please contact your school's administration for access.";

/**
 * Crossfade the opaque Video off well before the clip’s dead end (black frames).
 * Logo hold is the CEO JPG underneath — never the last decoded video frame.
 */
export const SPLASH_CROSSFADE_RATIO = 0.72;
/** Video opacity 1→0; still JPG remains mounted underneath. */
export const VIDEO_FADE_MS = 300;
const CTA_FADE_MS = 320;
/** Last-resort if crossfade never triggers (~2.55s clip + slack). */
const SPLASH_SAFETY_MS = 4000;

type Props = {
  error?: string | null;
  /** Deep-link /sign-in: skip animation and show credential fields immediately. */
  initialRevealForm?: boolean;
};

/** Survives remounts within the signed-out session so rotate / return never replays. */
let splashSessionCompleted = false;

async function enableSplashAudioMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

function fadeIn(value: Animated.Value) {
  Animated.timing(value, {
    toValue: 1,
    duration: CTA_FADE_MS,
    useNativeDriver: true,
  }).start();
}

export function SplashLanding({ error, initialRevealForm = false }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refresh } = useAuth();
  const { width, height } = useWindowDimensions();
  // Native phones stay portrait-locked pre-auth — always 9×16 splash assets.
  const phoneLocked = isNativePhone(width, height);
  const sourceKey = phoneLocked ? 'portrait' : splashAspectForSize(width, height);
  const videoSource = splashSources[sourceKey];
  const stillSource = splashStillSources[sourceKey];
  const videoRef = useRef<SplashVideoHandle | null>(null);
  const busyRef = useRef(false);
  const finishingRef = useRef(false);
  const fadingRef = useRef(false);
  const soundHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCompleted = initialRevealForm || splashSessionCompleted;
  const [hasCompletedSplash, setHasCompletedSplash] = useState(() => startCompleted);
  /** Video mounts only while animating / crossfading — never after session complete. */
  const [showVideo, setShowVideo] = useState(() => !startCompleted);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showForm, setShowForm] = useState(() => initialRevealForm);
  // Web: always start muted (autoplay policy). Native: attempt unmuted first.
  const [awaitingGesture, setAwaitingGesture] = useState(
    () => Platform.OS === 'web' && !startCompleted,
  );
  const [soundOnHint, setSoundOnHint] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const videoOpacity = useRef(new Animated.Value(startCompleted ? 0 : 1)).current;
  const ctaOpacity = useRef(new Animated.Value(startCompleted ? 1 : 0)).current;
  const formOpacity = useRef(new Animated.Value(initialRevealForm ? 1 : 0)).current;

  useEffect(() => {
    void lockPreAuthPortrait(width, height);
  }, [width, height]);

  useEffect(() => {
    if (!initialRevealForm) return;
    splashSessionCompleted = true;
  }, [initialRevealForm]);

  useEffect(() => {
    return () => {
      if (soundHintTimer.current) clearTimeout(soundHintTimer.current);
    };
  }, []);

  const markCompleted = useCallback(() => {
    splashSessionCompleted = true;
    setHasCompletedSplash(true);
    setAwaitingGesture(false);
    setSoundOnHint(false);
    if (soundHintTimer.current) {
      clearTimeout(soundHintTimer.current);
      soundHintTimer.current = null;
    }
  }, []);

  const revealCta = useCallback(() => {
    fadeIn(ctaOpacity);
  }, [ctaOpacity]);

  const revealForm = useCallback(() => {
    setShowForm(true);
    fadeIn(formOpacity);
  }, [formOpacity]);

  const finishAfterVideoGone = useCallback(() => {
    setShowVideo(false);
    if (finishingRef.current || splashSessionCompleted) {
      // Skip may have already marked complete; still ensure video is gone.
      markCompleted();
      return;
    }
    finishingRef.current = true;
    markCompleted();
    revealCta();
  }, [markCompleted, revealCta]);

  /**
   * Fade opaque Video off onto the always-mounted CEO still. Logo hold never depends on
   * didJustFinish or the last decoded video frame.
   */
  const beginVideoCrossfade = useCallback(() => {
    if (fadingRef.current || hasCompletedSplash || splashSessionCompleted) return;
    if (!showVideo) {
      finishAfterVideoGone();
      return;
    }
    fadingRef.current = true;
    setIsFadingOut(true);
    Animated.timing(videoOpacity, {
      toValue: 0,
      duration: VIDEO_FADE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished && finishingRef.current) {
        // Skip interrupted the fade — skip path already unmounted.
        return;
      }
      finishAfterVideoGone();
    });
  }, [finishAfterVideoGone, hasCompletedSplash, showVideo, videoOpacity]);

  /** Natural end: crossfade off video; CTA after fade. */
  const completeNatural = useCallback(() => {
    beginVideoCrossfade();
  }, [beginVideoCrossfade]);

  /** Skip: opacity 0 + unmount video immediately — no pause/unload while covering. */
  const skipSplash = useCallback(() => {
    if (finishingRef.current || hasCompletedSplash || splashSessionCompleted) return;
    finishingRef.current = true;
    fadingRef.current = true;
    setIsFadingOut(true);
    videoOpacity.stopAnimation();
    videoOpacity.setValue(0);
    setShowVideo(false);
    markCompleted();
    revealCta();
    revealForm();
  }, [hasCompletedSplash, markCompleted, revealCta, revealForm, videoOpacity]);

  const tryPlayUnmuted = useCallback(async (video: SplashVideoHandle | null) => {
    if (!video || splashSessionCompleted) return false;
    try {
      // Unmute + volume + play in one gesture turn — do not await mute/volume first
      // (Safari drops the user-activation token across intervening awaits).
      void video.setIsMutedAsync(false);
      void video.setVolumeAsync(1);
      await video.playAsync();
      setAwaitingGesture(false);
      return true;
    } catch {
      setAwaitingGesture(true);
      return false;
    }
  }, []);

  // Play only while the session has not finished splash. After completion, orientation
  // only swaps still images — never remount a Video with shouldPlay.
  useFocusEffect(
    useCallback(() => {
      if (hasCompletedSplash || splashSessionCompleted) {
        if (!hasCompletedSplash) setHasCompletedSplash(true);
        setShowVideo(false);
        return;
      }

      let cancelled = false;
      let ownedVideo: SplashVideoHandle | null = null;
      const safetyTimer = setTimeout(() => {
        if (cancelled || splashSessionCompleted) return;
        completeNatural();
      }, SPLASH_SAFETY_MS);

      void (async () => {
        try {
          await enableSplashAudioMode();
        } catch {
          // Still attempt playback if audio mode setup fails.
        }
        if (cancelled || splashSessionCompleted) return;
        ownedVideo = videoRef.current;
        // Web: always muted autoplay + tap-for-sound (repeatable on every full reload).
        if (Platform.OS === 'web') {
          try {
            setAwaitingGesture(true);
            await ownedVideo?.setIsMutedAsync(true);
            await ownedVideo?.playAsync();
          } catch {
            // Still path after finish; gesture unlock below while playing.
          }
          return;
        }
        // Native: attempt unmuted (playsInSilentModeIOS); muted fallback if blocked.
        const started = await tryPlayUnmuted(ownedVideo);
        if (!started && !cancelled && !splashSessionCompleted) {
          try {
            setAwaitingGesture(true);
            await ownedVideo?.setIsMutedAsync(true);
            await ownedVideo?.playAsync();
          } catch {
            // Gesture unlock below while playing.
          }
        }
      })();

      return () => {
        cancelled = true;
        clearTimeout(safetyTimer);
        if (!ownedVideo) return;
        void ownedVideo.pauseAsync().catch(() => undefined);
        void ownedVideo.unloadAsync().catch(() => undefined);
      };
    }, [completeNatural, hasCompletedSplash, sourceKey, tryPlayUnmuted]),
  );

  const onPlaybackStatusUpdate = useCallback(
    (status: SplashPlaybackStatus) => {
      if (!status.isLoaded) return;
      if (fadingRef.current || finishingRef.current || splashSessionCompleted) return;

      const duration = status.durationMillis ?? 0;
      const position = status.positionMillis ?? 0;
      // Crossfade well before dead end — do not wait for didJustFinish for the logo hold.
      const pastCrossfade =
        duration > 0 &&
        (position >= duration * SPLASH_CROSSFADE_RATIO ||
          position / duration >= SPLASH_CROSSFADE_RATIO);

      if (pastCrossfade || status.didJustFinish) {
        beginVideoCrossfade();
      }
    },
    [beginVideoCrossfade],
  );

  const flashSoundOnHint = useCallback(() => {
    setSoundOnHint(true);
    if (soundHintTimer.current) clearTimeout(soundHintTimer.current);
    soundHintTimer.current = setTimeout(() => {
      setSoundOnHint(false);
      soundHintTimer.current = null;
    }, 1200);
  }, []);

  const unlockAudioIfNeeded = useCallback(async () => {
    if (!awaitingGesture || hasCompletedSplash || splashSessionCompleted) return;
    // Unmute+play only — no prior awaits that would drop the web user-gesture token.
    const unlocked = await tryPlayUnmuted(videoRef.current);
    if (unlocked) flashSoundOnHint();
  }, [awaitingGesture, flashSoundOnHint, hasCompletedSplash, tryPlayUnmuted]);

  const runSignIn = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await signInWithPassword(email, password);
      await unlockAppOrientation();
      await refresh();
      router.replace('/');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [email, password, refresh, router]);

  const handleCtaPress = useCallback(() => {
    if (!showForm) {
      revealForm();
      return;
    }
    void runSignIn();
  }, [revealForm, runSignIn, showForm]);

  const onVideoPress = useCallback(() => {
    if (showVideo && !hasCompletedSplash && !splashSessionCompleted) {
      // Web autoplay policy: first body tap unmutes inline (gesture stack); Skip stays distinct.
      if (awaitingGesture) {
        void unlockAudioIfNeeded();
        return;
      }
      skipSplash();
      return;
    }
    void unlockAudioIfNeeded();
  }, [awaitingGesture, hasCompletedSplash, showVideo, skipSplash, unlockAudioIfNeeded]);

  const statusError = message ?? error ?? null;
  const bottomPad = Math.max(insets.bottom, 16) + 12;
  const skipTop = Math.max(insets.top, 12) + 4;

  return (
    <View style={styles.root} accessibilityLabel="Kelyra">
      {/* CEO JPG still — ALWAYS mounted under video; absoluteFill cover (not a stale window box). */}
      <Image
        source={stillSource}
        accessibilityLabel={hasCompletedSplash ? 'Kelyra' : undefined}
        accessible={hasCompletedSplash}
        resizeMode="cover"
        style={styles.still}
      />
      {showVideo ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={awaitingGesture ? 'Tap for sound' : 'Tap to skip splash'}
          onPress={onVideoPress}
          style={styles.videoHit}
        >
          <Animated.View
            pointerEvents={isFadingOut ? 'none' : 'auto'}
            style={[styles.videoLayer, { opacity: videoOpacity }]}
          >
            <SplashVideo
              key={sourceKey}
              ref={videoRef}
              source={videoSource}
              style={styles.video}
              shouldPlay
              isLooping={false}
              // Mute prop tracks awaitingGesture so web muted-autoplay survives re-render.
              isMuted={awaitingGesture}
              volume={1}
              onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            />
          </Animated.View>
        </Pressable>
      ) : null}
      {showVideo && !hasCompletedSplash ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip splash"
          onPress={skipSplash}
          hitSlop={12}
          style={[styles.skipButton, { top: skipTop }]}
        >
          <Text style={styles.skipLabel}>Skip</Text>
        </Pressable>
      ) : null}
      {awaitingGesture && showVideo && !hasCompletedSplash ? (
        <View pointerEvents="none" style={[styles.soundHintWrap, { top: skipTop }]}>
          <Text style={styles.soundHint}>Tap for sound</Text>
        </View>
      ) : null}
      {soundOnHint && showVideo && !hasCompletedSplash ? (
        <View pointerEvents="none" style={[styles.soundHintWrap, { top: skipTop }]}>
          <Text style={styles.soundHint}>Sound on</Text>
        </View>
      ) : null}
      {hasCompletedSplash ? (
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <View
            pointerEvents="box-none"
            style={[
              styles.footer,
              {
                paddingBottom: bottomPad,
                // Fixed top pad so CTA y-position matches before/after form reveal.
                paddingTop: 20,
              },
            ]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.55)']}
              locations={[0, 1]}
              style={styles.scrim}
            />
            {statusError ? (
              <Text style={styles.error}>{statusError}</Text>
            ) : null}
            {/* Always layout fields so Sign in CTA does not jump when they fade in. */}
            <Animated.View
              pointerEvents={showForm ? 'auto' : 'none'}
              style={[styles.formBlock, { opacity: formOpacity }]}
              accessibilityElementsHidden={!showForm}
              importantForAccessibility={showForm ? 'yes' : 'no-hide-descendants'}
            >
              <TextField
                autoCapitalize="none"
                autoComplete="username"
                placeholder="Email or @username"
                value={email}
                onChangeText={setEmail}
                editable={showForm}
                returnKeyType="next"
                enterKeyHint="next"
                blurOnSubmit={false}
                placeholderTextColor="rgba(245, 251, 255, 0.55)"
                style={styles.fieldOnSplash}
              />
              <View style={styles.gap} />
              <TextField
                placeholder="Password"
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                editable={showForm}
                returnKeyType="go"
                enterKeyHint="go"
                blurOnSubmit
                onSubmitEditing={() => void runSignIn()}
                onKeyPress={(event) => {
                  if (event.nativeEvent.key === 'Enter') void runSignIn();
                }}
                placeholderTextColor="rgba(245, 251, 255, 0.55)"
                style={styles.fieldOnSplash}
              />
              <View style={styles.gap} />
            </Animated.View>
            <Animated.View style={[styles.ctaWrap, { opacity: ctaOpacity }]}>
              <SplashSignInButton
                label={showForm && busy ? 'Signing in…' : 'Sign in'}
                disabled={showForm && busy}
                onPress={handleCtaPress}
              />
            </Animated.View>
            {/* Always layout office footer so flex-end stack does not shift CTA on reveal. */}
            <Animated.View
              pointerEvents={showForm ? 'auto' : 'none'}
              style={[styles.hintWrap, { opacity: formOpacity }]}
              accessibilityElementsHidden={!showForm}
              importantForAccessibility={showForm ? 'yes' : 'no-hide-descendants'}
            >
              <Text style={styles.hint}>{splashOfficeFooter}</Text>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000000',
    // Fill the browser content area so absoluteFill media covers the viewport on web.
    ...Platform.select({
      web: {
        width: '100%',
        height: '100%',
        // RN web accepts vh; cast keeps StyleSheet.create ViewStyle-compatible.
        minHeight: '100vh' as unknown as number,
      },
      default: {},
    }),
  },
  still: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  videoHit: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  skipButton: {
    position: 'absolute',
    right: 16,
    zIndex: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipLabel: {
    ...type.meta,
    color: 'rgba(245, 251, 255, 0.85)',
    fontWeight: '600',
  },
  soundHintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 4,
    alignItems: 'center',
  },
  soundHint: {
    ...type.meta,
    color: 'rgba(245, 251, 255, 0.9)',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    justifyContent: 'flex-end',
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  /** Soft bottom band only — must not paint opaque black over the center logo. */
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  formBlock: {
    alignSelf: 'center',
    maxWidth: 360,
    width: '100%',
  },
  ctaWrap: {
    alignSelf: 'center',
    maxWidth: 360,
    width: '100%',
    alignItems: 'center',
  },
  hintWrap: {
    alignSelf: 'center',
    maxWidth: 360,
    width: '100%',
  },
  fieldOnSplash: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(120, 200, 255, 0.35)',
    color: '#F5FBFF',
  },
  gap: {
    height: 12,
  },
  hint: {
    ...type.meta,
    marginTop: 16,
    textAlign: 'center',
    color: 'rgba(245, 251, 255, 0.65)',
  },
  error: {
    ...type.body,
    alignSelf: 'center',
    maxWidth: 360,
    width: '100%',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
    color: '#FFF8F3',
    backgroundColor: 'rgba(181, 58, 50, 0.88)',
  },
});
