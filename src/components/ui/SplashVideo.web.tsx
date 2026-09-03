import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  createElement,
} from 'react';
import { Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import type {
  SplashPlaybackStatus,
  SplashVideoHandle,
  SplashVideoProps,
} from '@/components/ui/splashVideoTypes';

export type { SplashPlaybackStatus, SplashVideoHandle, SplashVideoProps } from '@/components/ui/splashVideoTypes';

function resolveUri(source: unknown): string | undefined {
  if (typeof source === 'string' && source.length > 0) return source;
  if (source && typeof source === 'object') {
    const rec = source as { uri?: string; default?: unknown };
    if (typeof rec.uri === 'string' && rec.uri.length > 0) return rec.uri;
    if (rec.default != null) return resolveUri(rec.default);
  }
  if (typeof source === 'number') {
    const resolved = Image.resolveAssetSource(source);
    if (resolved && typeof resolved.uri === 'string' && resolved.uri.length > 0) {
      return resolved.uri;
    }
  }
  return undefined;
}

function flattenStyle(style: StyleProp<ViewStyle> | undefined): Record<string, unknown> {
  const flat = StyleSheet.flatten(style) ?? {};
  return { ...(flat as Record<string, unknown>) };
}

/**
 * Web splash player — real HTML5 <video> with explicit absolute fill + object-fit:cover.
 * Does not use expo-av web (its customStyle clears absolute positioning and breaks cover).
 * pointer-events:none so parent Pressable receives taps (video would otherwise steal clicks).
 */
export const SplashVideo = forwardRef<SplashVideoHandle, SplashVideoProps>(function SplashVideo(
  {
    source,
    style,
    shouldPlay = false,
    isLooping = false,
    // Web autoplay policy: default muted until parent unlocks via user gesture.
    isMuted = true,
    volume = 1,
    onPlaybackStatusUpdate,
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const statusRef = useRef(onPlaybackStatusUpdate);
  statusRef.current = onPlaybackStatusUpdate;

  const uri = resolveUri(source);

  useImperativeHandle(
    ref,
    (): SplashVideoHandle => ({
      playAsync: async () => {
        const el = videoRef.current;
        if (!el) return;
        // Surface play() rejection to callers (gesture unlock needs the failure).
        await el.play();
      },
      pauseAsync: async () => {
        videoRef.current?.pause();
      },
      unloadAsync: async () => {
        const el = videoRef.current;
        if (!el) return;
        el.pause();
        el.removeAttribute('src');
        el.load();
      },
      setIsMutedAsync: async (muted: boolean) => {
        const el = videoRef.current;
        if (!el) return;
        // Assign immediately so unmute stays in the same user-gesture turn as play().
        el.muted = muted;
      },
      setVolumeAsync: async (next: number) => {
        const el = videoRef.current;
        if (!el) return;
        el.volume = Math.max(0, Math.min(1, next));
      },
    }),
    [],
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = isMuted;
    el.volume = Math.max(0, Math.min(1, volume));
    el.loop = isLooping;
  }, [isLooping, isMuted, volume]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !shouldPlay) return;
    void el.play().catch(() => undefined);
  }, [shouldPlay, uri]);

  const emitStatus = (partial: {
    didJustFinish?: boolean;
  }) => {
    const el = videoRef.current;
    if (!el || !statusRef.current) return;
    const duration = Number.isFinite(el.duration) ? el.duration * 1000 : 0;
    const position = Number.isFinite(el.currentTime) ? el.currentTime * 1000 : 0;
    const next: SplashPlaybackStatus = {
      isLoaded: true,
      durationMillis: duration,
      positionMillis: position,
      didJustFinish: partial.didJustFinish ?? false,
    };
    statusRef.current(next);
  };

  // Full-bleed cover: keep absolute positioning (expo-av web clears it — layout bug).
  // pointer-events none: clicks pass through to SplashLanding Pressable (unmute / skip).
  const fromCaller = flattenStyle(style);
  delete fromCaller.position;
  delete fromCaller.objectFit;
  delete fromCaller.objectPosition;
  delete fromCaller.pointerEvents;
  const cssStyle: Record<string, unknown> = {
    ...fromCaller,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    pointerEvents: 'none',
    // DOM CSS alias — some RN-web paths only forward kebab-case.
    'pointer-events': 'none',
  };

  return createElement('video', {
    ref: (node: HTMLVideoElement | null) => {
      videoRef.current = node;
    },
    src: uri,
    muted: isMuted,
    loop: isLooping,
    autoPlay: shouldPlay,
    playsInline: true,
    controls: false,
    style: cssStyle,
    onTimeUpdate: () => {
      emitStatus({ didJustFinish: false });
    },
    onEnded: () => {
      emitStatus({ didJustFinish: true });
    },
    onLoadedMetadata: () => {
      emitStatus({ didJustFinish: false });
    },
  });
});
