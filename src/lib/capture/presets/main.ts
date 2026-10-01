import type { CapturePreset } from './types';
import { MULTI_SHOT_BATCH_CAP } from '@/lib/media/multiShotBatch';

/** Default /capture surface — full Ask AI + intent confirm flow. */
export const mainCapturePreset: CapturePreset = {
  id: 'main',
  showClassStack: true,
  showIntentBox: true,
  accept: 'all',
  maxItems: MULTI_SHOT_BATCH_CAP,
};
