import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';

/**
 * Native handset only (not web / not tablet).
 * Uses shortest side so a phone already in landscape still counts as a phone
 * (unlike layout.isPhone, which keys off current width alone).
 */
export function isNativePhone(width: number, height: number): boolean {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'ios' && Platform.isPad) return false;
  return Math.min(width, height) < 720;
}

/** Portrait lock for signed-out splash/login on native phones. No-op on web/tablet. */
export async function lockPreAuthPortrait(width: number, height: number): Promise<void> {
  if (!isNativePhone(width, height)) return;
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch {
    // Simulator / unsupported policy — leave OS default.
  }
}

/** Restore app.json default orientation after sign-in. No-op on web. */
export async function unlockAppOrientation(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await ScreenOrientation.unlockAsync();
  } catch {
    // ignore
  }
}
