import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

import type {
  SplashPlaybackStatus,
  SplashVideoHandle,
  SplashVideoProps,
} from '@/components/ui/splashVideoTypes';

export type { SplashPlaybackStatus, SplashVideoHandle, SplashVideoProps } from '@/components/ui/splashVideoTypes';

/**
 * Native splash player — expo-av Video with cover resize.
 * Web uses SplashVideo.web.tsx (HTML5) to avoid expo-av clearing position:absolute.
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
  const videoRef = useRef<Video>(null);

  useImperativeHandle(
    ref,
    (): SplashVideoHandle => ({
      playAsync: async () => {
        await videoRef.current?.playAsync();
      },
      pauseAsync: async () => {
        await videoRef.current?.pauseAsync();
      },
      unloadAsync: async () => {
        await videoRef.current?.unloadAsync();
      },
      setIsMutedAsync: async (muted: boolean) => {
        await videoRef.current?.setIsMutedAsync(muted);
      },
      setVolumeAsync: async (next: number) => {
        await videoRef.current?.setVolumeAsync(next);
      },
    }),
    [],
  );

  const onStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!onPlaybackStatusUpdate) return;
      if (!status.isLoaded) {
        onPlaybackStatusUpdate({ isLoaded: false });
        return;
      }
      const next: SplashPlaybackStatus = {
        isLoaded: true,
        durationMillis: status.durationMillis,
        positionMillis: status.positionMillis,
        didJustFinish: status.didJustFinish,
      };
      onPlaybackStatusUpdate(next);
    },
    [onPlaybackStatusUpdate],
  );

  return (
    <Video
      ref={videoRef}
      source={source}
      style={style}
      resizeMode={ResizeMode.COVER}
      shouldPlay={shouldPlay}
      isLooping={isLooping}
      isMuted={isMuted}
      volume={volume}
      useNativeControls={false}
      onPlaybackStatusUpdate={onStatus}
    />
  );
});
