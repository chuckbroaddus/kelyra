import splashLandscape from '../../../assets/brand/splash/kelyra_splash_16x9.mp4';
import splashPortrait from '../../../assets/brand/splash/kelyra_splash_9x16.mp4';
import splashStillLandscape from '../../../assets/brand/splash/kelyra_splash_still_16x9.jpg';
import splashStillPortrait from '../../../assets/brand/splash/kelyra_splash_still_9x16.jpg';

/** Bundled splash video sources — portrait (9×16) and landscape (16×9). */
export const splashSources = {
  portrait: splashPortrait,
  landscape: splashLandscape,
} as const;

/** CEO hold stills (JPG) — full neon wordmark under the MP4; not ffmpeg peak extracts. */
export const splashStillSources = {
  portrait: splashStillPortrait,
  landscape: splashStillLandscape,
} as const;

export type SplashAspectKey = keyof typeof splashSources;

/** Pick portrait vs landscape splash from window size (height > width → portrait). */
export function splashAspectForSize(width: number, height: number): SplashAspectKey {
  return height > width ? 'portrait' : 'landscape';
}
