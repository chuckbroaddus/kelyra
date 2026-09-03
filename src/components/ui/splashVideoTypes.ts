import type { StyleProp, ViewStyle } from 'react-native';

/** Imperative API SplashLanding uses for mute / play / cleanup. */
export type SplashVideoHandle = {
  playAsync: () => Promise<void>;
  pauseAsync: () => Promise<void>;
  unloadAsync: () => Promise<void>;
  setIsMutedAsync: (muted: boolean) => Promise<void>;
  setVolumeAsync: (volume: number) => Promise<void>;
};

/** Minimal playback status — matches fields SplashLanding reads. */
export type SplashPlaybackStatus =
  | { isLoaded: false }
  | {
      isLoaded: true;
      durationMillis?: number;
      positionMillis?: number;
      didJustFinish?: boolean;
    };

export type SplashVideoProps = {
  /** Bundled require() module id (or web-resolved asset). */
  source: number | string | { uri?: string };
  style?: StyleProp<ViewStyle>;
  shouldPlay?: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
  volume?: number;
  onPlaybackStatusUpdate?: (status: SplashPlaybackStatus) => void;
};
