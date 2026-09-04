import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { forwardRef, useEffect, useImperativeHandle } from 'react';

import type {
  SplashPlaybackStatus,
  SplashVideoHandle,
  SplashVideoProps,
} from '@/components/ui/splashVideoTypes';

export type { SplashPlaybackStatus, SplashVideoHandle, SplashVideoProps } from '@/components/ui/splashVideoTypes';

function toVideoSource(source: SplashVideoProps['source']): VideoSource {
  if (typeof source === 'number' || typeof source === 'string') return source;
  if (source && typeof source === 'object' && typeof source.uri === 'string') {
    return { uri: source.uri };
  }
  return null;
}

/**
 * Native splash player — expo-video VideoView with cover contentFit.
 * Web uses SplashVideo.web.tsx (HTML5) for absolute fill + object-fit cover.
 */
export const SplashVideo = forwardRef<SplashVideoHandle, SplashVideoProps>(function SplashVideo(
  {
    source,
    style,
    shouldPlay = false,
    isLooping = false,
    isMuted = false,
    volume = 1,
    onPlaybackStatusUpdate,
  },
  ref,
) {
  const videoSource = toVideoSource(source);
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = isLooping;
    p.muted = isMuted;
    p.volume = volume;
    // Drive SplashLanding crossfade ratio via position updates.
    p.timeUpdateEventInterval = 0.05;
    if (shouldPlay) p.play();
  });

  useImperativeHandle(
    ref,
    (): SplashVideoHandle => ({
      playAsync: async () => {
        player.play();
      },
      pauseAsync: async () => {
        player.pause();
      },
      unloadAsync: async () => {
        player.pause();
        player.replace(null);
      },
      setIsMutedAsync: async (muted: boolean) => {
        player.muted = muted;
      },
      setVolumeAsync: async (next: number) => {
        player.volume = next;
      },
    }),
    [player],
  );

  useEffect(() => {
    player.loop = isLooping;
  }, [player, isLooping]);

  useEffect(() => {
    player.muted = isMuted;
  }, [player, isMuted]);

  useEffect(() => {
    player.volume = volume;
  }, [player, volume]);

  useEffect(() => {
    if (shouldPlay) player.play();
    else player.pause();
  }, [player, shouldPlay]);

  const emitStatus = (partial: Omit<Extract<SplashPlaybackStatus, { isLoaded: true }>, 'isLoaded'> & {
    isLoaded?: true;
  }) => {
    if (!onPlaybackStatusUpdate) return;
    onPlaybackStatusUpdate({
      isLoaded: true,
      durationMillis: (partial.durationMillis ?? player.duration * 1000) || undefined,
      positionMillis: partial.positionMillis ?? player.currentTime * 1000,
      didJustFinish: partial.didJustFinish,
    });
  };

  useEventListener(player, 'playToEnd', () => {
    emitStatus({
      durationMillis: player.duration * 1000,
      positionMillis: player.currentTime * 1000,
      didJustFinish: true,
    });
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    emitStatus({
      durationMillis: player.duration * 1000,
      positionMillis: currentTime * 1000,
    });
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (!onPlaybackStatusUpdate) return;
    if (status === 'readyToPlay') {
      emitStatus({
        durationMillis: player.duration * 1000,
        positionMillis: player.currentTime * 1000,
      });
      return;
    }
    if (status === 'error') {
      onPlaybackStatusUpdate({ isLoaded: false });
    }
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={false}
    />
  );
});
