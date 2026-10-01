import { requireNativeModule } from 'expo';
import type { EventSubscription } from 'expo-modules-core';
import { Platform } from 'react-native';

export type VolumeShutterPressEvent = {
  source: 'primary' | 'secondary' | 'volume';
};

type VolumeShutterNativeModule = {
  isAvailable(): boolean;
  start(): Promise<boolean>;
  stop(): Promise<void>;
  addListener(
    eventName: 'onShutterPress',
    listener: (event: VolumeShutterPressEvent) => void,
  ): EventSubscription;
};

function loadNative(): VolumeShutterNativeModule | null {
  if (Platform.OS === 'web') return null;
  try {
    return requireNativeModule<VolumeShutterNativeModule>('VolumeShutter');
  } catch {
    // Expo Go / missing native binary
    return null;
  }
}

const native = loadNative();

/** True when this binary can intercept hardware shutter/volume capture events. */
export function volumeShutterAvailable(): boolean {
  if (!native) return false;
  try {
    return native.isAvailable();
  } catch {
    return false;
  }
}

/**
 * While active, hardware volume / camera-control presses fire `onPress` without
 * changing system volume (iOS 17.2+ AVCaptureEventInteraction). No-op in Expo Go.
 * Returns an unsubscribe that also stops native listening.
 */
export function startVolumeShutter(onPress: (event: VolumeShutterPressEvent) => void): () => void {
  if (!native || !volumeShutterAvailable()) {
    return () => {};
  }

  let sub: EventSubscription | null = null;
  let stopped = false;

  void (async () => {
    try {
      const ok = await native.start();
      if (!ok || stopped) {
        if (ok) await native.stop();
        return;
      }
      if (stopped) return;
      sub = native.addListener('onShutterPress', onPress);
    } catch {
      /* native missing or failed attach */
    }
  })();

  return () => {
    stopped = true;
    try {
      sub?.remove();
    } catch {
      /* ignore */
    }
    sub = null;
    void native.stop().catch(() => {});
  };
}
